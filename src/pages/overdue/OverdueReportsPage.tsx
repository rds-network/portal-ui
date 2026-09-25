import { Badge, Button, Card, Flex, Loader, Modal, Table, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { InboxApiService, ReportOverdueDto } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./OverdueReportsPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

export const OverdueReportsPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [previewOpen, setPreviewOpen] = useState(false)
    const [letter, setLetter] = useState<ReportOverdueDto | null>(null)

    setDocumentTitleByLocale("pages.overdue.title")

    useEffect(() => {
        if (!hasPermission(user, MANAGERS)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    const { data: items = [], isFetching, isLoading } = useQuery({
        queryKey: ["report-overdue"],
        queryFn: () => InboxApiService.overdue(),
    })

    const { data: preview } = useQuery({
        queryKey: ["report-overdue-preview"],
        queryFn: () => InboxApiService.overduePreview(),
        enabled: previewOpen,
    })

    const { mutate: notify, isPending } = useMutation({
        mutationFn: () => InboxApiService.notifyOverdue(),
        onSuccess: (sent) => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.overdue.sent" values={{ count: sent }} />
                    </Text>,
                    null
                )
            )
            setPreviewOpen(false)
            queryClient.invalidateQueries({ queryKey: ["report-overdue"] })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
            queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
        },
    })

    const openHeatmap = (username: string) => {
        navigate(`/volunteers/heatmap?search=${encodeURIComponent(username)}`)
    }

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.overdue.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.overdue.description" />
                </Text>
            </div>
            <Card withBorder p="lg" radius="lg">
                <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
                    <Text>
                        <FormattedMessage id="pages.overdue.total" values={{ count: items.length }} />
                    </Text>
                    <Button onClick={() => setPreviewOpen(true)} disabled={isLoading}>
                        <FormattedMessage id="pages.overdue.notify" />
                    </Button>
                </Flex>
                {(isLoading || isFetching) && items.length === 0 ? (
                    <Flex align="center" gap="sm" py="lg">
                        <Loader size="sm" />
                        <Text c="dimmed">
                            <FormattedMessage id="pages.overdue.loading" />
                        </Text>
                    </Flex>
                ) : items.length === 0 ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.overdue.empty" />
                    </Text>
                ) : (
                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.person" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.program" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.hours" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.weeks" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.last" />
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {items.map((item) => (
                                <Table.Tr
                                    key={item.username}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => openHeatmap(item.username)}
                                >
                                    <Table.Td>
                                        <Text fw={600}>{item.fullName}</Text>
                                        <Text size="xs" c="dimmed">
                                            {item.username}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>{item.program || "—"}</Table.Td>
                                    <Table.Td>
                                        <Badge color={(item.hoursShort ?? 0) >= 20 ? "red" : "gray"}>
                                            {item.hoursShort ?? 0}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={
                                                item.weeksMissed >= 3
                                                    ? "red"
                                                    : item.weeksMissed >= 1
                                                      ? "orange"
                                                      : "gray"
                                            }
                                        >
                                            {item.weeksMissed > 0 ? (
                                                `+${item.weeksMissed}`
                                            ) : (
                                                <FormattedMessage id="pages.overdue.snapshot" />
                                            )}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        {item.lastReportWeek ? dayjs(item.lastReportWeek).format("DD.MM.YYYY") : "—"}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Card>

            <Modal
                opened={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title={<FormattedMessage id="pages.overdue.previewTitle" />}
                size="lg"
                centered
            >
                <Text size="sm" c="dimmed" mb="md">
                    <FormattedMessage id="pages.overdue.previewHint" values={{ count: items.length }} />
                </Text>
                {(preview?.templates ?? []).map((item) => (
                    <Card key={item.level} withBorder p="sm" mb="sm" radius="md">
                        <Text fw={650}>{item.subject}</Text>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }} mt={6}>
                            {item.body}
                        </Text>
                    </Card>
                ))}
                <Text fw={650} mt="md" mb={6}>
                    <FormattedMessage id="pages.overdue.samples" />
                </Text>
                {(preview?.samples ?? items.slice(0, 5)).map((item) => (
                    <Button
                        key={item.username}
                        variant="subtle"
                        justify="flex-start"
                        fullWidth
                        onClick={() => setLetter(item)}
                    >
                        {item.fullName}
                    </Button>
                ))}
                <Button mt="md" fullWidth loading={isPending} onClick={() => notify()}>
                    <FormattedMessage id="pages.overdue.notifyConfirm" />
                </Button>
            </Modal>

            <Modal
                opened={!!letter}
                onClose={() => setLetter(null)}
                title={letter?.subject || letter?.fullName}
                centered
            >
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {letter?.body}
                </Text>
                <Button mt="md" variant="light" onClick={() => letter && openHeatmap(letter.username)}>
                    <FormattedMessage id="pages.overdue.openHeatmap" />
                </Button>
            </Modal>
        </Flex>
    )
}

export default OverdueReportsPage
