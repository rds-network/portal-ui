import { Box, Flex, Group, Text } from "@mantine/core"
import { VolunteerHeatMapItem } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import React from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { heatmapReportsPath, rememberHeatmapReturn } from "../lib/openWeekReports"
import { locales } from "../lib/locales"
import classes from "./VolunteerReportHeatmap.module.scss"
import { VolunteerRow, WeekInfo } from "./VolunteerRow"

interface Props {
    volunteers: VolunteerHeatMapItem[]
    year: number
    onVolunteerSelect: (id: number) => void
    selectedVolunteers: Set<number>
    totalVolunteers: number
    onNotifyVolunteer?: (username: string, name: string) => void
    warningCounts?: Record<string, number>
    canManageActions?: boolean
    canOpenReports?: boolean
}

export const VolunteerReportHeatmap: React.FC<Props> = ({
    volunteers,
    year,
    onVolunteerSelect,
    selectedVolunteers,
    totalVolunteers,
    onNotifyVolunteer,
    warningCounts = {},
    canManageActions = true,
    canOpenReports = true,
}) => {
    const navigate = useNavigate()
    const startDate = dayjs(new Date(year, 1, 1))
    const endDate = dayjs().year() == year ? dayjs() : dayjs(new Date(year, 12, 31))
    const totalWeeks = volunteers[0]?.weeks.length ?? 0
    const weeks: WeekInfo[] = []
    let weekCursor = startDate.clone()
    for (let i = 0; i < totalWeeks; i++) {
        weeks.push({ date: weekCursor.clone(), weekNumber: i + 1 })
        weekCursor = weekCursor.add(1, "week").startOf("week")
    }

    const openWeekForAll = (weekNumber: number, weekDate: dayjs.Dayjs) => {
        if (!canOpenReports) return
        const meta = volunteers[0]?.weeks.find((item) => item.week === weekNumber)
        const from = meta?.weekStart
            ? dayjs(meta.weekStart).format("YYYY-MM-DD")
            : weekDate.format("YYYY-MM-DD")
        const to = meta?.weekEnd
            ? dayjs(meta.weekEnd).format("YYYY-MM-DD")
            : weekDate.add(6, "day").format("YYYY-MM-DD")
        rememberHeatmapReturn()
        navigate(heatmapReportsPath({ dateFrom: from, dateTo: to }))
    }

    if (volunteers.length === 0) {
        return (
            <Box p="xl" ta="center">
                <Text c="dimmed">
                    <FormattedMessage id={locales.noData} />
                </Text>
            </Box>
        )
    }

    return (
        <Flex className={classes.heatmapContainer}>
            {/* legend */}
            <Flex justify="center" mb="lg">
                <Group gap="xs">
                    <Legend color="noReports" label={locales.noReports} />
                    <Legend color="partialReports" label={locales.partialReports} />
                    <Legend color="fullReports" label={locales.fullReports} />
                    <Legend color="overtimeReports" label={locales.overtimeReports} />
                    <Legend color="na" label={locales.na} />
                    <Legend color="waiting" label={locales.pending} />
                </Group>
            </Flex>

            <div className={classes.heatmapWrapper}>
                <div className={classes.heatmapGrid}>
                    {/* header */}
                    <div className={classes.headerRow}>
                        <div className={classes.headerSpacer} />
                        <div className={classes.weekHeaders}>
                            {weeks.map((w) => (
                                <div
                                    key={w.date.toString()}
                                    className={classes.weekHeader}
                                    style={{ cursor: canOpenReports ? "pointer" : "default" }}
                                    title={canOpenReports ? "Отчёты недели" : undefined}
                                    onClick={() => openWeekForAll(w.weekNumber, w.date)}
                                    onDoubleClick={() => openWeekForAll(w.weekNumber, w.date)}
                                >
                                    <Text size="xs" c="dimmed">
                                        {w.weekNumber}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* rows */}
                    {volunteers.map((v) => (
                        <VolunteerRow
                            key={v.volunteerInfo.id}
                            volunteer={v}
                            weeks={weeks}
                            year={year}
                            isSelected={selectedVolunteers.has(v.volunteerInfo.id)}
                            onVolunteerSelect={onVolunteerSelect}
                            onNotifyVolunteer={onNotifyVolunteer}
                            startDate={startDate}
                            warningCount={warningCounts[v.volunteerInfo.username] ?? 0}
                            canManageActions={canManageActions}
                            canOpenReports={canOpenReports}
                        />
                    ))}
                </div>
            </div>

            <Flex justify="center" mt="lg">
                <Group gap="lg">
                    <Info label={locales.totalVolunteers} value={totalVolunteers} />
                    <Info
                        label={locales.period}
                        value={`${startDate.format("DD.MM.YYYY")} - ${endDate.format("DD.MM.YYYY")}`}
                    />
                    <Info label={locales.totalWeeks} value={totalWeeks} />
                </Group>
            </Flex>
        </Flex>
    )
}

const Legend = ({ color, label }: { color: string; label: string }) => (
    <Flex align="center" gap="xs">
        <Box className={`${classes.legendSquare} ${classes[color]}`} />
        <Text size="xs">
            <FormattedMessage id={label} />
        </Text>
    </Flex>
)

const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Flex align="center" gap="xs">
        <Text size="sm" fw={500}>
            <FormattedMessage id={label} />:
        </Text>
        <Text size="sm" c="dimmed">
            {value}
        </Text>
    </Flex>
)
