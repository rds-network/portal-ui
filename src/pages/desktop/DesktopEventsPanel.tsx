import { ActionIcon, Badge, Button, Flex, Text, Title } from "@mantine/core"
import { DatePicker } from "@mantine/dates"
import { IconChevronLeft, IconChevronRight, IconPencil, IconPlus } from "@tabler/icons-react"
import dayjs from "dayjs"
import React, { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { PortalEventDto } from "src/shared/api/PortalEventApiService"
import { ekomapaLocationLabel, isEkomapaMapUrl } from "src/shared/ekomapa/eventLocation"
import classes from "./DesktopEventsPanel.module.scss"

const EVENT_COLOR: Record<string, string> = {
    CALL: "blue",
    SUBBOTNIK: "teal",
    MEETING: "violet",
    LECTURE: "cyan",
    OTHER: "gray",
}

type Props = {
    events: PortalEventDto[]
    canManage: boolean
    onAdd: () => void
    onEdit: (event: PortalEventDto) => void
}

export const DesktopEventsPanel: React.FC<Props> = ({ events, canManage, onAdd, onEdit }) => {
    const intl = useIntl()
    const [month, setMonth] = useState<Date>(dayjs().startOf("month").toDate())
    const [selectedDay, setSelectedDay] = useState<Date | null>(dayjs().startOf("day").toDate())

    const daysWithEvents = useMemo(() => {
        const set = new Set<string>()
        for (const event of events) {
            set.add(dayjs(event.startsAt).format("YYYY-MM-DD"))
        }
        return set
    }, [events])

    const eventsOnDay = useMemo(() => {
        if (!selectedDay) return []
        const key = dayjs(selectedDay).format("YYYY-MM-DD")
        return events
            .filter((event) => dayjs(event.startsAt).format("YYYY-MM-DD") === key)
            .sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf())
    }, [events, selectedDay])

    const upcomingFallback = useMemo(
        () =>
            events
                .filter((event) => dayjs(event.startsAt).isAfter(dayjs().subtract(2, "hour")))
                .slice(0, 5),
        [events]
    )

    const list = selectedDay ? eventsOnDay : upcomingFallback
    const showingSelectedDay = !!selectedDay

    return (
        <section className={classes.root}>
            <div className={classes.header}>
                <Title order={2} className={classes.title}>
                    <FormattedMessage id="pages.desktop.events" />
                </Title>
                {canManage && (
                    <Button
                        size="compact-sm"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={onAdd}
                    >
                        <FormattedMessage id="pages.desktop.addEvent" />
                    </Button>
                )}
            </div>

            <div className={classes.layout}>
                <aside className={classes.calendarCard}>
                    <div className={classes.calendarHead}>
                        <Text fw={700} c="white">
                            <FormattedMessage id="pages.desktop.eventsCalendarHead" />
                        </Text>
                        <Text size="xs" className={classes.calendarSub}>
                            <FormattedMessage id="pages.desktop.eventsCalendarSub" />
                        </Text>
                    </div>
                    <div className={classes.calendarBody}>
                        <Flex justify="space-between" align="center" mb="sm" gap={6}>
                            <button
                                type="button"
                                className={classes.monthNav}
                                onClick={() => setMonth(dayjs(month).subtract(1, "month").toDate())}
                                aria-label={intl.formatMessage({ id: "pages.desktop.eventsPrevMonth" })}
                            >
                                <IconChevronLeft size={16} />
                            </button>
                            <Text fw={700} ta="center" className={classes.monthLabel}>
                                {dayjs(month).format("MMMM YYYY")}
                            </Text>
                            <button
                                type="button"
                                className={classes.monthNav}
                                onClick={() => setMonth(dayjs(month).add(1, "month").toDate())}
                                aria-label={intl.formatMessage({ id: "pages.desktop.eventsNextMonth" })}
                            >
                                <IconChevronRight size={16} />
                            </button>
                        </Flex>
                        <DatePicker
                            defaultDate={month}
                            key={dayjs(month).format("YYYY-MM")}
                            value={selectedDay}
                            onChange={(value) => setSelectedDay(value)}
                            firstDayOfWeek={1}
                            hideOutsideDates
                            size="sm"
                            className={classes.picker}
                            getDayProps={(date) => {
                                const key = dayjs(date).format("YYYY-MM-DD")
                                const has = daysWithEvents.has(key)
                                return {
                                    className: has ? classes.dayWithEvent : undefined,
                                }
                            }}
                            renderDay={(date) => {
                                const key = dayjs(date).format("YYYY-MM-DD")
                                const has = daysWithEvents.has(key)
                                const day = date.getDate()
                                return (
                                    <div className={classes.dayCell}>
                                        <span>{day}</span>
                                        {has && <span className={classes.dayDot} aria-hidden />}
                                    </div>
                                )
                            }}
                        />
                        <Text size="xs" c="dimmed" mt="sm">
                            <FormattedMessage id="pages.desktop.eventsCalendarHint" />
                        </Text>
                    </div>
                </aside>

                <div className={classes.listPane}>
                    <Text size="sm" fw={600} mb={8}>
                        {showingSelectedDay ? (
                            <FormattedMessage
                                id="pages.desktop.eventsOnDay"
                                values={{ date: dayjs(selectedDay).format("DD MMMM YYYY") }}
                            />
                        ) : (
                            <FormattedMessage id="pages.desktop.eventsUpcoming" />
                        )}
                    </Text>

                    {list.length === 0 ? (
                        <Text className={classes.empty}>
                            {showingSelectedDay ? (
                                <FormattedMessage id="pages.desktop.eventsNoDay" />
                            ) : (
                                <FormattedMessage id="pages.desktop.eventsEmpty" />
                            )}
                        </Text>
                    ) : (
                        <div className={classes.list}>
                            {list.map((event) => {
                                const mapLabel = ekomapaLocationLabel(event.location)
                                const locationIsLink =
                                    !!event.location &&
                                    (/^https?:\/\//i.test(event.location) || isEkomapaMapUrl(event.location))
                                return (
                                    <article key={event.id} className={classes.eventCard}>
                                        <div className={classes.eventWhen}>
                                            <Text fw={700}>{dayjs(event.startsAt).format("D MMM")}</Text>
                                            <Text size="sm" c="dimmed">
                                                {dayjs(event.startsAt).format("HH:mm")}
                                            </Text>
                                        </div>
                                        <div className={classes.eventBody}>
                                            <div className={classes.eventTop}>
                                                <Badge
                                                    color={EVENT_COLOR[event.type] || "gray"}
                                                    variant="light"
                                                    radius="md"
                                                    size="sm"
                                                >
                                                    <FormattedMessage
                                                        id={`pages.desktop.eventType.${event.type}`}
                                                        defaultMessage={event.type}
                                                    />
                                                </Badge>
                                                {canManage && (
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="gray"
                                                        size="sm"
                                                        radius="md"
                                                        aria-label={intl.formatMessage({
                                                            id: "pages.desktop.editEvent",
                                                        })}
                                                        onClick={() => onEdit(event)}
                                                    >
                                                        <IconPencil size={14} />
                                                    </ActionIcon>
                                                )}
                                            </div>
                                            <Text fw={650} mt={6}>
                                                {event.title}
                                            </Text>
                                            {event.description && (
                                                <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                                                    {event.description}
                                                </Text>
                                            )}
                                            {event.location && (
                                                <Text size="xs" c="dimmed" mt={6} lineClamp={1}>
                                                    {mapLabel || event.location}
                                                </Text>
                                            )}
                                            {locationIsLink && (
                                                <a
                                                    className={classes.mapLink}
                                                    href={
                                                        event.location!.startsWith("http")
                                                            ? event.location!
                                                            : `https://${event.location}`
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <FormattedMessage id="pages.desktop.openMap" />
                                                </a>
                                            )}
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
