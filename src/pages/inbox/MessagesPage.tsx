import { Badge, Button, Flex, ScrollArea, Text, Textarea, Title } from "@mantine/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useState } from "react"
import { FormattedMessage } from "react-intl"
import { InboxApiService, InboxThreadDto } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { UserContext } from "src/app/providers/UserContext"
import classes from "./MessagesPage.module.scss"

export const MessagesPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const queryClient = useQueryClient()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [reply, setReply] = useState("")

    setDocumentTitleByLocale("pages.messages.title")

    const { data: threads = [] } = useQuery({
        queryKey: ["inbox"],
        queryFn: () => InboxApiService.list(),
    })

    const { data: thread } = useQuery({
        queryKey: ["inbox", selectedId],
        queryFn: () => InboxApiService.get(selectedId!),
        enabled: !!selectedId,
    })

    const { mutate: sendReply, isPending } = useMutation({
        mutationFn: () => InboxApiService.reply(selectedId!, reply.trim()),
        onSuccess: () => {
            setReply("")
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
            queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
        },
    })

    const openThread = (item: InboxThreadDto) => {
        setSelectedId(item.id)
        setReply("")
    }

    return (
        <Flex className={classes.root} gap="lg">
            <div className={classes.list}>
                <Title order={2} mb="md">
                    <FormattedMessage id="pages.messages.title" />
                </Title>
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
                            {item.counterpart || item.createdBy || "портал"} · {dayjs(item.createTime).format("DD.MM HH:mm")}
                        </Text>
                        {item.lastBody && (
                            <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                                {item.lastBody}
                            </Text>
                        )}
                    </button>
                ))}
            </div>
            <div className={classes.thread}>
                {!thread ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.messages.pick" />
                    </Text>
                ) : (
                    <>
                        <Title order={3}>{thread.subject}</Title>
                        <ScrollArea className={classes.messages} mt="md">
                            <Flex direction="column" gap="sm">
                                {thread.messages.map((message) => {
                                    const mine = message.author === user?.username
                                    return (
                                        <div key={message.id} className={mine ? classes.mine : classes.theirs}>
                                            <Text size="xs" c="dimmed">
                                                {message.author || "портал"} · {dayjs(message.createTime).format("DD.MM HH:mm")}
                                            </Text>
                                            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                                                {message.body}
                                            </Text>
                                        </div>
                                    )
                                })}
                            </Flex>
                        </ScrollArea>
                        <Textarea
                            mt="md"
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
                    </>
                )}
            </div>
        </Flex>
    )
}

export default MessagesPage
