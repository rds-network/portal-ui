import { Badge, Button, Card, Flex, Table, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./OverdueReportsPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

export const OverdueReportsPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    setDocumentTitleByLocale("pages.overdue.title")

    useEffect(() => {
        if (!hasPermission(user, MANAGERS)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    const { data: items = [], isFetching } = useQuery({
        queryKey: ["report-overdue"],
        queryFn: () => InboxApiService.overdue(),
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
            queryClient.invalidateQueries({ queryKey: ["report-overdue"] })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
        },
    })

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
                    <Button onClick={() => notify()} loading={isPending}>
                        <FormattedMessage id="pages.overdue.notify" />
                    </Button>
                </Flex>
                {items.length === 0 && !isFetching ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.overdue.empty" />
                    </Text>
                ) : (
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.person" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.overdue.program" />
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
                                <Table.Tr key={item.username}>
                                    <Table.Td>
                                        <Text fw={600}>{item.fullName}</Text>
                                        <Text size="xs" c="dimmed">
                                            {item.username}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>{item.program || "—"}</Table.Td>
                                    <Table.Td>
                                        <Badge color={item.weeksMissed >= 3 ? "red" : "orange"}>
                                            {item.weeksMissed}
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
        </Flex>
    )
}

export default OverdueReportsPage
