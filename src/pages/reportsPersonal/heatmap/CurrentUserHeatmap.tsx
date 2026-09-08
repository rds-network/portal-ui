import { Box, Flex, HoverCard, Loader, Text, Title } from "@mantine/core"
import { IconCalendarWeek, IconClockHour4 } from "@tabler/icons-react"
import { HeatMapItem, VolunteerHeatMapItem } from "@rds-network/portal-api-axios"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { ReportHeatMapApiService } from "src/shared/api/ReportHeatMapApiService"
import { locales } from "../lib/constants"
import classes from "./CurrentUserHeatmap.module.scss"

export const CurrentUserHeatmap = ({ className }: { className?: string }) => {
    const intl = useIntl()

    const { data, isLoading, isError } = useQuery({
        queryKey: ["currentUserHeatmap"],
        queryFn: () => ReportHeatMapApiService.getCurrentUserHeatMap().then((response) => response.data),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })

    if (isLoading) {
        return (
            <Flex justify="center" align="center" py="md">
                <Loader />
            </Flex>
        )
    }

    if (isError || !data) {
        return <Flex />
    }

    const getSquareColor = (weekData: HeatMapItem) => {
        if (!weekData) return "na"

        const isCurrentYear = dayjs().year() == dayjs(weekData.weekStart).year()
        const isCurrentWeek = dayjs().isBetween(weekData.weekStart, weekData.weekEnd, "day", "[]")
        const hasReports = weekData.hoursWorked > 0

        if (weekData.hoursRequired === 0) return "na"
        if (isCurrentWeek && isCurrentYear && !hasReports) return "waiting"
        if (weekData.hoursWorked === 0) return "noReports"
        if (weekData.hoursWorked < weekData.hoursRequired) return "partialReports"
        if (weekData.hoursWorked > weekData.hoursRequired) return "overtimeReports"

        return "fullReports"
    }

    const getSquareTooltip = (weekInfo: HeatMapItem) => {
        if (!weekInfo) return ""

        return intl.formatMessage(
            { id: locales.tooltipReports },
            {
                hours: weekInfo.hoursWorked,
                hoursRequired: weekInfo.hoursRequired,
                from: dayjs(weekInfo.weekStart).format("DD.MM.YYYY"),
                to: dayjs(weekInfo.weekEnd).format("DD.MM.YYYY"),
                week: intl.formatMessage({ id: locales.tooltipWeek }, { num: weekInfo.week }),
            }
        )
    }

    const getSquareInfoLabel = (weekInfo: HeatMapItem) => {
        if (!weekInfo) return ""

        const color = getSquareColor(weekInfo)
        const weekLabel = intl.formatMessage({ id: locales.tooltipWeek }, { num: weekInfo.week })
        const params = {
            from: dayjs(weekInfo.weekStart).format("DD.MM.YYYY"),
            to: dayjs(weekInfo.weekEnd).format("DD.MM.YYYY"),
            week: weekLabel,
        }

        if (color === "na") {
            return intl.formatMessage({ id: locales.tooltipNA }, params)
        }
        if (color === "waiting") {
            return intl.formatMessage({ id: locales.tooltipWaiting }, params)
        }

        return getSquareTooltip(weekInfo)
    }

    const getSummaryText = (heatmap: VolunteerHeatMapItem) => {
        if (heatmap.totalRequired === undefined || heatmap.totalWorked === undefined) {
            return ""
        }
        const h = intl.formatMessage({ id: locales.hours })
        const sign = heatmap.totalWorked - heatmap.totalRequired > 0 ? "+" : ""
        const showDiff = heatmap.totalRequired != heatmap.totalWorked
        let summary = `${heatmap.totalWorked} / ${heatmap.totalRequired} ${h}`
        if (showDiff) {
            summary += ` (${sign}${heatmap.totalWorked - heatmap.totalRequired})`
        }
        return summary
    }

    const now = dayjs()
    const visibleYears = Object.entries(data).filter(([year]) => now.month() < 6 || Number(year) >= now.year())

    return (
        <Flex direction="column" gap="xs" className={`${classes.root} ${className || ""}`}>
            <Flex align="center" gap="sm" mb="sm">
                <IconCalendarWeek size={20} color="var(--portal-accent)" />
                <Title order={2} size="h4">
                    <FormattedMessage id="design.activity" />
                </Title>
            </Flex>
            <Text size="sm" c="dimmed">
                <FormattedMessage id={locales.heatmapDescription} />
            </Text>
            <Flex gap="md" wrap="wrap" className={classes.legend}>
                <Flex align="center" gap={4}>
                    <Box className={`${classes.legendSquare} ${classes.noReports}`} />
                    <Text size="xs">
                        <FormattedMessage id={locales.noReports} />
                    </Text>
                </Flex>

                <Flex align="center" gap={4}>
                    <Box className={`${classes.legendSquare} ${classes.partialReports}`} />
                    <Text size="xs">
                        <FormattedMessage id={locales.partialReports} />
                    </Text>
                </Flex>

                <Flex align="center" gap={4}>
                    <Box className={`${classes.legendSquare} ${classes.fullReports}`} />
                    <Text size="xs">
                        <FormattedMessage id={locales.fullReports} />
                    </Text>
                </Flex>

                <Flex align="center" gap={4}>
                    <Box className={`${classes.legendSquare} ${classes.overtimeReports}`} />
                    <Text size="xs">
                        <FormattedMessage id={locales.overtimeReports} />
                    </Text>
                </Flex>

                <Flex align="center" gap={4}>
                    <Box className={`${classes.legendSquare} ${classes.na}`} />
                    <Text size="xs">N/A</Text>
                </Flex>
            </Flex>

            <Flex direction="column" rowGap="md">
                {visibleYears.map(([year, heatmap]) => (
                    <Flex direction="column" key={year} className={classes.year}>
                        <Flex direction="row" align="center" justify="space-between" mb="sm">
                            <Text fw="bold" size="xl">
                                {year}
                            </Text>
                            <Text c="dimmed" size="xs">
                                {getSummaryText(heatmap)}
                            </Text>
                        </Flex>
                        <div className={classes.summary}>
                            <div>
                                <Text className={classes.hours}>
                                    {heatmap.totalWorked ?? 0}
                                    <span>
                                        <FormattedMessage id={locales.hours} />
                                    </span>
                                </Text>
                                <Text size="xs" c="dimmed">
                                    <FormattedMessage
                                        id="design.hoursRequired"
                                        values={{ hours: heatmap.totalRequired ?? 0 }}
                                    />
                                </Text>
                            </div>
                            <div
                                className={classes.orbit}
                                style={
                                    {
                                        "--progress": `${Math.min(100, Math.max(0, heatmap.totalRequired ? ((heatmap.totalWorked ?? 0) / heatmap.totalRequired) * 100 : 0))}%`,
                                    } as React.CSSProperties
                                }
                                aria-hidden="true"
                            >
                                <IconClockHour4 size={26} stroke={1.5} />
                            </div>
                        </div>
                        <Flex gap={4} wrap="wrap" className={classes.weeksRow}>
                            {heatmap.weeks.map((weekItem) => (
                                <HoverCard
                                    key={weekItem.week}
                                    position="top"
                                    withArrow
                                    shadow="md"
                                    openDelay={0}
                                    closeDelay={100}
                                    withinPortal
                                >
                                    <HoverCard.Target>
                                        <Box
                                            tabIndex={0}
                                            aria-label={getSquareInfoLabel(weekItem)}
                                            title={getSquareInfoLabel(weekItem)}
                                            className={`${classes.weekSquare} ${classes[getSquareColor(weekItem)]}`}
                                        >
                                            <Text size="xs" fw={500} className={classes.weekNumber}>
                                                {weekItem.week}
                                            </Text>
                                        </Box>
                                    </HoverCard.Target>
                                    <HoverCard.Dropdown
                                        style={{
                                            maxWidth: "min(86vw, 420px)",
                                            overflowWrap: "anywhere",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        <Text size="xs" style={{ whiteSpace: "normal", lineHeight: 1.35 }}>
                                            {getSquareInfoLabel(weekItem)}
                                        </Text>
                                    </HoverCard.Dropdown>
                                </HoverCard>
                            ))}
                        </Flex>
                    </Flex>
                ))}
            </Flex>
        </Flex>
    )
}
