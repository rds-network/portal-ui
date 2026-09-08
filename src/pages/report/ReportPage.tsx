import { ActionIcon, Alert, Anchor, Avatar, Badge, Button, Flex, Loader, Text, Textarea } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { ReportDto, UserInfoDto } from "@rds-network/portal-api-axios"
import {
    IconCalendar,
    IconCheck,
    IconClock,
    IconMail,
    IconPencil,
    IconTrash,
    IconUserStar,
    IconWand,
    IconX,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useParams } from "react-router"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { useProjects } from "src/app/providers/ProjectsProvider"
import { UserContext } from "src/app/providers/UserContext"
import { locales } from "src/pages/report/lib/locales"
import { ReportNote } from "src/pages/report/note/ReportNote"
import { TaskCard } from "src/pages/report/task/TaskCard"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { getReportStatusColor, ReportStatus } from "src/shared/report/status"
import { getSpentTimeFromTasks } from "src/shared/report/timeSpent"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./ReportPage.module.scss"

export const ReportPage = () => {
    setDocumentTitleByLocale(locales.documentTitle)

    const { id } = useParams()
    const intl = useIntl()
    const navigate = useNavigate()
    const { user: currentUser } = useContext(UserContext)
    const [logins, setLogins] = useState<string[]>([])

    const programs = usePrograms()
    const projects = useProjects()

    const [statusChanging, setStatusChanging] = useState(false)
    const [comment, setComment] = useState("")

    const [submitDelete, setSubmitDelete] = useState<boolean>(false)
    const [deleting, setDeleting] = useState(false)

    const [emailDrawerOpen, setEmailDrawerOpen] = useState<boolean>(false)

    if (!id) {
        navigate("/not-found")
    }

    const { data: report, isFetching: isFetchingReport } = useQuery({
        queryKey: ["getReport", id],
        initialData: { id: "", tasks: [] },
        queryFn: () =>
            ReportApiService.getReport(id!!).then((response) => {
                const report = response.data
                setLogins(
                    [report.user, report.moderator, ...report.tasks.map((it) => it.customer)].filter(
                        (it) => it != undefined
                    )
                )
                return report
            }),
    })

    const { data: users = {}, isFetching: isFetchingUsers } = resolveUsers(logins)

    const program = useMemo(() => programs.find((p) => p.code === report.program), [programs, report.program])
    const project = useMemo(() => projects.find((p) => p.code === report.project), [projects, report.project])

    if (isFetchingReport || isFetchingUsers) {
        return (
            <Flex className={classes.root}>
                <LoadingScreen />
            </Flex>
        )
    }

    const onStatusChange = (status: ReportStatus) => {
        if (status == ReportStatus.REJECTED && comment.trim().length == 0) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id={locales.commentRequired} />
                    </Text>
                )
            )
            return
        }
        setStatusChanging(true)
        ReportApiService.changeStatus(report.id, { status: status, note: comment }).then((response) => {
            window.location.reload()
        })
    }

    const onDelete = () => {
        setDeleting(true)
        ReportApiService.deleteReport(report.id).then((response) => {
            navigate(`/reports?login=${report.user}`)
        })
    }

    return (
        <Flex className={classes.root}>
            <Flex columnGap="sm" align="center" wrap="wrap">
                <Text className={classes.title}>
                    <FormattedMessage
                        id={locales.reportFrom}
                        values={{ date: dayjs(report.createTime).format("DD MMMM YYYY") }}
                    />
                </Text>
                <Badge color={getReportStatusColor(report.status)} size="lg" radius="md" variant="light">
                    <FormattedMessage id={`common.report-status.${report.status}`} />
                </Badge>
                {enableEditButton(report, currentUser) && (
                    <Badge
                        color="gray"
                        size="lg"
                        radius="md"
                        variant="light"
                        leftSection={<IconPencil size={14} />}
                        className={classes.editButton}
                        onClick={() => {
                            navigate(`/report/${report.id}/edit`)
                        }}
                    >
                        <FormattedMessage id={locales.edit}></FormattedMessage>
                    </Badge>
                )}
            </Flex>
            {report.isAuto && (
                <Alert className={classes.autoAlert} variant="outline" color="blue" icon={<IconWand size={16} />}>
                    <FormattedMessage id={locales.autoReport} />
                </Alert>
            )}
            <Flex className={classes.reportDescription}>
                <TextPropertyBox
                    name={locales.creator}
                    value={
                        <Flex align="center" columnGap="sm">
                            <Anchor href={`/profile/${report.user}`} target="_blank">
                                <Text>{users[report.user || ""].fullName}</Text>
                            </Anchor>
                            <EmailDrawer
                                opened={emailDrawerOpen}
                                close={() => setEmailDrawerOpen(false)}
                                recipients={[
                                    {
                                        name: users[report.user || ""].fullName,
                                        email: users[report.user || ""].email,
                                    },
                                ]}
                            />
                            {hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && (
                                <ActionIcon
                                    size={16}
                                    radius="1"
                                    variant="transparent"
                                    onClick={() => setEmailDrawerOpen(true)}
                                >
                                    <IconMail size={14} />
                                </ActionIcon>
                            )}
                        </Flex>
                    }
                    icon={
                        <Avatar
                            src={users[report.user || ""].avatar?.link}
                            name={users[report.user || ""].fullName}
                            color="initials"
                            size={20}
                        />
                    }
                />
                <TextPropertyBox
                    name={locales.creationDate}
                    value={dayjs(report.createTime).format("DD MMM YYYY - HH:mm")}
                    icon={<IconCalendar size={16} />}
                />
                <TextPropertyBox
                    name={locales.timeSpentTotal}
                    value={getSpentTimeFromTasks(report.tasks, intl)}
                    icon={<IconClock size={16} />}
                />
                <TextPropertyBox
                    name={locales.program}
                    value={
                        program ? getLocalizedName(program, intl.locale) : <FormattedMessage id={locales.noProgram} />
                    }
                />
                <TextPropertyBox
                    name={locales.project}
                    value={
                        project ? getLocalizedName(project, intl.locale) : <FormattedMessage id={locales.noProject} />
                    }
                />
                {hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && report.moderator && (
                    <TextPropertyBox
                        name={locales.moderatorShort}
                        value={
                            <Flex align="center" columnGap="sm">
                                <Anchor href={`/profile/${report.moderator}`} target="_blank">
                                    <Text>{users[report.moderator || ""].fullName}</Text>
                                </Anchor>
                            </Flex>
                        }
                        icon={<IconUserStar size={16} />}
                    />
                )}
            </Flex>
            {report.notes && report.notes.length > 0 && (
                <Flex className={classes.notes}>
                    <Text fw="bold">
                        <FormattedMessage id={locales.comments} />
                    </Text>
                    {report.notes
                        .sort((n1, n2) => {
                            return dayjs(n1.createTime).diff(n2.createTime)
                        })
                        .map((note) => (
                            <ReportNote note={note} key={note.id} />
                        ))}
                </Flex>
            )}
            <Flex className={classes.tasks}>
                {report.tasks
                    .sort((t1, t2) => {
                        return dayjs(t1.date).diff(t2.date)
                    })
                    .map((task) => (
                        <TaskCard task={task} users={users} key={task.id} />
                    ))}
            </Flex>
            {report.status == ReportStatus.CREATED && hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && (
                <Flex direction="column" rowGap="sm">
                    <Textarea
                        className={classes.comment}
                        value={comment}
                        autosize={true}
                        disabled={statusChanging}
                        onChange={(e) => setComment(e.target.value)}
                        label={intl.formatMessage({ id: locales.comment })}
                    ></Textarea>
                    <Flex className={classes.acceptRejectSection}>
                        <Button
                            className={classes.acceptButton}
                            color="green"
                            variant="light"
                            leftSection={<IconCheck size={16} />}
                            disabled={statusChanging}
                            onClick={() => {
                                onStatusChange(ReportStatus.ACCEPTED)
                            }}
                        >
                            <FormattedMessage id={locales.accept} />
                        </Button>
                        <Button
                            className={classes.rejectButton}
                            color="red"
                            variant="light"
                            leftSection={<IconX size={16} />}
                            disabled={statusChanging}
                            onClick={() => {
                                onStatusChange(ReportStatus.REJECTED)
                            }}
                        >
                            <FormattedMessage id={locales.reject} />
                        </Button>
                    </Flex>
                </Flex>
            )}
            {hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && (
                <Flex className={classes.deleteReportSection}>
                    <Button
                        disabled={deleting}
                        variant={submitDelete ? "filled" : "outline"}
                        color="red"
                        size="sm"
                        leftSection={deleting ? <Loader size={16} color="red" /> : <IconTrash size={16} />}
                        className={classes.deleteButton}
                        onClick={() => {
                            submitDelete ? onDelete() : setSubmitDelete(true)
                        }}
                    >
                        <FormattedMessage id={submitDelete ? locales.deleteSubmit : locales.delete} />
                    </Button>
                </Flex>
            )}
        </Flex>
    )
}

const enableEditButton = (report: ReportDto, currentUser: UserInfoDto | null): boolean => {
    if (hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER])) {
        return true
    }
    if (report.status != ReportStatus.REJECTED) {
        return false
    }
    return currentUser?.username == report.user
}

export default ReportPage
