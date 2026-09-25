import { Alert, Badge, Button, Flex, Text, Textarea, Title } from "@mantine/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { InboxApiService, InboxThreadDto } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useScreenSize } from "src/shared/hooks/useDesktop"
import { UserContext } from "src/app/providers/UserContext"
import classes from "./MessagesPage.module.scss"

const formatSeen = (value?: string | null) => (value ? dayjs(value).format("DD.MM HH:mm") : null)

export const MessagesPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { isMobile } = useScreenSize()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [reply, setReply] = useState("")
    const showList = !isMobile || !selectedId
    const showThread = !isMobile || !!selectedId

    setDocumentTitleByLocale("pages.messages.title")

    const { data: threads = [] } = useQuery({
        queryKey: ["inbox"],
        queryFn: () => InboxApiService.list(),
    })
    const { data: pendingAck = 0 } = useQuery({
        queryKey: ["inbox-pending-ack"],
        queryFn: () => InboxApiService.pendingAckCount(),
    })

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
                    {pendingAck > 0 && (
                        <Alert color="orange" mt="md">
                            <FormattedMessage id="pages.messages.ackBlock" values={{ count: pendingAck }} />
                        </Alert>
                    )}
                </div>
                <div className={classes.listScroll}>
                    {threads.length === 0 && (
                        <Text c="dimmed">
                            <FormattedMessage id="pages.messages.empty" />
                        </Text>
                    )}
                    {threads.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`${classes.item} ${selectedId === item.id ? classes.itemActive : ""}`}
                            onClick={() => openThread(item)}
                        >
                            <Flex justify="space-between" gap="sm">
                                <Text fw={600} lineClamp={1}>
                                    {item.subject}
                                </Text>
                                {item.unread && (
                                    <Badge size="xs" color="blue">
                                        <FormattedMessage id="pages.messages.new" />
                                    </Badge>
                                )}
                            </Flex>
                            <Text size="xs" c="dimmed">
                                {item.recipientName ||
                                    item.counterpartName ||
                                    item.recipient ||
                                    item.counterpart ||
                                    item.createdBy ||
                                    "портал"}{" "}
                                · {dayjs(item.createTime).format("DD.MM HH:mm")}
                            </Text>
                            <Text size="xs" c={item.recipientLastSeen ? "dimmed" : "orange"} mt={2}>
                                {item.recipientLastSeen ? (
                                    <FormattedMessage
                                        id="pages.messages.lastSeen"
                                        values={{ time: formatSeen(item.recipientLastSeen) }}
                                    />
                                ) : (
                                    <FormattedMessage id="pages.messages.lastSeenNever" />
                                )}
                            </Text>
                            <Text size="xs" c={item.receivedAt ? "teal" : "red"} mt={2}>
                                {item.receivedAt ? (
                                    <FormattedMessage
                                        id="pages.messages.receivedAt"
                                        values={{ time: formatSeen(item.receivedAt) }}
                                    />
                                ) : (
                                    <FormattedMessage id="pages.messages.notReceived" />
                                )}
                            </Text>
                            {item.lastBody && (
                                <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                                    {item.lastBody}
                                </Text>
                            )}
                        </button>
                    ))}
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
                                                    thread.reportId ? `/report/${thread.reportId}` : "/reports/review"
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
                                </Flex>
                            </Flex>
                            <Text size="sm" c="dimmed" mt={6}>
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
                                placeholder={undefined}
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
