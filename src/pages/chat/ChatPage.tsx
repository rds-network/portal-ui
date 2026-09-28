import { Badge, Button, Flex, Select, Text, Textarea, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconCamera, IconClipboard, IconMessages, IconMoodSmile, IconSend } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import {
    ChatApiService,
    ChatMemberDto,
    ChatMessageDto,
    ChatRoomDto,
} from "src/shared/api/ChatApiService"
import { FilesApiService } from "src/shared/api/FilesApiService"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./ChatPage.module.scss"
import { KOLOBOK_SMILES, kolobokAssetUrl, parseChatBody } from "./kolobok"

const POLL_MS = 4000
const MEMBERS_POLL_MS = 15000
const PRESENCE_MS = 30000
const SOUND_KEY = "portal.chat.sound.v1"
const SOUND_URL = "/resources/sounds/aska.mp3"

const formatTime = (value: string) => dayjs(value).format("DD.MM HH:mm")

const roomLabel = (room: ChatRoomDto, locale: string) => {
    if (room.type === "GENERAL") return room.title
    const programName = getLocalizedName(
        {
            nameRu: room.programNameRu || undefined,
            nameEn: room.programNameEn || undefined,
            nameSr: room.programNameSr || undefined,
        },
        locale
    )
    return programName ? `${room.title}` : room.title
}

const readSoundEnabled = () => {
    try {
        const raw = localStorage.getItem(SOUND_KEY)
        if (raw == null) return true
        return raw !== "0"
    } catch {
        return true
    }
}

const writeSoundEnabled = (on: boolean) => {
    try {
        localStorage.setItem(SOUND_KEY, on ? "1" : "0")
    } catch {
        /* ignore */
    }
}

const renderBody = (body: string) => {
    if (!body) return null
    return parseChatBody(body).map((part, i) => {
        if (part.type === "smile") {
            return (
                <img
                    key={`s-${i}-${part.code}`}
                    className={classes.smile}
                    src={part.src}
                    alt={part.alt}
                    title={part.code}
                />
            )
        }
        if (part.type === "mention") {
            return (
                <span key={`m-${i}`} className={classes.mention}>
                    {part.value}
                </span>
            )
        }
        return <React.Fragment key={`t-${i}`}>{part.value}</React.Fragment>
    })
}

const activeMention = (draft: string, caret: number) => {
    const before = draft.slice(0, caret)
    const at = before.lastIndexOf("@")
    if (at < 0) return null
    if (at > 0 && !/\s/.test(before[at - 1])) return null
    const query = before.slice(at + 1)
    if (query.includes("\n")) return null
    if (query.length > 48) return null
    return { start: at, query }
}

export const ChatPage: React.FC = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [draft, setDraft] = useState("")
    const [membersOpen, setMembersOpen] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [createProgram, setCreateProgram] = useState<string | null>(null)
    const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null)
    const [uploading, setUploading] = useState(false)
    const [soundOn, setSoundOn] = useState(readSoundEnabled)
    const [caret, setCaret] = useState(0)
    const [smilesOpen, setSmilesOpen] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const stickBottom = useRef(true)
    const lastSoundId = useRef<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const soundUnlocked = useRef(false)
    const markedReadFor = useRef<string | null>(null)

    setDocumentTitleByLocale("pages.chat.title")

    const { data: roomsData } = useQuery({
        queryKey: ["chat-rooms"],
        queryFn: () => ChatApiService.listRooms(),
    })

    const rooms = roomsData?.rooms ?? []
    const canSeeAll = !!roomsData?.canSeeAll
    const canCreate = !!roomsData?.canCreateProgramRoom

    const selected = useMemo(
        () => rooms.find((r) => r.id === selectedId) ?? rooms[0] ?? null,
        [rooms, selectedId]
    )

    useEffect(() => {
        if (!selectedId && rooms.length > 0) {
            const general = rooms.find((r) => r.type === "GENERAL")
            setSelectedId(general?.id ?? rooms[0].id)
        }
    }, [rooms, selectedId])

    const roomId = selected?.id ?? null

    const { data: messages = [], isLoading: messagesLoading } = useQuery({
        queryKey: ["chat-messages", roomId],
        queryFn: () => ChatApiService.listMessages(roomId!),
        enabled: !!roomId,
        refetchInterval: roomId ? POLL_MS : false,
    })

    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ["chat-members", roomId],
        queryFn: () => ChatApiService.listMembers(roomId!),
        enabled: !!roomId && membersOpen,
        refetchInterval: roomId && membersOpen ? MEMBERS_POLL_MS : false,
    })

    const { data: programs = [] } = useQuery({
        queryKey: ["programs"],
        queryFn: () => ProgramsApiService.getPrograms().then((r) => r.data),
        enabled: canCreate && createOpen,
    })

    const existingProgramCodes = useMemo(
        () => new Set(rooms.filter((r) => r.type === "PROGRAM").map((r) => (r.programCode || "").toUpperCase())),
        [rooms]
    )

    const programOptions = useMemo(
        () =>
            (programs || [])
                .filter((p) => !existingProgramCodes.has((p.code || "").toUpperCase()))
                .map((p) => ({
                    value: p.code,
                    label: getLocalizedName(p, intl.locale) || p.code,
                })),
        [programs, existingProgramCodes, intl.locale]
    )

    const onlineCount = useMemo(() => members.filter((m) => m.online).length, [members])

    const mentionState = useMemo(() => activeMention(draft, caret), [draft, caret])
    const mentionMatches = useMemo(() => {
        if (!mentionState) return []
        const q = mentionState.query.trim().toLowerCase()
        return members
            .filter((m) => !q || m.fullName.toLowerCase().includes(q))
            .slice(0, 8)
    }, [mentionState, members])

    useEffect(() => {
        if (!stickBottom.current) return
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages, roomId])

    useEffect(() => {
        lastSoundId.current = null
        markedReadFor.current = null
        setSmilesOpen(false)
    }, [roomId])

    useEffect(() => {
        if (!roomId || messagesLoading) return
        if (markedReadFor.current === roomId) return
        markedReadFor.current = roomId
        ChatApiService.markRead(roomId)
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["chat-unread"] })
            })
            .catch(() => {
                markedReadFor.current = null
            })
    }, [roomId, messagesLoading, messages, queryClient])

    useEffect(() => {
        if (!messages.length) return
        const newest = messages[messages.length - 1]
        if (!newest) return
        if (lastSoundId.current == null) {
            lastSoundId.current = newest.id
            return
        }
        if (newest.id === lastSoundId.current) return
        lastSoundId.current = newest.id
        if (!newest.mine && soundOn) playSound()
        if (!newest.mine) {
            ChatApiService.markRead(roomId!).then(() => {
                queryClient.invalidateQueries({ queryKey: ["chat-unread"] })
            }).catch(() => undefined)
        }
    }, [messages, soundOn, roomId, queryClient])

    useEffect(() => {
        const tick = () => {
            ChatApiService.presence().catch(() => undefined)
        }
        tick()
        const id = window.setInterval(tick, PRESENCE_MS)
        return () => window.clearInterval(id)
    }, [])

    useEffect(() => {
        return () => {
            if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview)
        }
    }, [pendingImage])

    const onScroll = () => {
        const el = scrollRef.current
        if (!el) return
        stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }

    const ensureAudio = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio(SOUND_URL)
            audioRef.current.preload = "auto"
            audioRef.current.volume = 0.9
        }
        return audioRef.current
    }

    const unlockSound = () => {
        if (soundUnlocked.current) return
        try {
            const a = ensureAudio()
            a.muted = true
            const p = a.play()
            if (p && typeof p.then === "function") {
                p.then(() => {
                    a.pause()
                    a.currentTime = 0
                    a.muted = false
                    soundUnlocked.current = true
                }).catch(() => {
                    a.muted = false
                })
            } else {
                a.muted = false
                soundUnlocked.current = true
            }
        } catch {
            /* ignore */
        }
    }

    const playSound = () => {
        try {
            const a = ensureAudio()
            a.currentTime = 0
            const p = a.play()
            if (p && typeof p.catch === "function") p.catch(() => undefined)
        } catch {
            /* ignore */
        }
    }

    const toggleSound = () => {
        unlockSound()
        setSoundOn((prev) => {
            const next = !prev
            writeSoundEnabled(next)
            if (next) playSound()
            return next
        })
    }

    const attachFile = (file: File | null | undefined) => {
        if (!file || !file.type.startsWith("image/")) return
        if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview)
        setPendingImage({ file, preview: URL.createObjectURL(file) })
    }

    const clearPendingImage = () => {
        if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview)
        setPendingImage(null)
    }

    const insertMention = (member: ChatMemberDto) => {
        const state = activeMention(draft, caret)
        const tag = `@${member.fullName} `
        if (state) {
            const next = draft.slice(0, state.start) + tag + draft.slice(caret)
            setDraft(next)
            const nextCaret = state.start + tag.length
            setCaret(nextCaret)
            requestAnimationFrame(() => {
                const el = textareaRef.current
                if (!el) return
                el.focus()
                el.setSelectionRange(nextCaret, nextCaret)
            })
            return
        }
        const next = `${draft}${draft && !draft.endsWith(" ") ? " " : ""}${tag}`
        setDraft(next)
        setCaret(next.length)
        requestAnimationFrame(() => textareaRef.current?.focus())
    }

    const insertSmile = (code: string) => {
        const before = draft.slice(0, caret)
        const after = draft.slice(caret)
        const next = before + code + after
        const nextCaret = before.length + code.length
        setDraft(next)
        setCaret(nextCaret)
        setSmilesOpen(false)
        requestAnimationFrame(() => {
            const el = textareaRef.current
            if (!el) return
            el.focus()
            el.setSelectionRange(nextCaret, nextCaret)
        })
    }

    const pasteFromClipboard = async () => {
        unlockSound()
        try {
            const items = await navigator.clipboard.read()
            for (const item of items) {
                const imageType = item.types.find((t) => t.startsWith("image/"))
                if (imageType) {
                    const blob = await item.getType(imageType)
                    const ext = imageType.split("/")[1] || "png"
                    attachFile(new File([blob], `clipboard.${ext}`, { type: imageType }))
                    return
                }
            }
            const text = await navigator.clipboard.readText()
            if (text) {
                setDraft((prev) => prev + text)
                setCaret((c) => c + text.length)
            }
        } catch {
            try {
                const text = await navigator.clipboard.readText()
                if (text) {
                    setDraft((prev) => prev + text)
                    setCaret((c) => c + text.length)
                    return
                }
            } catch {
                /* fall through */
            }
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.chat.pasteDenied" }),
            })
        }
    }

    const { mutate: send, isPending: sending } = useMutation({
        mutationFn: (payload: { body: string; imageUrl?: string | null }) =>
            ChatApiService.sendMessage(roomId!, payload),
        onSuccess: (msg) => {
            setDraft("")
            setCaret(0)
            clearPendingImage()
            stickBottom.current = true
            queryClient.setQueryData<ChatMessageDto[]>(["chat-messages", roomId], (prev) => {
                const list = prev ?? []
                if (list.some((m) => m.id === msg.id)) return list
                return [...list, msg]
            })
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.chat.sendError" }),
            })
        },
    })

    const { mutate: createRoom, isPending: creating } = useMutation({
        mutationFn: () => ChatApiService.createProgramRoom({ programCode: createProgram! }),
        onSuccess: (room) => {
            queryClient.invalidateQueries({ queryKey: ["chat-rooms"] })
            setCreateOpen(false)
            setCreateProgram(null)
            setSelectedId(room.id)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.chat.created" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.chat.createError" }),
            })
        },
    })

    const submit = async () => {
        const body = draft.trim()
        if ((!body && !pendingImage) || !roomId || sending || uploading) return
        unlockSound()
        let imageUrl: string | undefined
        if (pendingImage) {
            setUploading(true)
            try {
                const resp = await FilesApiService.uploadFile(pendingImage.file)
                imageUrl = resp.data?.link || undefined
                if (!imageUrl) throw new Error("no link")
            } catch {
                notifications.show({
                    color: "red",
                    message: intl.formatMessage({ id: "pages.chat.imageUploadError" }),
                })
                setUploading(false)
                return
            }
            setUploading(false)
        }
        send({ body, imageUrl })
    }

    return (
        <div className={classes.root}>
            <div className={classes.topBar}>
                <Title order={2} style={{ margin: 0, fontSize: 20 }}>
                    <Flex align="center" gap={8}>
                        <IconMessages size={20} stroke={1.7} />
                        <FormattedMessage id="pages.chat.title" />
                    </Flex>
                </Title>
                {canSeeAll && (
                    <Badge variant="light" color="gray" className={classes.hint}>
                        <FormattedMessage id="pages.chat.allRoomsHint" />
                    </Badge>
                )}
                {canCreate && (
                    <Button size="compact-sm" variant="light" onClick={() => setCreateOpen((v) => !v)}>
                        <FormattedMessage id="pages.chat.createProgram" />
                    </Button>
                )}
            </div>

            {createOpen && canCreate && (
                <div className={classes.createPanel}>
                    <Select
                        style={{ flex: 1, minWidth: 200 }}
                        label={intl.formatMessage({ id: "pages.chat.program" })}
                        placeholder={intl.formatMessage({ id: "pages.chat.programPlaceholder" })}
                        data={programOptions}
                        value={createProgram}
                        onChange={setCreateProgram}
                        searchable
                        nothingFoundMessage={intl.formatMessage({ id: "pages.chat.noProgramsLeft" })}
                    />
                    <Button
                        onClick={() => createRoom()}
                        disabled={!createProgram || creating}
                        loading={creating}
                    >
                        <FormattedMessage id="pages.chat.create" />
                    </Button>
                </div>
            )}

            <div className={classes.roomStrip}>
                {rooms.map((room) => (
                    <button
                        key={room.id}
                        type="button"
                        className={`${classes.roomChip} ${selected?.id === room.id ? classes.roomChipActive : ""}`}
                        onClick={() => {
                            setSelectedId(room.id)
                            stickBottom.current = true
                        }}
                    >
                        {roomLabel(room, intl.locale)}
                        {room.type === "GENERAL" ? (
                            <span className={classes.badgeGeneral} style={{ marginLeft: 6 }}>
                                <FormattedMessage id="pages.chat.badgeGeneral" />
                            </span>
                        ) : (
                            <span className={classes.badgeProgram} style={{ marginLeft: 6 }}>
                                <FormattedMessage id="pages.chat.badgeProgram" />
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className={`${classes.layout} ${!membersOpen ? classes.layoutMembersHidden : ""}`}>
                <div className={classes.pane}>
                    <div className={classes.head}>
                        <div>
                            <h3 className={classes.headTitle}>
                                {selected ? roomLabel(selected, intl.locale) : "—"}
                                {selected?.type === "GENERAL" ? (
                                    <span className={classes.badgeGeneral}>
                                        <FormattedMessage id="pages.chat.badgeGeneral" />
                                    </span>
                                ) : selected ? (
                                    <span className={classes.badgeProgram}>
                                        <FormattedMessage id="pages.chat.badgeProgram" />
                                    </span>
                                ) : null}
                            </h3>
                            <p className={classes.headSub}>
                                <FormattedMessage
                                    id={
                                        selected?.type === "GENERAL"
                                            ? "pages.chat.generalHint"
                                            : "pages.chat.programHint"
                                    }
                                />
                            </p>
                        </div>
                        <div className={classes.headTools}>
                            <button
                                type="button"
                                className={`${classes.soundBtn} ${soundOn ? classes.soundBtnOn : ""}`}
                                onClick={toggleSound}
                                title={intl.formatMessage({
                                    id: soundOn ? "pages.chat.soundOn" : "pages.chat.soundOff",
                                })}
                            >
                                <FormattedMessage id={soundOn ? "pages.chat.soundOn" : "pages.chat.soundOff"} />
                            </button>
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                onClick={() => setMembersOpen((v) => !v)}
                            >
                                <FormattedMessage
                                    id={membersOpen ? "pages.chat.hideMembers" : "pages.chat.showMembers"}
                                />
                            </Button>
                        </div>
                    </div>

                    <div className={classes.messages} ref={scrollRef} onScroll={onScroll}>
                        {messagesLoading && messages.length === 0 && (
                            <div className={classes.empty}>
                                <FormattedMessage id="pages.chat.loading" />
                            </div>
                        )}
                        {!messagesLoading && messages.length === 0 && (
                            <div className={classes.empty}>
                                <FormattedMessage id="pages.chat.empty" />
                            </div>
                        )}
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`${classes.bubble} ${m.mine ? classes.bubbleMine : ""}`}
                            >
                                <div className={classes.meta}>
                                    <span className={classes.author}>
                                        {m.authorFullName || m.authorUsername}
                                    </span>
                                    <span className={classes.time}>{formatTime(m.createdAt)}</span>
                                </div>
                                {m.body ? <div className={classes.body}>{renderBody(m.body)}</div> : null}
                                {m.imageUrl ? (
                                    <a href={m.imageUrl} target="_blank" rel="noreferrer">
                                        <img className={classes.msgImage} src={m.imageUrl} alt="" />
                                    </a>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    <div className={classes.compose}>
                        {mentionState && mentionMatches.length > 0 && (
                            <div className={classes.mentionPopup} role="listbox">
                                {mentionMatches.map((m) => (
                                    <button
                                        key={m.username}
                                        type="button"
                                        className={classes.mentionItem}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            insertMention(m)
                                        }}
                                    >
                                        <div className={classes.mentionName}>{m.fullName}</div>
                                        <div className={classes.mentionMeta}>
                                            {m.programCode || m.username}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {pendingImage && (
                            <div className={classes.preview}>
                                <img src={pendingImage.preview} alt="" />
                                <Button size="compact-xs" variant="subtle" color="red" onClick={clearPendingImage}>
                                    <FormattedMessage id="pages.chat.removeImage" />
                                </Button>
                            </div>
                        )}

                        <div className={classes.composeRow}>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                    attachFile(e.target.files?.[0])
                                    e.currentTarget.value = ""
                                }}
                            />
                            <button
                                type="button"
                                className={classes.icoBtn}
                                title={intl.formatMessage({ id: "pages.chat.attachImage" })}
                                disabled={!roomId || sending || uploading}
                                onClick={() => fileRef.current?.click()}
                            >
                                <IconCamera size={18} stroke={1.7} />
                            </button>
                            <div className={classes.smileWrap}>
                                <button
                                    type="button"
                                    className={`${classes.icoBtn} ${smilesOpen ? classes.icoBtnActive : ""}`}
                                    title={intl.formatMessage({ id: "pages.chat.smiles" })}
                                    disabled={!roomId || sending || uploading}
                                    onClick={() => setSmilesOpen((v) => !v)}
                                >
                                    <IconMoodSmile size={18} stroke={1.7} />
                                </button>
                                {smilesOpen && (
                                    <div className={classes.smilePanel} role="listbox">
                                        {KOLOBOK_SMILES.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className={classes.smilePick}
                                                title={`${s.label} (${s.code})`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault()
                                                    insertSmile(s.code)
                                                }}
                                            >
                                                <img
                                                    src={kolobokAssetUrl(s.file)}
                                                    alt={s.label}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                className={classes.pasteBtn}
                                disabled={!roomId || sending || uploading}
                                onClick={() => void pasteFromClipboard()}
                            >
                                <IconClipboard size={16} stroke={1.7} />
                                <span className={classes.pasteLabel}>
                                    <FormattedMessage id="pages.chat.pasteClipboard" />
                                </span>
                            </button>
                            <Textarea
                                className={classes.composeInput}
                                ref={textareaRef}
                                minRows={2}
                                maxRows={5}
                                autosize
                                value={draft}
                                disabled={!roomId || sending || uploading}
                                placeholder={intl.formatMessage({ id: "pages.chat.placeholder" })}
                                onChange={(e) => {
                                    setDraft(e.currentTarget.value)
                                    setCaret(e.currentTarget.selectionStart)
                                }}
                                onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                                onClick={(e) => setCaret(e.currentTarget.selectionStart)}
                                onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
                                onPaste={(e) => {
                                    const items = e.clipboardData?.items
                                    if (!items) return
                                    for (let i = 0; i < items.length; i++) {
                                        const item = items[i]
                                        if (item.type.startsWith("image/")) {
                                            e.preventDefault()
                                            attachFile(item.getAsFile())
                                            return
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                        e.preventDefault()
                                        void submit()
                                    }
                                }}
                            />
                            <Button
                                leftSection={<IconSend size={16} />}
                                onClick={() => void submit()}
                                loading={sending || uploading}
                                disabled={!roomId || (!draft.trim() && !pendingImage)}
                            >
                                <FormattedMessage id="pages.chat.send" />
                            </Button>
                        </div>
                    </div>
                </div>

                {membersOpen && (
                    <div className={classes.members}>
                        <div className={classes.membersHead}>
                            <FormattedMessage id="pages.chat.members" />
                            <span style={{ fontWeight: 700, opacity: 0.65 }}> · {members.length}</span>
                            {onlineCount > 0 && (
                                <span className={classes.onlineN}>
                                    {" "}
                                    ·{" "}
                                    <FormattedMessage
                                        id="pages.chat.onlineCount"
                                        values={{ count: onlineCount }}
                                    />
                                </span>
                            )}
                        </div>
                        <div className={classes.membersList}>
                            {membersLoading && members.length === 0 && (
                                <div className={classes.empty}>
                                    <FormattedMessage id="pages.chat.loading" />
                                </div>
                            )}
                            {!membersLoading && members.length === 0 && (
                                <div className={classes.empty}>
                                    <FormattedMessage id="pages.chat.noMembers" />
                                </div>
                            )}
                            {members.map((u) => (
                                <button
                                    key={u.username}
                                    type="button"
                                    className={`${classes.member} ${u.online ? classes.memberOnline : ""}`}
                                    title={intl.formatMessage({ id: "pages.chat.mentionHint" })}
                                    onClick={() => insertMention(u)}
                                >
                                    <span
                                        className={`${classes.dot} ${u.online ? classes.dotOnline : ""}`}
                                    />
                                    <span className={classes.memberText}>
                                        <span className={classes.memberName}>{u.fullName}</span>
                                        {u.programCode ? (
                                            <span className={classes.memberRole}>{u.programCode}</span>
                                        ) : null}
                                        {!u.online && u.seenLabel ? (
                                            <span className={classes.memberSeen}>{u.seenLabel}</span>
                                        ) : null}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ChatPage
