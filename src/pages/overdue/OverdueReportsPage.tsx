import { Badge, Button, Card, Checkbox, Flex, Group, Loader, Modal, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { InboxApiService, OverdueWeekDto, ReportOverdueDto } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { formatContractEnd } from "src/shared/utils/latestContractEnd"
import classes from "./OverdueReportsPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

const thisMonday = () => dayjs().startOf("isoWeek").format("YYYY-MM-DD")

const weekTone = (week: OverdueWeekDto) => {
    const current = week.weekStart === thisMonday()
    if (current && week.hoursWorked === 0) return "waiting"
    if (!week.hoursRequired) return "na"
    if (week.hoursWorked === 0) return "noReports"
    if (week.hoursWorked < week.hoursRequired) return "partialReports"
    if (week.hoursWorked > week.hoursRequired) return "overtimeReports"
    return "fullReports"
}

export const OverdueReportsPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [previewOpen, setPreviewOpen] = useState(false)
    const [letter, setLetter] = useState<ReportOverdueDto | null>(null)
    const [excluded, setExcluded] = useState<Set<string>>(new Set())

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

    useEffect(() => {
        const known = new Set(items.map((item) => item.username))
        setExcluded((prev) => new Set([...prev].filter((username) => known.has(username))))
    }, [items])

    const sendCount = items.length - excluded.size
    const allIncluded = items.length > 0 && excluded.size === 0
    const someExcluded = excluded.size > 0 && excluded.size < items.length

    const { data: preview } = useQuery({
        queryKey: ["report-overdue-preview"],
        queryFn: () => InboxApiService.overduePreview(),
        enabled: previewOpen,
    })

    const { mutate: notify, isPending } = useMutation({
        mutationFn: () => InboxApiService.notifyOverdue([...excluded]),
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

    const toggleExclude = (username: string) => {
        setExcluded((prev) => {
            const next = new Set(prev)
            if (next.has(username)) next.delete(username)
            else next.add(username)
            return next
        })
    }

    const toggleAll = () => {
        if (allIncluded) {
            setExcluded(new Set(items.map((item) => item.username)))
            return
        }
        setExcluded(new Set())
    }

    const axisWeeks = items[0]?.recentWeeks ?? []

    const samples = useMemo(
        () => (preview?.samples ?? items.slice(0, 5)).filter((item) => !excluded.has(item.username)),
        [preview?.samples, items, excluded]
    )

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.overdue.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.overdue.description" />
                </Text>
                <Text size="sm" c="orange" mt={4}>
                    <FormattedMessage id="pages.overdue.warningsHint" />
                </Text>
            </div>
            <Card withBorder padding={{ base: "sm", sm: "lg" }} radius="lg">
                <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
                    <div>
                        <Text>
                            <FormattedMessage id="pages.overdue.total" values={{ count: items.length }} />
                        </Text>
                        {excluded.size > 0 && (
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id="pages.overdue.excluded" values={{ count: excluded.size }} />
                            </Text>
                        )}
                    </div>
                    <Button onClick={() => setPreviewOpen(true)} disabled={isLoading || sendCount === 0}>
                        <FormattedMessage id="pages.overdue.notify" />
                    </Button>
                </Flex>
                {items.length > 0 && (
                    <Text size="sm" c="dimmed" mb="sm">
                        <FormattedMessage id="pages.overdue.skipHint" />
                    </Text>
                )}
                <Flex justify="center" mb="md">
                    <Group gap="xs" justify="center" wrap="wrap">
                        <Legend color="noReports" label="pages.heat-map.no-reports" />
                        <Legend color="partialReports" label="pages.heat-map.partial-reports" />
                        <Legend color="fullReports" label="pages.heat-map.full-reports" />
                        <Legend color="overtimeReports" label="pages.heat-map.overtime-reports" />
                        <Legend color="na" label="pages.heat-map.na" />
                        <Legend color="waiting" label="pages.heat-map.pending" />
                    </Group>
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
                    <div>
                        <Flex align="center" gap="sm" mb="sm">
                            <Checkbox
                                checked={allIncluded}
                                indeterminate={someExcluded}
                                onChange={toggleAll}
                                label={<FormattedMessage id="pages.overdue.skip" />}
                            />
                        </Flex>
                        {axisWeeks.length > 0 && (
                            <div className={classes.weekHeader}>
                                {axisWeeks.map((week, index) => (
                                    <span key={week.weekStart} className={classes.weekNum}>
                                        {index + 1}
                                    </span>
                                ))}
                            </div>
                        )}
                        {items.map((item) => (
                            <div
                                key={item.username}
                                className={classes.row}
                                style={{
                                    cursor: "pointer",
                                    opacity: excluded.has(item.username) ? 0.45 : 1,
                                }}
                                onClick={() => openHeatmap(item.username)}
                            >
                                <Flex align="flex-start" gap="sm" mb={8} wrap="wrap">
                                    <div
                                        onClick={(event) => {
                                            event.stopPropagation()
                                        }}
                                    >
                                        <Checkbox
                                            checked={!excluded.has(item.username)}
                                            onChange={() => toggleExclude(item.username)}
                                            aria-label={item.fullName}
                                        />
                                    </div>
                                    <div style={{ minWidth: 180, flex: "1 1 180px" }}>
                                        <Text fw={600}>{item.fullName}</Text>
                                        {(item.warningCount ?? 0) > 0 && (
                                            <Text size="xs" c={(item.warningCount ?? 0) >= 3 ? "red" : "orange"}>
                                                <FormattedMessage
                                                    id="pages.overdue.warnings"
                                                    values={{ count: item.warningCount }}
                                                />
                                            </Text>
                                        )}
                                        <Text size="xs" c="dimmed">
                                            {item.program || item.username}
                                            {formatContractEnd(item.contractEnd) && (
                                                <>
                                                    {" · "}
                                                    <FormattedMessage
                                                        id="pages.overdue.contract"
                                                        values={{ date: formatContractEnd(item.contractEnd) }}
                                                    />
                                                </>
                                            )}
                                        </Text>
                                    </div>
                                    <Flex gap={6} wrap="wrap">
                                        <Badge color={(item.hoursShort ?? 0) >= 20 ? "red" : "gray"}>
                                            {item.hoursRequired
                                                ? `${item.hoursWorked ?? 0}/${item.hoursRequired}`
                                                : item.hoursShort ?? 0}
                                        </Badge>
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
                                        <Text size="xs" c="dimmed">
                                            {item.lastReportWeek
                                                ? dayjs(item.lastReportWeek).format("DD.MM.YYYY")
                                                : "—"}
                                        </Text>
                                    </Flex>
                                </Flex>
                                <div className={classes.weekSquares}>
                                    {(item.recentWeeks ?? []).map((week) => (
                                        <span
                                            key={week.weekStart}
                                            className={`${classes.weekSquare} ${classes[weekTone(week)]}`}
                                            title={`${dayjs(week.weekStart).format("DD.MM.YYYY")}: ${week.hoursWorked}/${week.hoursRequired}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
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
                    <FormattedMessage id="pages.overdue.previewHint" values={{ count: sendCount }} />
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
                {samples.map((item) => (
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
                <Button mt="md" fullWidth loading={isPending} disabled={sendCount === 0} onClick={() => notify()}>
                    <FormattedMessage id="pages.overdue.notifyConfirm" values={{ count: sendCount }} />
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

const Legend: React.FC<{ color: keyof typeof classes; label: string }> = ({ color, label }) => (
    <Flex align="center" gap={6}>
        <span className={`${classes.legendSquare} ${classes[color]}`} />
        <Text size="xs">
            <FormattedMessage id={label} />
        </Text>
    </Flex>
)

export default OverdueReportsPage
