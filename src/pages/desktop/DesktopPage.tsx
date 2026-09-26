import { Badge, Button, Flex, Modal, Select, Text, Textarea, TextInput, Title } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconExternalLink, IconPlus } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { CurrentUserHeatmap } from "src/pages/reportsPersonal/heatmap/CurrentUserHeatmap"
import { defaultFilter, defaultPage, defaultPageResponse } from "src/pages/reportsPersonal/lib/constants"
import { defaultUser } from "src/pages/reports/lib/defaults"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { PortalEventApiService, PortalEventType } from "src/shared/api/PortalEventApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { fetchProjectFeed } from "src/shared/api/ProjectFeedApi"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { WorkAssignmentApiService } from "src/shared/api/WorkAssignmentApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { ekomapaLocationLabel, isEkomapaMapUrl, normalizeEventLocation } from "src/shared/ekomapa/eventLocation"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ReportCard } from "src/shared/ui/reportCard/ReportCard"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./DesktopPage.module.scss"

const STATUS_COLOR: Record<string, string> = {
    TODO: "gray",
    DOING: "blue",
    REVIEW: "yellow",
    REDO: "orange",
    DONE: "green",
}

const EVENT_COLOR: Record<string, string> = {
    CALL: "blue",
    SUBBOTNIK: "teal",
    MEETING: "violet",
    LECTURE: "cyan",
    OTHER: "gray",
}

const ACTIVE_TASK_STATUSES = new Set(["TODO", "DOING", "REVIEW", "REDO"])
const MANAGER_ROLES = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.ADMIN_SSO, UserGroup.MAIN_VOLUNTEER]

export const DesktopPage: React.FC = () => {
    setDocumentTitleByLocale("pages.desktop.title")
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { programs, projects } = useProgramProjectFilter(null, null)
    const [eventOpen, setEventOpen] = useState(false)

    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })
    const canManageEvents = hasPermission(user, MANAGER_ROLES) || !!curatorMe?.curator

    const reportFilter = useMemo(
        () => ({ ...defaultFilter, login: user?.username || null }),
        [user?.username]
    )

    const { data: reportsResponse } = useQuery({
        enabled: !!user?.username,
        queryKey: ["desktop-reports", user?.username],
        initialData: { page: defaultPageResponse, content: [] },
        queryFn: () =>
            ReportApiService.getReports({ ...defaultPage, pageSize: 3 }, reportFilter).then((r) => r.data),
    })

    const reports = reportsResponse.content
    const { data: users = {} } = resolveUsers(
        reports.flatMap((report) => [report.user, report.moderator].filter(Boolean) as string[])
    )

    const { data: assignments = [] } = useQuery({
        queryKey: ["work-assignments"],
        queryFn: () => WorkAssignmentApiService.list(),
    })

    const myTasks = useMemo(() => {
        const mine = assignments.filter(
            (item) =>
                item.assignee === user?.username && ACTIVE_TASK_STATUSES.has(String(item.status).toUpperCase())
        )
        return mine.slice(0, 5)
    }, [assignments, user?.username])

    const { data: threads = [] } = useQuery({
        queryKey: ["inbox"],
        queryFn: () => InboxApiService.list(),
    })

    const recentMessages = useMemo(() => {
        const sorted = [...threads].sort((a, b) => {
            if (a.unread !== b.unread) return a.unread ? -1 : 1
            return dayjs(b.createTime).valueOf() - dayjs(a.createTime).valueOf()
        })
        return sorted.slice(0, 4)
    }, [threads])

    const { data: events = [] } = useQuery({
        queryKey: ["portal-events", "upcoming"],
        queryFn: () => PortalEventApiService.list(true, 6),
    })

    const { data: projectFeed = [] } = useQuery({
        queryKey: ["project-feed"],
        queryFn: () => fetchProjectFeed(),
        staleTime: 5 * 60 * 1000,
    })

    const eventForm = useForm({
        initialValues: {
            title: "",
            description: "",
            startsAt: null as Date | null,
            time: "12:00",
            location: "",
            type: "MEETING" as PortalEventType,
            programCode: curatorMe?.programs?.[0] || "",
        },
        validate: {
            title: (value) =>
                value.trim().length < 3 ? intl.formatMessage({ id: "pages.desktop.eventRequired" }) : null,
            startsAt: (value) => (!value ? intl.formatMessage({ id: "pages.desktop.eventRequired" }) : null),
        },
    })

    const { mutate: createEvent, isPending: creatingEvent } = useMutation({
        mutationFn: PortalEventApiService.create,
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.desktop.eventCreated" />
                    </Text>,
                    null
                )
            )
            eventForm.reset()
            setEventOpen(false)
            queryClient.invalidateQueries({ queryKey: ["portal-events"] })
        },
    })

    return (
        <Flex className={classes.root} direction="column">
            <div className={classes.header}>
                <div>
                    <Text className={classes.eyebrow}>
                        <FormattedMessage id="design.workspace" />
                    </Text>
                    <Title order={1} className={classes.title}>
                        <FormattedMessage id="pages.desktop.title" />
                    </Title>
                    <Text className={classes.subtitle}>
                        <FormattedMessage id="pages.desktop.subtitle" />
                    </Text>
                </div>
                <Button
                    color="ocean.7"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => navigate("/report/create")}
                >
                    <FormattedMessage id="pages.my-reports.new-report" />
                </Button>
            </div>

            <div className={classes.grid}>
                <section className={classes.heatmap}>
                    <CurrentUserHeatmap compact />
                </section>

                <section className={classes.card}>
                    <div className={classes.cardHeader}>
                        <Title order={2} className={classes.cardTitle}>
                            <FormattedMessage id="pages.desktop.reports" />
                        </Title>
                        <Link className={classes.cardLink} to="/reports/personal">
                            <FormattedMessage id="pages.desktop.allReports" />
                        </Link>
                    </div>
                    <div className={classes.list}>
                        {reports.length === 0 && (
                            <Text className={classes.empty}>
                                <FormattedMessage id="pages.my-reports.empty-reports" />
                            </Text>
                        )}
                        {reports.map((report) => {
                            const creator =
                                (report.user && users[report.user]) || user || defaultUser(report.user || "")
                            const program = programs.find((p) => p.code === report.program)
                            const project = projects.find((p) => p.code === report.project)
                            return (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    creator={creator}
                                    moderator={
                                        report.moderator
                                            ? users[report.moderator] || defaultUser(report.moderator)
                                            : null
                                    }
                                    programName={
                                        program
                                            ? getLocalizedName(program, intl.locale)
                                            : intl.formatMessage({ id: "pages.user-list.no-program" })
                                    }
                                    projectName={
                                        project
                                            ? getLocalizedName(project, intl.locale)
                                            : intl.formatMessage({ id: "pages.user-list.no-project" })
                                    }
                                    currentUser={user}
                                    hideVolunteer
                                    onOpen={() => navigate(`/report/${report.id}`)}
                                />
                            )
                        })}
                    </div>
                </section>

                <section className={classes.card}>
                    <div className={classes.cardHeader}>
                        <Title order={2} className={classes.cardTitle}>
                            <FormattedMessage id="pages.desktop.tasks" />
                        </Title>
                        <Link className={classes.cardLink} to="/tasks">
                            <FormattedMessage id="pages.desktop.openBoard" />
                        </Link>
                    </div>
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id="pages.desktop.tasksHint" />
                    </Text>
                    <div className={classes.list}>
                        {myTasks.length === 0 && (
                            <Text className={classes.empty}>
                                <FormattedMessage id="pages.desktop.tasksEmpty" />
                            </Text>
                        )}
                        {myTasks.map((task) => (
                            <button
                                key={task.id}
                                type="button"
                                className={classes.row}
                                onClick={() => navigate("/tasks")}
                            >
                                <div className={classes.rowBody}>
                                    <Text fw={600} lineClamp={1}>
                                        {task.title}
                                    </Text>
                                    <Text className={classes.rowMeta} lineClamp={1}>
                                        {task.customerName || task.customer || "—"}
                                        {task.dueDate ? ` · ${dayjs(task.dueDate).format("DD MMM")}` : ""}
                                    </Text>
                                </div>
                                <Badge
                                    color={STATUS_COLOR[String(task.status).toUpperCase()] || "gray"}
                                    variant="light"
                                    radius="md"
                                >
                                    <FormattedMessage
                                        id={`pages.tasks.status.${String(task.status).toUpperCase()}`}
                                        defaultMessage={String(task.status)}
                                    />
                                </Badge>
                            </button>
                        ))}
                    </div>
                </section>

                <section className={classes.card}>
                    <div className={classes.cardHeader}>
                        <Title order={2} className={classes.cardTitle}>
                            <FormattedMessage id="pages.desktop.messages" />
                        </Title>
                        <Link className={classes.cardLink} to="/messages">
                            <FormattedMessage id="pages.desktop.allMessages" />
                        </Link>
                    </div>
                    <div className={classes.list}>
                        {recentMessages.length === 0 && (
                            <Text className={classes.empty}>
                                <FormattedMessage id="pages.messages.empty" />
                            </Text>
                        )}
                        {recentMessages.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={classes.row}
                                onClick={() => navigate("/messages")}
                            >
                                <div className={classes.rowBody}>
                                    <Text fw={item.unread ? 700 : 500} lineClamp={1}>
                                        {item.subject}
                                    </Text>
                                    <Text className={classes.rowMeta} lineClamp={1}>
                                        {item.lastBody || item.counterpartName || item.counterpart || "—"}
                                    </Text>
                                </div>
                                {item.unread && (
                                    <Badge color="ocean" variant="filled" radius="md" size="sm">
                                        <FormattedMessage id="pages.messages.new" />
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                <section className={classes.card}>
                    <div className={classes.cardHeader}>
                        <Title order={2} className={classes.cardTitle}>
                            <FormattedMessage id="pages.desktop.events" />
                        </Title>
                        {canManageEvents && (
                            <Button
                                size="compact-sm"
                                variant="light"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => setEventOpen(true)}
                            >
                                <FormattedMessage id="pages.desktop.addEvent" />
                            </Button>
                        )}
                    </div>
                    <div className={classes.list}>
                        {events.length === 0 && (
                            <Text className={classes.empty}>
                                <FormattedMessage id="pages.desktop.eventsEmpty" />
                            </Text>
                        )}
                        {events.map((event) => {
                            const mapLabel = ekomapaLocationLabel(event.location)
                            const locationIsLink =
                                !!event.location &&
                                (/^https?:\/\//i.test(event.location) || isEkomapaMapUrl(event.location))
                            return (
                                <div key={event.id} className={classes.row}>
                                    <div className={classes.rowBody}>
                                        <Text fw={600} lineClamp={1}>
                                            {event.title}
                                        </Text>
                                        <Text className={classes.rowMeta} lineClamp={1}>
                                            {dayjs(event.startsAt).format("DD MMM YYYY · HH:mm")}
                                            {event.location
                                                ? ` · ${mapLabel || event.location}`
                                                : ""}
                                        </Text>
                                        {locationIsLink && (
                                            <a
                                                className={classes.cardLink}
                                                href={
                                                    event.location!.startsWith("http")
                                                        ? event.location!
                                                        : `https://${event.location}`
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <FormattedMessage id="pages.desktop.openMap" />
                                            </a>
                                        )}
                                    </div>
                                    <Badge color={EVENT_COLOR[event.type] || "gray"} variant="light" radius="md">
                                        <FormattedMessage
                                            id={`pages.desktop.eventType.${event.type}`}
                                            defaultMessage={event.type}
                                        />
                                    </Badge>
                                </div>
                            )
                        })}
                    </div>
                </section>

                <section className={`${classes.card} ${classes.full}`}>
                    <div className={classes.cardHeader}>
                        <div>
                            <Title order={2} className={classes.cardTitle}>
                                <FormattedMessage id="pages.desktop.projects" />
                            </Title>
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id="pages.desktop.projectsHint" />
                            </Text>
                        </div>
                    </div>
                    {projectFeed.length === 0 ? (
                        <Text className={classes.empty}>
                            <FormattedMessage id="pages.desktop.projectsEmpty" />
                        </Text>
                    ) : (
                        <div className={classes.projectGrid}>
                            {projectFeed.map((item) => (
                                <a
                                    key={`${item.source}-${item.url}`}
                                    className={`${classes.projectCard} ${classes[`source_${item.source}`]}`}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Text className={classes.projectTag}>{item.tag}</Text>
                                    <Text fw={650} lineClamp={3} className={classes.projectTitle}>
                                        {item.title}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {item.subtitle}
                                    </Text>
                                    <Text className={classes.projectLink}>
                                        <FormattedMessage id="pages.desktop.read" />
                                    </Text>
                                </a>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Modal
                opened={eventOpen}
                onClose={() => setEventOpen(false)}
                title={<FormattedMessage id="pages.desktop.addEvent" />}
            >
                <Flex direction="column" gap="sm">
                    <TextInput
                        label={<FormattedMessage id="pages.desktop.eventTitle" />}
                        {...eventForm.getInputProps("title")}
                    />
                    <Select
                        label={<FormattedMessage id="pages.desktop.eventTypeLabel" />}
                        data={[
                            { value: "CALL", label: intl.formatMessage({ id: "pages.desktop.eventType.CALL" }) },
                            {
                                value: "SUBBOTNIK",
                                label: intl.formatMessage({ id: "pages.desktop.eventType.SUBBOTNIK" }),
                            },
                            {
                                value: "MEETING",
                                label: intl.formatMessage({ id: "pages.desktop.eventType.MEETING" }),
                            },
                            {
                                value: "LECTURE",
                                label: intl.formatMessage({ id: "pages.desktop.eventType.LECTURE" }),
                            },
                            { value: "OTHER", label: intl.formatMessage({ id: "pages.desktop.eventType.OTHER" }) },
                        ]}
                        {...eventForm.getInputProps("type")}
                    />
                    <DateInput
                        label={<FormattedMessage id="pages.desktop.eventWhen" />}
                        valueFormat="DD.MM.YYYY"
                        {...eventForm.getInputProps("startsAt")}
                    />
                    <TextInput
                        label={<FormattedMessage id="pages.desktop.eventTime" />}
                        placeholder="14:00"
                        value={eventForm.values.time}
                        onChange={(e) => eventForm.setFieldValue("time", e.currentTarget.value)}
                    />
                    <TextInput
                        label={<FormattedMessage id="pages.desktop.eventWhere" />}
                        description={<FormattedMessage id="pages.desktop.eventWhereHint" />}
                        placeholder="EKO-237  или  https://ekomapa.rs/map?trash_point=237"
                        rightSection={
                            <a
                                href="https://ekomapa.rs/map"
                                target="_blank"
                                rel="noreferrer"
                                title={intl.formatMessage({ id: "pages.desktop.openEkomapa" })}
                                style={{ display: "flex", color: "var(--portal-accent)" }}
                            >
                                <IconExternalLink size={16} />
                            </a>
                        }
                        {...eventForm.getInputProps("location")}
                        onBlur={(e) => {
                            eventForm.getInputProps("location").onBlur?.(e)
                            const next = normalizeEventLocation(e.currentTarget.value)
                            if (next !== e.currentTarget.value) {
                                eventForm.setFieldValue("location", next)
                            }
                        }}
                    />
                    {isEkomapaMapUrl(eventForm.values.location) && (
                        <Text size="xs" c="dimmed">
                            <FormattedMessage
                                id="pages.desktop.eventWhereResolved"
                                values={{
                                    code: ekomapaLocationLabel(eventForm.values.location) || "",
                                }}
                            />
                        </Text>
                    )}
                    <Textarea
                        label={<FormattedMessage id="pages.desktop.eventDescription" />}
                        minRows={3}
                        {...eventForm.getInputProps("description")}
                    />
                    <Button
                        loading={creatingEvent}
                        onClick={() => {
                            const result = eventForm.validate()
                            if (result.hasErrors || !eventForm.values.startsAt) return
                            createEvent({
                                title: eventForm.values.title.trim(),
                                description: eventForm.values.description.trim() || null,
                                startsAt: dayjs(eventForm.values.startsAt)
                                    .hour(Number((eventForm.values.time || "12:00").split(":")[0] || 12))
                                    .minute(Number((eventForm.values.time || "12:00").split(":")[1] || 0))
                                    .second(0)
                                    .toISOString(),
                                location: normalizeEventLocation(eventForm.values.location) || null,
                                type: eventForm.values.type,
                                programCode: eventForm.values.programCode || curatorMe?.programs?.[0] || null,
                            })
                        }}
                    >
                        <FormattedMessage id="pages.desktop.saveEvent" />
                    </Button>
                </Flex>
            </Modal>
        </Flex>
    )
}

export default DesktopPage
