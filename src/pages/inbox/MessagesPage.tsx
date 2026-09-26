import { Alert, Badge, Flex, Text, Textarea, Title, Button } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { InboxApiService, InboxThreadDto } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useScreenSize } from "src/shared/hooks/useDesktop"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./MessagesPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

const formatSeen = (value?: string | null) => (value ? dayjs(value).format("DD.MM HH:mm") : null)

const personOf = (item: InboxThreadDto) => {
    if (item.kind === "REPORT_CUSTOMER") {
        return {
            name: item.counterpartName || item.createdBy || item.recipientName || item.recipient || "портал",
            login: item.counterpart || item.createdBy || item.recipient || null,
        }
    }
    return {
        name: item.recipientName || item.counterpartName || item.recipient || item.counterpart || item.createdBy || "портал",
        login: item.recipient || item.counterpart || item.createdBy || null,
    }
}

const sortThreads = (threads: InboxThreadDto[]) =>
    [...threads].sort((a, b) => {
        if (a.needsAck !== b.needsAck) return a.needsAck ? -1 : 1
        if (a.unread !== b.unread) return a.unread ? -1 : 1
        if (!!a.hasReply !== !!b.hasReply) return a.hasReply ? 1 : -1
        const aTime = dayjs(a.lastMessageTime || a.createTime).valueOf()
        const bTime = dayjs(b.lastMessageTime || b.createTime).valueOf()
        return bTime - aTime
    })

export const MessagesPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { isMobile } = useScreenSize()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [reply, setReply] = useState("")
    const showList = !isMobile || !selectedId
    const showThread = !isMobile || !!selectedId
    const canDelete = hasPermission(user, MANAGERS)

    setDocumentTitleByLocale("pages.messages.title")

    const { data: threads = [] } = useQuery({
        queryKey: ["inbox"],
        queryFn: () => InboxApiService.list(),
    })
    const { data: pendingAck = 0 } = useQuery({
        queryKey: ["inbox-pending-ack"],
        queryFn: () => InboxApiService.pendingAckCount(),
    })

    const sortedThreads = useMemo(() => sortThreads(threads), [threads])

    useEffect(() => {
        if (isMobile || selectedId || sortedThreads.length === 0) return
        setSelectedId(sortedThreads[0].id)
    }, [isMobile, selectedId, sortedThreads])

    const { data: thread } = useQuery({
        queryKey: ["inbox", selectedId],
        queryFn: () => InboxApiService.get(selectedId!),
        enabled: !!selectedId,
    })

    const refreshInbox = () => {
        queryClient.invalidateQueries({ queryKey: ["inbox"] })
        queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
        queryClient.invalidateQueries({ queryKey: ["inbox-pending-ack"] })
    }

    const { mutate: sendReply, isPending } = useMutation({
        mutationFn: () => InboxApiService.reply(selectedId!, reply.trim()),
        onSuccess: () => {
            setReply("")
            refreshInbox()
        },
    })

    const { mutate: ack, isPending: acking } = useMutation({
        mutationFn: () => InboxApiService.ack(selectedId!),
        onSuccess: refreshInbox,
    })

    const { mutate: removeThread, isPending: deleting } = useMutation({
        mutationFn: (id: string) => InboxApiService.delete(id),
        onSuccess: () => {
            setSelectedId(null)
            setReply("")
            refreshInbox()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.messages.deleted" />
                    </Text>,
                    null
                )
            )
        },
    })

    const confirmDelete = (id: string) => {
        if (!window.confirm(intl.formatMessage({ id: "pages.messages.deleteConfirm" }))) return
        removeThread(id)
    }

    const openThread = (item: InboxThreadDto) => {
        setSelectedId(item.id)
        setReply("")
    }

    const heatmapUser = (item?: { kind: string; heatmapUser?: string | null; counterpart?: string | null } | null) => {
        if (!item) return null
        if (!item.kind.startsWith("OVERDUE") && item.kind !== "TASK") return null
        return item.heatmapUser || item.counterpart || user?.username || null
    }

    return (
        <Flex className={classes.root} direction={isMobile ? "column" : "row"} gap="lg">
            {showList && (
                <div className={classes.list}>
                    <div className={classes.listHeader}>
                        <Title order={2}>
                            <FormattedMessage id="pages.messages.title" />
                        </Title>
                        <Text size="xs" c="dimmed" mt={4}>
                            <FormattedMessage id="pages.messages.sortHint" />
                        </Text>
                        {pendingAck > 0 && (
                            <Alert color="orange" mt="md">
                                <FormattedMessage id="pages.messages.ackBlock" values={{ count: pendingAck }} />
                            </Alert>
                        )}
                    </div>
                    <div className={classes.listScroll}>
                        {sortedThreads.length === 0 && (
                            <Text c="dimmed">
                                <FormattedMessage id="pages.messages.empty" />
                            </Text>
                        )}
                        {sortedThreads.map((item) => {
                            const person = personOf(item)
                            const time = dayjs(item.lastMessageTime || item.createTime).format("DD.MM HH:mm")
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={[
                                        classes.item,
                                        selectedId === item.id ? classes.itemActive : "",
                                        item.unread ? classes.itemUnread : "",
                                        item.hasReply ? classes.itemReplied : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => openThread(item)}
                                >
                                    <Flex justify="space-between" gap="sm" align="flex-start">
                                        <Text className={classes.person} lineClamp={1}>
                                            {person.name}
                                        </Text>
                                        <Text size="xs" c="dimmed" className={classes.time}>
                                            {time}
                                        </Text>
                                    </Flex>
                                    <Text size="sm" c="dimmed" lineClamp={1} mt={2}>
                                        {item.subject}
                                    </Text>
                                    <Flex gap={6} wrap="wrap" mt={8}>
                                        {item.unread && (
                                            <Badge size="xs" color="blue" variant="filled">
                                                <FormattedMessage id="pages.messages.new" />
                                            </Badge>
                                        )}
                                        {typeof item.hasReply === "boolean" &&
                                            (item.hasReply ? (
                                                <Badge size="xs" color="teal" variant="light">
                                                    <FormattedMessage id="pages.messages.replied" />
                                                </Badge>
                                            ) : (
                                                <Badge size="xs" color="orange" variant="light">
                                                    <FormattedMessage id="pages.messages.awaitingReply" />
                                                </Badge>
                                            ))}
                                        {!item.receivedAt && (
                                            <Badge size="xs" color="red" variant="light">
                                                <FormattedMessage id="pages.messages.notReceived" />
                                            </Badge>
                                        )}
                                    </Flex>
                                    {item.hasReply && item.lastAuthorName && (
                                        <Text size="xs" c="dimmed" mt={6} lineClamp={1}>
                                            <FormattedMessage
                                                id="pages.messages.lastFrom"
                                                values={{ name: item.lastAuthorName }}
                                            />
                                        </Text>
                                    )}
                                    {item.lastBody && (
                                        <Text size="sm" className={classes.preview} lineClamp={2} mt={4}>
                                            {item.lastBody}
                                        </Text>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
            {showThread && (
                <div className={classes.thread}>
                    {!thread ? (
                        <Text c="dimmed">
                            <FormattedMessage id="pages.messages.pick" />
                        </Text>
                    ) : (
                        <>
                            <div className={classes.threadHeader}>
                                <Flex justify="space-between" align="center" gap="sm" wrap="wrap">
                                    {isMobile && (
                                        <Button variant="subtle" size="compact-sm" onClick={() => setSelectedId(null)}>
                                            <FormattedMessage id="pages.messages.back" />
                                        </Button>
                                    )}
                                    <Title order={3} className={classes.threadTitle}>
                                        {thread.subject}
                                    </Title>
                                    <Flex gap="sm" wrap="wrap">
                                        {thread.kind === "REPORT_CUSTOMER" && (
                                            <Button
                                                variant="light"
                                                onClick={() =>
                                                    navigate(
                                                        thread.reportId
                                                            ? `/report/${thread.reportId}`
                                                            : "/reports/review"
                                                    )
                                                }
                                            >
                                                <FormattedMessage id="pages.review-reports.open" />
                                            </Button>
                                        )}
                                        {heatmapUser(thread) && (
                                            <Button
                                                variant="light"
                                                onClick={() =>
                                                    navigate(
                                                        `/volunteers/heatmap?search=${encodeURIComponent(heatmapUser(thread)!)}`
                                                    )
                                                }
                                            >
                                                <FormattedMessage id="pages.overdue.openHeatmap" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="light"
                                                color="red"
                                                loading={deleting}
                                                onClick={() => confirmDelete(thread.id)}
                                            >
                                                <FormattedMessage id="pages.messages.delete" />
                                            </Button>
                                        )}
                                    </Flex>
                                </Flex>
                                <Text size="sm" mt={8} fw={600}>
                                    {thread.recipientName || thread.recipient || "—"}
                                </Text>
                                <Text size="sm" c="dimmed" mt={4}>
                                    {thread.recipientLastSeen ? (
                                        <FormattedMessage
                                            id="pages.messages.lastSeen"
                                            values={{ time: formatSeen(thread.recipientLastSeen) }}
                                        />
                                    ) : (
                                        <FormattedMessage id="pages.messages.lastSeenNever" />
                                    )}
                                    {" · "}
                                    {thread.receivedAt ? (
                                        <FormattedMessage
                                            id="pages.messages.receivedAt"
                                            values={{ time: formatSeen(thread.receivedAt) }}
                                        />
                                    ) : (
                                        <FormattedMessage id="pages.messages.notReceived" />
                                    )}
                                </Text>
                                {thread.needsAck && (
                                    <Button mt="sm" color="orange" loading={acking} onClick={() => ack()}>
                                        <FormattedMessage id="pages.messages.ack" />
                                    </Button>
                                )}
                            </div>
                            <div className={classes.messages}>
                                <Flex direction="column" gap="sm">
                                    {thread.messages.map((message) => {
                                        const mine = message.author === user?.username
                                        return (
                                            <div key={message.id} className={mine ? classes.mine : classes.theirs}>
                                                <Text size="xs" c="dimmed">
                                                    {message.authorName || message.author || "портал"} ·{" "}
                                                    {dayjs(message.createTime).format("DD.MM HH:mm")}
                                                </Text>
                                                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                                                    {message.body}
                                                </Text>
                                            </div>
                                        )
                                    })}
                                </Flex>
                            </div>
                            <div className={classes.composer}>
                                <Textarea
                                    minRows={3}
                                    value={reply}
                                    onChange={(event) => setReply(event.currentTarget.value)}
                                    label={<FormattedMessage id="pages.messages.reply" />}
                                />
                                <Button
                                    mt="sm"
                                    disabled={reply.trim().length === 0}
                                    loading={isPending}
                                    onClick={() => sendReply()}
                                >
                                    <FormattedMessage id="pages.messages.send" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Flex>
    )
}

export default MessagesPage
