import { Avatar, Badge, Box, Button, Checkbox, Flex, HoverCard, Text } from "@mantine/core"
import { VolunteerHeatMapItem } from "@rds-network/portal-api-axios"
import { IconCheckupList, IconMessage2Exclamation, IconUser } from "@tabler/icons-react"
import dayjs, { Dayjs } from "dayjs"
import React, { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { getTicketBody } from "src/pages/heatmap/lib/ticket"
import { TicketGroupTarget } from "src/shared/ui/ticketModal/lib/groupTarget"
import TicketModal from "src/shared/ui/ticketModal/TicketModal"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { locales } from "../lib/locales"
import classes from "./VolunteerReportHeatmap.module.scss"

export interface WeekInfo {
    date: dayjs.Dayjs
    weekNumber: number
}

interface VolunteerRowProps {
    volunteer: VolunteerHeatMapItem
    weeks: WeekInfo[]
    year: number
    isSelected: boolean
    onVolunteerSelect: (volunteerId: number) => void
    startDate: Dayjs
}

const VolunteerRowComponent: React.FC<VolunteerRowProps> = ({
    volunteer,
    weeks,
    year,
    isSelected,
    onVolunteerSelect,
    startDate,
}) => {
    const intl = useIntl()
    const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false)

    // Map weekNumber -> weekInfo
    const weekByNumber = useMemo(() => {
        const map = new Map<number, (typeof volunteer.weeks)[number]>()
        for (const w of volunteer.weeks) map.set(w.week, w)
        return map
    }, [volunteer.weeks])

    const getProgramDescription = (): string => {
        const program = volunteer.volunteerInfo.program
            ? getLocalizedName(volunteer.volunteerInfo.program, intl.locale)
            : null
        const project = volunteer.volunteerInfo.project
            ? getLocalizedName(volunteer.volunteerInfo.project, intl.locale)
            : null

        if (program && project) {
            if (program === project) return program
            return `${program} • ${project}`
        }
        if (program) return program
        return ""
    }

    const getVolunteerStatusColor = () => {
        if (volunteer.totalRequired == 0) return "gray"
        if (volunteer.totalWorked!! < volunteer.totalRequired!!) return "red"
        return "green"
    }

    const getVolunteerStatusText = () => {
        if (volunteer.totalRequired == 0) return "N/A"
        const hoursDiff = volunteer.totalRequired!! - volunteer.totalWorked!!
        if (hoursDiff > 0) return intl.formatMessage({ id: locales.statusMissedWeeks }, { count: hoursDiff })
        return intl.formatMessage({ id: locales.statusAllOk })
    }

    const statusColor = getVolunteerStatusColor()
    const statusText = getVolunteerStatusText()

    const getSquareColor = (weekNumber: number) => {
        const weekData = weekByNumber.get(weekNumber)
        if (!weekData) return "na"

        const isCurrentYear = dayjs().year() == year
        const isCurrentWeek = dayjs().isBetween(weekData.weekStart, weekData.weekEnd, "day", "[]")
        const hasReports = weekData.hoursWorked > 0

        if (weekData.hoursRequired === 0) return "na"
        if (isCurrentWeek && isCurrentYear && !hasReports) return "waiting"
        if (weekData.hoursWorked === 0) return "noReports"
        if (weekData.hoursWorked < weekData.hoursRequired) return "partialReports"
        if (weekData.hoursWorked > weekData.hoursRequired) return "overtimeReports"

        return "fullReports"
    }

    const getSquareTooltip = (weekNumber: number) => {
        const weekData = weekByNumber.get(weekNumber)
        if (!weekData) return ""

        return intl.formatMessage(
            { id: locales.tooltipReports },
            {
                name: volunteer.volunteerInfo.fullName,
                hours: weekData.hoursWorked,
                hoursRequired: weekData.hoursRequired,
                hoursLabel: intl.formatMessage({ id: locales.hours }),
                from: dayjs(weekData.weekStart).format("DD.MM.YYYY"),
                to: dayjs(weekData.weekEnd).format("DD.MM.YYYY"),
                week: intl.formatMessage({ id: locales.tooltipWeek }, { num: weekNumber }),
            }
        )
    }

    const getSquareInfoLabel = (weekNumber: number) => {
        const weekData = weekByNumber.get(weekNumber)
        if (!weekData) return ""

        const color = getSquareColor(weekNumber)
        const params = {
            name: volunteer.volunteerInfo.fullName,
            from: dayjs(weekData.weekStart).format("DD.MM.YYYY"),
            to: dayjs(weekData.weekEnd).format("DD.MM.YYYY"),
            week: intl.formatMessage({ id: locales.tooltipWeek }, { num: weekNumber }),
        }

        if (color === "na") return intl.formatMessage({ id: locales.tooltipNA }, params)
        if (color === "waiting") return intl.formatMessage({ id: locales.tooltipWaiting }, params)

        return getSquareTooltip(weekNumber)
    }

    const ticketBodyHtml = useMemo(() => {
        return getTicketBody({
            startDate,
            required: volunteer.totalRequired ?? 0,
            worked: volunteer.totalWorked ?? 0,
        })
    }, [volunteer.volunteerInfo.fullName, volunteer.totalRequired, volunteer.totalWorked, startDate])

    return (
        <div className={classes.volunteerRow}>
            <TicketModal
                opened={ticketDrawerOpen}
                close={() => setTicketDrawerOpen(false)}
                toUser={volunteer.volunteerInfo}
                title="Запрос информации по отчётным часам"
                body={ticketBodyHtml}
                groupTarget={TicketGroupTarget.CURATOR} // по умолчанию назначаем на куратора
            />

            <div className={classes.volunteerInfo}>
                <div className={classes.volunteerHeader}>
                    <Flex align="center" gap="sm" style={{ minWidth: 0 }}>
                        <Checkbox checked={isSelected} onChange={() => onVolunteerSelect(volunteer.volunteerInfo.id)} />

                        <Flex align="center" gap="sm" style={{ minWidth: 0, cursor: "default" }}>
                            <Avatar
                                size={28}
                                src={volunteer.volunteerInfo.avatar?.link}
                                name={volunteer.volunteerInfo.fullName}
                                style={{ cursor: "pointer" }}
                                onClick={() => window.open(`/profile/${volunteer.volunteerInfo.username}`, "_blank")}
                            />

                            <HoverCard shadow="md" position="right" withArrow>
                                <HoverCard.Target>
                                    <div style={{ minWidth: 0 }}>
                                        <Text
                                            size="sm"
                                            fw={500}
                                            className={`${classes.volunteerName} ${isSelected ? classes.selectedVolunteer : ""}`}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => onVolunteerSelect(volunteer.volunteerInfo.id)}
                                        >
                                            {volunteer.volunteerInfo.fullName}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {getProgramDescription()}
                                        </Text>
                                    </div>
                                </HoverCard.Target>

                                <HoverCard.Dropdown>
                                    <Flex direction="column" gap="sm">
                                        <Text size="s" fw={600}>
                                            {volunteer.volunteerInfo.fullName}
                                        </Text>

                                        <Text size="xs">
                                            <FormattedMessage id={locales.totalHours} />: {volunteer.totalWorked} •{" "}
                                            <FormattedMessage id={locales.requiredHoursForPeriod} />:{" "}
                                            {volunteer.totalRequired}
                                        </Text>

                                        <Badge size="xs" color={statusColor} variant="light">
                                            {statusText}
                                        </Badge>

                                        <Flex gap="xs">
                                            <Button
                                                variant="outline"
                                                leftSection={<IconUser size={16} />}
                                                onClick={() =>
                                                    window.open(
                                                        `/profile/${volunteer.volunteerInfo.username}`,
                                                        "_blank"
                                                    )
                                                }
                                            >
                                                <FormattedMessage id={locales.profile} />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                leftSection={<IconCheckupList size={16} />}
                                                onClick={() =>
                                                    window.open(
                                                        `/reports?login=${volunteer.volunteerInfo.username}`,
                                                        "_blank"
                                                    )
                                                }
                                            >
                                                <FormattedMessage id={locales.reports} />
                                            </Button>
                                        </Flex>

                                        <Button
                                            leftSection={<IconMessage2Exclamation size={16} />}
                                            onClick={() => setTicketDrawerOpen(true)}
                                        >
                                            <FormattedMessage id={locales.ticket} />
                                        </Button>
                                    </Flex>
                                </HoverCard.Dropdown>
                            </HoverCard>
                        </Flex>
                    </Flex>

                    <Badge size="xs" variant="filled" color={statusColor}>
                        {volunteer.totalRequired === 0 ? "N/A" : `${volunteer.totalWorked}/${volunteer.totalRequired}`}
                    </Badge>
                </div>
            </div>

            <div className={classes.weekSquares}>
                {weeks.map((week) => (
                    <HoverCard key={week.weekNumber} position="top" withArrow shadow="md" withinPortal>
                        <HoverCard.Target>
                            <Box
                                className={`${classes.weekSquare} ${classes[getSquareColor(week.weekNumber)]}`}
                                style={{ cursor: "pointer" }}
                            />
                        </HoverCard.Target>

                        <HoverCard.Dropdown>
                            <Text size="xs">{getSquareInfoLabel(week.weekNumber)}</Text>
                        </HoverCard.Dropdown>
                    </HoverCard>
                ))}
            </div>
        </div>
    )
}

export const VolunteerRow = React.memo(VolunteerRowComponent)
