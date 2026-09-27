import { Badge, Box, Button, Drawer, Flex, ScrollArea, Text, Title } from "@mantine/core"
import { AnnouncementDto } from "@rds-network/portal-api-axios"
import { IconBell } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import parse from "html-react-parser"
import React, { useRef, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { AnnouncementApiService } from "src/shared/api/AnnouncementApiService"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { sanitizeHtml } from "src/shared/utils/sanitizeHtml"
import classes from "./AnnouncementBell.module.scss"

export const AnnouncementBell: React.FC = () => {
    const [opened, setOpened] = useState(false)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const markingIdsRef = useRef(new Set<string>())

    const { data: announcementUnread = 0 } = useQuery({
        queryKey: ["announcements", "unread-count"],
        queryFn: () => AnnouncementApiService.getUnreadAnnouncementsCount().then((r) => r.data.count),
        refetchInterval: 30_000,
    })
    const { data: inboxUnread = 0 } = useQuery({
        queryKey: ["inbox-unread"],
        queryFn: () => InboxApiService.unreadCount(),
        refetchInterval: 30_000,
    })
    const unreadCount = announcementUnread + inboxUnread

    const { data: announcements = [], isFetching } = useQuery({
        queryKey: ["announcements", "list"],
        queryFn: () => AnnouncementApiService.getAnnouncements().then((r) => r.data),
        enabled: opened,
    })
    const { data: inbox = [] } = useQuery({
        queryKey: ["inbox"],
        queryFn: () => InboxApiService.list(),
        enabled: opened,
    })

    const { mutate: markRead } = useMutation({
        mutationFn: (id: string) => AnnouncementApiService.markAnnouncementRead(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["announcements"] })

            const previousList = queryClient.getQueryData<AnnouncementDto[]>(["announcements", "list"])
            const previousCount = queryClient.getQueryData<number>(["announcements", "unread-count"])

            if (previousList) {
                queryClient.setQueryData(
                    ["announcements", "list"],
                    previousList.map((item) => (item.id === id ? { ...item, read: true } : item))
                )
            }

            if (typeof previousCount === "number") {
                queryClient.setQueryData(["announcements", "unread-count"], Math.max(0, previousCount - 1))
            }

            return { previousList, previousCount }
        },
        onError: (_error, _id, context) => {
            if (context?.previousList) {
                queryClient.setQueryData(["announcements", "list"], context.previousList)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(["announcements", "unread-count"], context.previousCount)
            }
        },
        onSettled: (_data, _error, id) => {
            markingIdsRef.current.delete(id)
            queryClient.invalidateQueries({ queryKey: ["announcements"] })
        },
    })

    const onOpenAnnouncement = (item: AnnouncementDto) => {
        if (item.read || markingIdsRef.current.has(item.id)) {
            return
        }

        markingIdsRef.current.add(item.id)
        markRead(item.id)
    }

    return (
        <>
            <Box pos="relative" display="inline-block">
                <Button
                    variant="subtle"
                    color="gray"
                    aria-label="notifications"
                    onClick={() => setOpened(true)}
                    className={classes.button}
                >
                    <IconBell size={22} />
                </Button>
                {unreadCount > 0 && (
                    <Badge size="xs" color="blue" className={classes.bellBadge}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                )}
            </Box>

            <Drawer
                opened={opened}
                onClose={() => setOpened(false)}
                title={
                    <Title order={4}>
                        <FormattedMessage id="common.announcements.title" />
                    </Title>
                }
                position="right"
                size="md"
            >
                <ScrollArea h="calc(100vh - 120px)">
                    <Flex direction="column" gap="md">
                        {inbox.slice(0, 8).map((item) => (
                            <Flex
                                key={item.id}
                                direction="column"
                                gap={6}
                                className={item.unread ? classes.itemUnread : classes.itemRead}
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                    setOpened(false)
                                    if (item.kind === "REPORT_CUSTOMER") {
                                        navigate(item.reportId ? `/report/${item.reportId}` : "/reports/review")
                                        return
                                    }
                                    const login = item.heatmapUser || item.counterpart
                                    if (login && (item.kind.startsWith("OVERDUE") || item.kind === "TASK")) {
                                        navigate(`/volunteers/heatmap?search=${encodeURIComponent(login)}`)
                                        return
                                    }
                                    navigate("/messages")
                                }}
                            >
                                <Flex justify="space-between" align="center" gap="sm">
                                    <Text fw={600}>{item.subject}</Text>
                                    {item.unread && (
                                        <Badge size="xs" color="blue">
                                            <FormattedMessage id="common.announcements.new" />
                                        </Badge>
                                    )}
                                </Flex>
                                <Text size="xs" c="dimmed">
                                    {dayjs(item.createTime).format("DD.MM.YYYY HH:mm")}
                                </Text>
                                {item.lastBody && (
                                    <Text size="sm" lineClamp={3}>
                                        {item.lastBody}
                                    </Text>
                                )}
                            </Flex>
                        ))}
                        {isFetching && (
                            <Text c="dimmed" size="sm">
                                <FormattedMessage id="common.announcements.loading" />
                            </Text>
                        )}
                        {!isFetching && announcements.length === 0 && (
                            <Text c="dimmed" size="sm">
                                <FormattedMessage id="common.announcements.empty" />
                            </Text>
                        )}
                        {announcements.map((item) => (
                            <Flex
                                key={item.id}
                                direction="column"
                                gap={6}
                                className={item.read ? classes.itemRead : classes.itemUnread}
                                onClick={() => onOpenAnnouncement(item)}
                            >
                                <Flex justify="space-between" align="center" gap="sm">
                                    <Text fw={600}>{item.title}</Text>
                                    {!item.read && (
                                        <Badge size="xs" color="blue">
                                            <FormattedMessage id="common.announcements.new" />
                                        </Badge>
                                    )}
                                </Flex>
                                <Text size="xs" c="dimmed">
                                    {dayjs(item.createTime).format("DD.MM.YYYY HH:mm")}
                                </Text>
                                <Text size="sm" component="div">
                                    {parse(sanitizeHtml(item.body))}
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                </ScrollArea>
            </Drawer>
        </>
    )
}
