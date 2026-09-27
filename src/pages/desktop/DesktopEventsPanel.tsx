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
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)

    const daysWithEvents = useMemo(() => {
        const set = new Set<string>()
        for (const event of events) {
            set.add(dayjs(event.startsAt).format("YYYY-MM-DD"))
        }
        return set
    }, [events])

    const upcoming = useMemo(
        () =>
            events
                .filter((event) => dayjs(event.startsAt).isAfter(dayjs().subtract(2, "hour")))
                .sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf()),
        [events]
    )

    const eventsOnDay = useMemo(() => {
        if (!selectedDay) return []
        const key = dayjs(selectedDay).format("YYYY-MM-DD")
        return events
            .filter((event) => dayjs(event.startsAt).format("YYYY-MM-DD") === key)
            .sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf())
    }, [events, selectedDay])

    const list = selectedDay ? eventsOnDay : upcoming
    const showingSelectedDay = !!selectedDay

    const selectDay = (value: Date | null) => {
        if (value && selectedDay && dayjs(value).isSame(selectedDay, "day")) {
            setSelectedDay(null)
            return
        }
        setSelectedDay(value)
    }

    const dayProps = (date: Date) => {
        const key = dayjs(date).format("YYYY-MM-DD")
        const has = daysWithEvents.has(key)
        return { className: has ? classes.dayWithEvent : undefined }
    }

    const renderDay = (date: Date) => {
        const key = dayjs(date).format("YYYY-MM-DD")
        const has = daysWithEvents.has(key)
        return (
            <div className={`${classes.dayCell} ${has ? classes.dayHasEvent : ""}`}>
                <span className={classes.dayNum}>{date.getDate()}</span>
            </div>
        )
    }

    return (
        <section className={classes.root}>
            <div className={classes.header}>
                <Title order={2} className={classes.title}>
                    <FormattedMessage id="pages.desktop.events" />
                </Title>
                {canManage && (
                    <Button
                        size="compact-xs"
                        variant="light"
                        leftSection={<IconPlus size={12} />}
                        onClick={onAdd}
                    >
                        <FormattedMessage id="pages.desktop.addEvent" />
                    </Button>
                )}
            </div>

            <div className={classes.layout}>
                <aside className={classes.calendarCard}>
                    <div className={classes.calendarHead}>
                        <Text fw={700} size="xs" className={classes.calendarHeadTitle}>
                            <FormattedMessage id="pages.desktop.eventsCalendarHead" />
                        </Text>
                        <Text size="xs" className={classes.calendarSub} lineClamp={1}>
                            <FormattedMessage id="pages.desktop.eventsCalendarSub" />
                        </Text>
                    </div>
                    <div className={classes.calendarBody}>
                        <Flex justify="space-between" align="center" mb={2} gap={4}>
                            <button
                                type="button"
                                className={classes.monthNav}
                                onClick={() => setMonth(dayjs(month).subtract(1, "month").toDate())}
                                aria-label={intl.formatMessage({ id: "pages.desktop.eventsPrevMonth" })}
                            >
                                <IconChevronLeft size={12} />
                            </button>
                            <Text fw={650} ta="center" className={classes.monthLabel}>
                                {dayjs(month).format("MMM YYYY")}
                                {" — "}
                                {dayjs(month).add(1, "month").format("MMM YYYY")}
                            </Text>
                            <button
                                type="button"
                                className={classes.monthNav}
                                onClick={() => setMonth(dayjs(month).add(1, "month").toDate())}
                                aria-label={intl.formatMessage({ id: "pages.desktop.eventsNextMonth" })}
                            >
                                <IconChevronRight size={12} />
                            </button>
                        </Flex>
                        <div className={classes.months}>
                            <DatePicker
                                defaultDate={month}
                                key={`${dayjs(month).format("YYYY-MM")}-a`}
                                value={selectedDay}
                                onChange={selectDay}
                                firstDayOfWeek={1}
                                hideOutsideDates
                                size="xs"
                                className={classes.picker}
                                getDayProps={dayProps}
                                renderDay={renderDay}
                            />
                            <DatePicker
                                defaultDate={dayjs(month).add(1, "month").toDate()}
                                key={`${dayjs(month).format("YYYY-MM")}-b`}
                                value={selectedDay}
                                onChange={selectDay}
                                firstDayOfWeek={1}
                                hideOutsideDates
                                size="xs"
                                className={classes.picker}
                                getDayProps={dayProps}
                                renderDay={renderDay}
                            />
                        </div>
                    </div>
                </aside>

                <div className={classes.listPane}>
                    <Text size="xs" fw={650} mb={4} className={classes.listTitle}>
                        {showingSelectedDay ? (
                            <FormattedMessage
                                id="pages.desktop.eventsOnDay"
                                values={{ date: dayjs(selectedDay).format("D MMM YYYY") }}
                            />
                        ) : (
                            <FormattedMessage id="pages.desktop.eventsUpcoming" />
                        )}
                    </Text>

                    <div className={classes.listScroll}>
                        {list.length === 0 ? (
                            <Text className={classes.empty}>
                                {showingSelectedDay ? (
                                    <FormattedMessage id="pages.desktop.eventsNoDay" />
                                ) : (
                                    <FormattedMessage id="pages.desktop.eventsEmpty" />
                                )}
                            </Text>
                        ) : (
                            list.map((event) => {
                                const mapLabel = ekomapaLocationLabel(event.location)
                                const locationIsLink =
                                    !!event.location &&
                                    (/^https?:\/\//i.test(event.location) || isEkomapaMapUrl(event.location))
                                const isNew = dayjs().diff(dayjs(event.createTime), "hour") < 48
                                return (
                                    <article
                                        key={event.id}
                                        className={`${classes.eventCard} ${isNew ? classes.eventNew : ""}`}
                                    >
                                        <div className={classes.eventWhen}>
                                            <span className={classes.eventDay}>
                                                {dayjs(event.startsAt).format("D")}
                                            </span>
                                            <span className={classes.eventMonth}>
                                                {dayjs(event.startsAt).format("MMM")}
                                            </span>
                                            <span className={classes.eventTime}>
                                                {dayjs(event.startsAt).format("HH:mm")}
                                            </span>
                                        </div>
                                        <div className={classes.eventBody}>
                                            <div className={classes.eventTop}>
                                                <Badge
                                                    color={EVENT_COLOR[event.type] || "gray"}
                                                    variant="light"
                                                    radius="sm"
                                                    size="xs"
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
                                                        size="xs"
                                                        radius="sm"
                                                        aria-label={intl.formatMessage({
                                                            id: "pages.desktop.editEvent",
                                                        })}
                                                        onClick={() => onEdit(event)}
                                                    >
                                                        <IconPencil size={12} />
                                                    </ActionIcon>
                                                )}
                                            </div>
                                            <Text className={classes.eventTitle} lineClamp={1}>
                                                {event.title}
                                            </Text>
                                            {(mapLabel || event.location) && (
                                                <Text className={classes.eventMeta} lineClamp={1}>
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
                            })
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
