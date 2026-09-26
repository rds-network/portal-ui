import { Badge, Button, Flex, Text, Title } from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useMemo } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { CurrentUserHeatmap } from "src/pages/reportsPersonal/heatmap/CurrentUserHeatmap"
import { defaultFilter, defaultPage, defaultPageResponse } from "src/pages/reportsPersonal/lib/constants"
import { defaultUser } from "src/pages/reports/lib/defaults"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { WorkAssignmentApiService } from "src/shared/api/WorkAssignmentApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { ReportCard } from "src/shared/ui/reportCard/ReportCard"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./DesktopPage.module.scss"

const STATUS_COLOR: Record<string, string> = {
    TODO: "gray",
    DOING: "blue",
    REVIEW: "yellow",
    REDO: "orange",
    DONE: "green",
}

const ACTIVE_TASK_STATUSES = new Set(["TODO", "DOING", "REVIEW", "REDO"])

export const DesktopPage: React.FC = () => {
    setDocumentTitleByLocale("pages.desktop.title")
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const { programs, projects } = useProgramProjectFilter(null, null)

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
                                        {task.dueDate
                                            ? ` · ${dayjs(task.dueDate).format("DD MMM")}`
                                            : ""}
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

                <section className={classes.heatmap}>
                    <CurrentUserHeatmap />
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
                    </div>
                    <Text className={classes.empty}>
                        <FormattedMessage id="pages.desktop.eventsSoon" />
                    </Text>
                </section>
            </div>
        </Flex>
    )
}

export default DesktopPage
