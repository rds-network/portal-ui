import { Badge, Button, Flex, Select, Text, Textarea, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconMessages, IconSend } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import {
    ChatApiService,
    ChatMessageDto,
    ChatRoomDto,
} from "src/shared/api/ChatApiService"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./ChatPage.module.scss"

const POLL_MS = 4000

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

export const ChatPage: React.FC = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [draft, setDraft] = useState("")
    const [membersOpen, setMembersOpen] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [createProgram, setCreateProgram] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const stickBottom = useRef(true)

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
        refetchInterval: roomId && membersOpen ? 30000 : false,
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

    useEffect(() => {
        if (!stickBottom.current) return
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages, roomId])

    const onScroll = () => {
        const el = scrollRef.current
        if (!el) return
        stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }

    const { mutate: send, isPending: sending } = useMutation({
        mutationFn: (body: string) => ChatApiService.sendMessage(roomId!, body),
        onSuccess: (msg) => {
            setDraft("")
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

    const submit = () => {
        const body = draft.trim()
        if (!body || !roomId || sending) return
        send(body)
    }

    return (
        <div className={classes.root}>
            <div className={classes.topBar}>
                <Title order={2} style={{ margin: 0, fontSize: 22 }}>
                    <Flex align="center" gap={8}>
                        <IconMessages size={22} stroke={1.7} />
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
                                <div className={classes.body}>{m.body}</div>
                            </div>
                        ))}
                    </div>

                    <div className={classes.compose}>
                        <Textarea
                            style={{ flex: 1 }}
                            minRows={2}
                            maxRows={5}
                            autosize
                            value={draft}
                            disabled={!roomId || sending}
                            placeholder={intl.formatMessage({ id: "pages.chat.placeholder" })}
                            onChange={(e) => setDraft(e.currentTarget.value)}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                    e.preventDefault()
                                    submit()
                                }
                            }}
                        />
                        <Button
                            leftSection={<IconSend size={16} />}
                            onClick={submit}
                            loading={sending}
                            disabled={!roomId || !draft.trim()}
                        >
                            <FormattedMessage id="pages.chat.send" />
                        </Button>
                    </div>
                </div>

                {membersOpen && (
                    <div className={classes.members}>
                        <div className={classes.membersHead}>
                            <FormattedMessage id="pages.chat.members" />
                            <span style={{ fontWeight: 700, opacity: 0.65 }}> · {members.length}</span>
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
                                <div key={u.username} className={classes.member}>
                                    <div className={classes.memberName}>{u.fullName}</div>
                                    <div className={classes.memberLogin}>{u.username}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ChatPage
