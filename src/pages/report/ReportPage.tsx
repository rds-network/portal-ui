import { ActionIcon, Alert, Anchor, Avatar, Badge, Button, Checkbox, Flex, Loader, Text, Textarea } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { ReportDto, UserInfoDto } from "@rds-network/portal-api-axios"
import {
    IconArrowBackUp,
    IconCalendar,
    IconCheck,
    IconClock,
    IconMail,
    IconPencil,
    IconShieldCheck,
    IconTrash,
    IconUserStar,
    IconWand,
    IconX,
} from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useParams } from "react-router"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { useProjects } from "src/app/providers/ProjectsProvider"
import { UserContext } from "src/app/providers/UserContext"
import { ProgramSelectInline } from "src/pages/profile/select/ProgramSelect"
import { ProjectSelectInline } from "src/pages/profile/select/ProjectSelect"
import { locales } from "src/pages/report/lib/locales"
import { ReportNote } from "src/pages/report/note/ReportNote"
import { TaskCard } from "src/pages/report/task/TaskCard"
import {
    changeReportStatus,
    getReportCustomerAcceptances,
    ReportApiService,
    updateReportAssignment,
} from "src/shared/api/ReportApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { reportControllerNameOf, reportControlOf, resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
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
    const queryClient = useQueryClient()
    const { user: currentUser } = useContext(UserContext)
    const [logins, setLogins] = useState<string[]>([])
    const [assignmentSaving, setAssignmentSaving] = useState(false)

    const programs = usePrograms()
    const projects = useProjects()

    const [statusChanging, setStatusChanging] = useState(false)
    const [comment, setComment] = useState("")
    const [curatorGratitude, setCuratorGratitude] = useState(false)
    const [managerGratitude, setManagerGratitude] = useState(false)

    const [submitDelete, setSubmitDelete] = useState<boolean>(false)
    const [deleting, setDeleting] = useState(false)
    const [submitReturn, setSubmitReturn] = useState(false)

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

    const { data: acceptancesMeta } = useQuery({
        queryKey: ["report-customer-acceptances", id],
        queryFn: () => getReportCustomerAcceptances(id!),
        enabled: !!id && !!report?.id,
    })

    const { data: users = {}, isFetching: isFetchingUsers } = resolveUsers(logins)

    const program = useMemo(() => programs.find((p) => p.code === report.program), [programs, report.program])
    const project = useMemo(() => projects.find((p) => p.code === report.project), [projects, report.project])
    const { visibleProjects } = useProgramProjectFilter(report.program ?? null, report.project ?? null)

    const isCustomer = (report.tasks ?? []).some((task) => task.customer === currentUser?.username)
    const { data: delegates = [] } = useQuery({
        queryKey: ["program-curators", "delegates"],
        queryFn: () => ProgramCuratorApiService.delegates(),
        enabled: !!currentUser,
    })

    const myCustomerLogins = useMemo(() => {
        const mine = new Set<string>()
        const me = currentUser?.username?.toLowerCase()
        if (me) mine.add(me)
        for (const row of delegates) {
            if (row.delegateUsername?.toLowerCase() === me && row.curatorUsername) {
                mine.add(row.curatorUsername.toLowerCase())
            }
        }
        return mine
    }, [currentUser?.username, delegates])

    const isMyTask = (customer?: string | null) =>
        !!customer && myCustomerLogins.has(customer.toLowerCase())

    if (isFetchingReport || isFetchingUsers) {
        return (
            <Flex className={classes.root}>
                <LoadingScreen />
            </Flex>
        )
    }

    const goBackToReview = () => {
        queryClient.invalidateQueries({ queryKey: ["customer-reports"] })
        queryClient.invalidateQueries({ queryKey: ["customer-reports-pending"] })
        navigate("/reports/review")
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
        const accepting = status === ReportStatus.ACCEPTED
        changeReportStatus(report.id, {
            status,
            note: comment,
            gratitude: accepting && curatorGratitude ? true : undefined,
            managerGratitude: accepting && managerGratitude ? true : undefined,
        })
            .then(async () => {
                if (status === ReportStatus.REJECTED) {
                    notifications.show(
                        SuccessNotification(
                            <Text size="sm">
                                <FormattedMessage id={locales.rejectedBackToReview} />
                            </Text>,
                            null
                        )
                    )
                    goBackToReview()
                    return
                }
                const next = await ReportApiService.getReport(report.id).then((r) => r.data)
                if (next.status === ReportStatus.ACCEPTED) {
                    notifications.show(
                        SuccessNotification(
                            <Text size="sm">
                                <FormattedMessage id={locales.acceptedBackToReview} />
                            </Text>,
                            null
                        )
                    )
                    goBackToReview()
                    return
                }
                notifications.show(
                    SuccessNotification(
                        <Text size="sm">
                            <FormattedMessage id={locales.partialAccepted} />
                        </Text>,
                        null
                    )
                )
                goBackToReview()
            })
            .catch(() => {
                setStatusChanging(false)
                notifications.show(
                    ErrorNotification(
                        <Text size="sm">
                            <FormattedMessage id="errors.request" />
                        </Text>
                    )
                )
            })
    }

    const onDelete = () => {
        setDeleting(true)
        ReportApiService.deleteReport(report.id).then((response) => {
            navigate(`/reports?login=${report.user}`)
        })
    }

    // Программа в отчёте — снимок на момент сдачи, поэтому её правят прямо здесь: статус отчёта не меняется.
    const onAssignmentChange = (programCode: string | null, projectCode: string | null) => {
        setAssignmentSaving(true)
        updateReportAssignment(report.id, { programCode, projectCode })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["getReport", id] })
                notifications.show(
                    SuccessNotification(
                        <Text size="sm">
                            <FormattedMessage id={locales.assignmentSaved} />
                        </Text>,
                        null
                    )
                )
            })
            .finally(() => setAssignmentSaving(false))
    }

    const isAcceptanceDelegate = delegates.some(
        (row) =>
            row.delegateUsername === currentUser?.username &&
            (report.tasks ?? []).some((task) => task.customer === row.curatorUsername) &&
            (!report.program || row.programCode === report.program)
    )
    // Принудительный контроль — строгая виза: модератор и куратор программы принять не могут.
    const authorController = reportControlOf(users[report.user || ""]).reportControllerUsername || null
    const authorControllerName = reportControllerNameOf(users[report.user || ""])
    const isAuthorController = authorController?.toLowerCase() === currentUser?.username?.toLowerCase()
    const isControllerDelegate = delegates.some(
        (row) =>
            row.delegateUsername === currentUser?.username &&
            row.curatorUsername.toLowerCase() === (authorController || "").toLowerCase() &&
            (!report.program || row.programCode === report.program)
    )
    const canAcceptBase = authorController
        ? isAuthorController ||
          isControllerDelegate ||
          hasPermission(currentUser, [UserGroup.ADMIN, UserGroup.ADMIN_SSO])
        : hasPermission(currentUser, [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]) ||
          isCustomer ||
          isAcceptanceDelegate
    // После частичной приёмки своей части кнопка скрывается, пока остальные не примут / не вернут отчёт.
    const canAcceptReport =
        canAcceptBase && (acceptancesMeta ? acceptancesMeta.pendingForMe : true)
    const multiCustomer = !!acceptancesMeta?.multiCustomer
    const acceptedCount =
        acceptancesMeta?.acceptances.filter((row) => row.status === "ACCEPTED").length ?? 0
    const totalCustomers = acceptancesMeta?.acceptances.length ?? 0
    const waitingNames = (acceptancesMeta?.acceptances ?? [])
        .filter((row) => row.status !== "ACCEPTED")
        .map((row) => row.customerName || row.customer)
        .filter(Boolean)
        .join(", ")
    const canEditAssignment =
        hasPermission(currentUser, [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]) ||
        canAcceptBase
    const canAwardManagerGratitude = hasPermission(currentUser, [
        UserGroup.ADMIN,
        UserGroup.ADMIN_SSO,
        UserGroup.ADMIN_VOLUNTEER,
        UserGroup.MAIN_VOLUNTEER,
    ])
    const canReturnToWork =
        report.status === ReportStatus.ACCEPTED &&
        (canAcceptBase || hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]))

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
                        canEditAssignment ? (
                            <ProgramSelectInline
                                value={report.program ?? null}
                                canEdit={!assignmentSaving}
                                locale={intl.locale}
                                onChange={(programCode) => onAssignmentChange(programCode, null)}
                            />
                        ) : program ? (
                            getLocalizedName(program, intl.locale)
                        ) : (
                            <FormattedMessage id={locales.noProgram} />
                        )
                    }
                />
                <TextPropertyBox
                    name={locales.project}
                    value={
                        canEditAssignment ? (
                            <ProjectSelectInline
                                value={report.project ?? null}
                                canEdit={!assignmentSaving}
                                locale={intl.locale}
                                onChange={(projectCode) => onAssignmentChange(report.program ?? null, projectCode)}
                                projectsOverride={visibleProjects}
                            />
                        ) : project ? (
                            getLocalizedName(project, intl.locale)
                        ) : (
                            <FormattedMessage id={locales.noProject} />
                        )
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
                        <TaskCard
                            task={task}
                            users={users}
                            key={task.id}
                            highlightMine={multiCustomer && isMyTask(task.customer)}
                            mineLabel={intl.formatMessage({ id: locales.myTask })}
                        />
                    ))}
            </Flex>
            {report.status == ReportStatus.CREATED && multiCustomer && (
                <Alert variant="light" color="blue">
                    <FormattedMessage id={locales.multiCustomerHint} />
                    {totalCustomers > 0 && (
                        <Text size="sm" mt={6}>
                            <FormattedMessage
                                id={locales.acceptanceProgress}
                                values={{ accepted: acceptedCount, total: totalCustomers }}
                            />
                            {waitingNames ? (
                                <>
                                    {" · "}
                                    <FormattedMessage
                                        id={locales.acceptanceWaiting}
                                        values={{ names: waitingNames }}
                                    />
                                </>
                            ) : null}
                        </Text>
                    )}
                </Alert>
            )}
            {report.status == ReportStatus.CREATED && !canAcceptReport && !!authorControllerName && (
                <Alert variant="light" color="teal" icon={<IconShieldCheck size={16} />}>
                    <FormattedMessage id={locales.controlVisaRequired} values={{ name: authorControllerName }} />
                </Alert>
            )}
            {report.status == ReportStatus.CREATED && canAcceptReport && (
                <Flex direction="column" rowGap="sm">
                    <Textarea
                        className={classes.comment}
                        value={comment}
                        autosize={true}
                        disabled={statusChanging}
                        onChange={(e) => setComment(e.target.value)}
                        label={intl.formatMessage({ id: locales.comment })}
                    ></Textarea>
                    <Checkbox
                        checked={curatorGratitude}
                        disabled={statusChanging}
                        onChange={(e) => setCuratorGratitude(e.currentTarget.checked)}
                        label={intl.formatMessage({ id: locales.curatorGratitude })}
                        description={intl.formatMessage({ id: locales.curatorGratitudeHint })}
                    />
                    {canAwardManagerGratitude && (
                        <Checkbox
                            checked={managerGratitude}
                            disabled={statusChanging}
                            onChange={(e) => setManagerGratitude(e.currentTarget.checked)}
                            label={intl.formatMessage({ id: locales.managerGratitude })}
                            description={intl.formatMessage({ id: locales.managerGratitudeHint })}
                        />
                    )}
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
                            <FormattedMessage id={multiCustomer ? locales.acceptMine : locales.accept} />
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
            {canReturnToWork && (
                <Flex direction="column" rowGap="sm" className={classes.returnToWorkSection}>
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id={locales.returnToWorkHint} />
                    </Text>
                    <Textarea
                        className={classes.comment}
                        value={comment}
                        autosize={true}
                        disabled={statusChanging}
                        onChange={(e) => setComment(e.target.value)}
                        label={intl.formatMessage({ id: locales.comment })}
                    />
                    <Button
                        disabled={statusChanging}
                        variant={submitReturn ? "filled" : "outline"}
                        color="orange"
                        size="sm"
                        leftSection={
                            statusChanging ? <Loader size={16} color="orange" /> : <IconArrowBackUp size={16} />
                        }
                        onClick={() => {
                            if (!submitReturn) {
                                setSubmitReturn(true)
                                return
                            }
                            onStatusChange(ReportStatus.CREATED)
                        }}
                    >
                        <FormattedMessage id={submitReturn ? locales.returnToWorkSubmit : locales.returnToWork} />
                    </Button>
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
    if (currentUser?.username != report.user) {
        return false
    }
    // CREATED: drafts + auto reports from Ekomapa (volunteer must fix hours/project before submit)
    // REJECTED: rework after curator rejection
    return report.status === ReportStatus.CREATED || report.status === ReportStatus.REJECTED
}

export default ReportPage
