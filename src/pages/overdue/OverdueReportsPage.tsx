import { Badge, Button, Card, Flex, Group, Loader, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useMemo } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { InboxApiService, OverdueNoticePersonDto, OverdueWeekDto, ReportOverdueDto } from "src/shared/api/InboxApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { downloadCsv } from "src/shared/utils/downloadCsv"
import { formatContractEnd } from "src/shared/utils/latestContractEnd"
import classes from "./OverdueReportsPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

const thisMonday = () => dayjs().startOf("isoWeek").format("YYYY-MM-DD")

const weekTone = (week: OverdueWeekDto) => {
    const current = week.weekStart === thisMonday()
    if ((week.leaveDays ?? 0) > 0 && !week.hoursRequired) return "leave"
    if (current && week.hoursWorked === 0) return "waiting"
    if (!week.hoursRequired) return "na"
    if (week.hoursWorked === 0) return "noReports"
    if (week.hoursWorked < week.hoursRequired) return "partialReports"
    if (week.hoursWorked > week.hoursRequired) return "overtimeReports"
    return "fullReports"
}

const hasOvertime = (item: ReportOverdueDto) => {
    const short = item.hoursShort ?? 0
    if (short > 0) return false
    const required = item.hoursRequired ?? 0
    if (!required) return false
    return (item.hoursWorked ?? 0) > required
}

const overdueSortKey = (item: ReportOverdueDto) => {
    const warnings = item.warningCount ?? 0
    const short = item.hoursShort ?? 0
    const weeks = item.weeksMissed ?? 0
    // deficit first (0), then zero, overtime last (2)
    const band = short > 0 ? 0 : hasOvertime(item) ? 2 : 1
    return { warnings, band, short, weeks }
}

const compareOverdue = (a: ReportOverdueDto, b: ReportOverdueDto) => {
    const left = overdueSortKey(a)
    const right = overdueSortKey(b)
    if (right.warnings !== left.warnings) return right.warnings - left.warnings
    if (left.band !== right.band) return left.band - right.band
    if (right.short !== left.short) return right.short - left.short
    if (right.weeks !== left.weeks) return right.weeks - left.weeks
    return (a.fullName || a.username).localeCompare(b.fullName || b.username, "ru")
}

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

    const { data: items = [], isFetching, isLoading } = useQuery({
        queryKey: ["report-overdue"],
        queryFn: () => InboxApiService.overdue(),
    })

    const exportNotices = (people: OverdueNoticePersonDto[], filename: string) => {
        downloadCsv(filename, [
            ["ФИО", "Логин", "Программа", "Предупреждений", "Уведомлён", "Чёрный список", "МУП", "Последняя рассылка"],
            ...people.map((person) => [
                person.fullName,
                person.username,
                person.program,
                person.warningCount,
                person.notified ? "да" : "нет",
                person.watchlist ? "да" : "нет",
                person.mupSent ? "да" : "нет",
                person.lastSentAt ? dayjs(person.lastSentAt).format("DD.MM.YYYY HH:mm") : "",
            ]),
        ])
    }

    const { mutate: cancelWarning, isPending: cancelling } = useMutation({
        mutationFn: (username: string) =>
            InboxApiService.cancelOverdueWarning(username, {
                reason: "Снято администратором: отчёты не успели проверить",
            }),
        onSuccess: (result) => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage
                            id="pages.overdue.cancelWarningDone"
                            values={{ count: result.warningCount }}
                        />
                    </Text>,
                    null
                )
            )
            queryClient.invalidateQueries({ queryKey: ["report-overdue"] })
            queryClient.invalidateQueries({ queryKey: ["report-overdue-notices"] })
            queryClient.invalidateQueries({ queryKey: ["overdue-counts"] })
            queryClient.invalidateQueries({ queryKey: ["overdue-warnings"] })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
            queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
        },
    })

    const { data: ledger = [] } = useQuery({
        queryKey: ["report-overdue-notices"],
        queryFn: () => InboxApiService.overdueNotices(),
    })

    const openHeatmap = (username: string) => {
        navigate(`/volunteers/heatmap?search=${encodeURIComponent(username)}`)
    }

    const sortedItems = useMemo(() => [...items].sort(compareOverdue), [items])

    const axisWeeks = useMemo(() => {
        const best = sortedItems.reduce<OverdueWeekDto[]>(
            (acc, item) => ((item.recentWeeks?.length ?? 0) > acc.length ? item.recentWeeks ?? acc : acc),
            []
        )
        return best
    }, [sortedItems])

    const weekGridStyle = useMemo(
        () =>
            axisWeeks.length > 0
                ? { gridTemplateColumns: `repeat(${axisWeeks.length}, 20px)` }
                : undefined,
        [axisWeeks.length]
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
                <Text size="sm" c="dimmed" mt={4}>
                    <FormattedMessage id="pages.overdue.cancelWarningHint" />
                </Text>
            </div>
            <Card withBorder p="md" radius="lg">
                <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
                    <div>
                        <Text>
                            <FormattedMessage id="pages.overdue.total" values={{ count: items.length }} />
                        </Text>
                    </div>
                    <Group gap="sm">
                        <Button
                            variant="light"
                            onClick={() =>
                                exportNotices(ledger, `overdue-ledger-${dayjs().format("YYYY-MM-DD")}.csv`)
                            }
                            disabled={ledger.length === 0}
                        >
                            <FormattedMessage id="pages.overdue.export" />
                        </Button>
                    </Group>
                </Flex>
                <Flex justify="center" mb="md">
                    <Group gap="xs" justify="center" wrap="wrap">
                        <Legend color="noReports" label="pages.heat-map.no-reports" />
                        <Legend color="partialReports" label="pages.heat-map.partial-reports" />
                        <Legend color="fullReports" label="pages.heat-map.full-reports" />
                        <Legend color="overtimeReports" label="pages.heat-map.overtime-reports" />
                        <Legend color="leave" label="pages.heat-map.leave" />
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
                        {axisWeeks.length > 0 && (
                            <div className={classes.weekHeader} style={weekGridStyle}>
                                {axisWeeks.map((week, index) => (
                                    <span key={week.weekStart} className={classes.weekNum}>
                                        {index + 1}
                                    </span>
                                ))}
                            </div>
                        )}
                        {sortedItems.map((item) => (
                            <div
                                key={item.username}
                                className={classes.row}
                                style={{ cursor: "pointer" }}
                                onClick={() => openHeatmap(item.username)}
                            >
                                <div className={classes.meta}>
                                    <div className={classes.person}>
                                        <Text fw={600}>{item.fullName}</Text>
                                        <Group gap={6} mt={4}>
                                            {(item.warningCount ?? 0) > 0 && (
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={(item.warningCount ?? 0) >= 3 ? "red" : "orange"}
                                                >
                                                    <FormattedMessage
                                                        id="pages.overdue.notified"
                                                        values={{ count: item.warningCount }}
                                                    />
                                                </Badge>
                                            )}
                                            {(item.watchlist || (item.warningCount ?? 0) >= 2) && (
                                                <Badge size="sm" color="dark">
                                                    <FormattedMessage id="pages.overdue.watchlist" />
                                                </Badge>
                                            )}
                                        </Group>
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
                                    <div className={classes.stats}>
                                        <div className={classes.statHours}>
                                            <Badge color={(item.hoursShort ?? 0) > 0 ? "red" : "gray"}>
                                                {item.hoursRequired
                                                    ? `${item.hoursWorked ?? 0}/${item.hoursRequired}`
                                                    : item.hoursShort ?? 0}
                                            </Badge>
                                        </div>
                                        <div className={classes.statShort}>
                                            {(item.hoursShort ?? 0) > 0 ? (
                                                <FormattedMessage
                                                    id="pages.heat-map.status-text-missed-weeks"
                                                    values={{ count: item.hoursShort }}
                                                />
                                            ) : (
                                                "\u00a0"
                                            )}
                                        </div>
                                        <div className={classes.statWeeks}>
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
                                        </div>
                                        <div className={classes.statDate}>
                                            {item.lastReportWeek
                                                ? dayjs(item.lastReportWeek).format("DD.MM.YYYY")
                                                : "—"}
                                        </div>
                                        <div className={classes.statAction}>
                                            {(item.warningCount ?? 0) > 0 ? (
                                                <Button
                                                    size="compact-xs"
                                                    variant="light"
                                                    color="orange"
                                                    loading={cancelling}
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        cancelWarning(item.username)
                                                    }}
                                                >
                                                    <FormattedMessage id="pages.overdue.cancelWarning" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className={classes.weekSquares} style={weekGridStyle}>
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
