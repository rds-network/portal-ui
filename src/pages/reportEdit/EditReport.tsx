import { Alert, Anchor, Badge, Button, Flex, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { TaskDto } from "@rds-network/portal-api-axios"
import {
    IconAlertTriangle,
    IconArrowLeft,
    IconCircleCheck,
    IconChevronRight,
    IconNotes,
    IconDeviceFloppy,
    IconPlus,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import classes from "src/pages/reportEdit/EditReport.module.scss"
import { defaultTask } from "src/pages/reportEdit/lib/defaults"
import { TaskCard, TaskCardInterface } from "src/pages/reportEdit/task/TaskCard"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { reportBlockOf } from "src/shared/api/user/UserApiService"
import { WorkAssignmentApiService } from "src/shared/api/WorkAssignmentApiService"
import { setDocumentTitleByLocale, setDocumentTitleByString } from "src/shared/hooks/useDocumentTitle"
import { useReportDraft } from "src/shared/hooks/useReportDraft"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { ReportStatus } from "src/shared/report/status"
import { allTasksInOneWeek } from "src/shared/report/tasks"
import { ConfirmActionModal } from "src/shared/ui/confirmActionModal/ConfirmActionModal"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { v4 as uuid } from "uuid"
import { locales } from "./lib/locales"

export const EditReport = () => {
    setDocumentTitleByLocale(locales.title)
    const location = useLocation()
    const { id } = useParams()
    const intl = useIntl()

    const { user: currentUser } = useContext(UserContext)
    const editMode = useMemo(() => location.pathname.includes("edit"), [location])

    const { tasks, setTasks, clearDraft } = useReportDraft(editMode)
    const taskAddedRef = useRef(false)
    const taskRefs = useRef<{ [key: string]: React.RefObject<TaskCardInterface> }>({})

    const navigate = useNavigate()
    const [isSending, setIsSending] = useState(false)

    const [confirmModalOpened, setConfirmModalOpened] = useState(false)

    const { data: report, isFetching: isFetchingReport } = useQuery({
        queryKey: ["getReport", id],
        enabled: editMode && id != null,
        initialData: { id: "", tasks: [] },
        queryFn: () =>
            ReportApiService.getReport(id!!).then((response) => {
                return response.data
            }),
    })

    const handleTaskChange = (id: string, updatedTask: TaskDto) => {
        // Keep the rendered task collection in sync with the draft before adding or removing cards.
        setTasks((current) => current.map((task) => (task.id === id ? updatedTask : task)))
    }

    const handleTaskAdd = () => {
        const task: TaskDto = { ...defaultTask, id: uuid() }
        taskAddedRef.current = true
        setTasks([...tasks, task])
        taskRefs.current[task.id] = React.createRef()
    }

    const handleTaskDelete = (id: string) => {
        scrollToCard(tasks.length - 2)
        // Delay the actual removal to allow the scroll to finish
        setTimeout(() => {
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id))
            delete taskRefs.current[id]
        }, 300)
    }

    const scrollToCard = (index: number) => {
        if (index < 0 || index >= tasks.length) {
            return
        }
        const cardId = tasks[index].id
        const cardRef = taskRefs.current[cardId]
        cardRef?.current?.scrollIntoView()
    }

    useEffect(() => {
        if (taskAddedRef.current) {
            taskAddedRef.current = false
            scrollToCard(tasks.length - 1)
        }
    }, [tasks.length])

    useEffect(() => {
        if (editMode) {
            setTasks(report.tasks)
        }
    }, [report, editMode])

    useEffect(() => {
        if (editMode) return
        const taskName = new URLSearchParams(location.search).get("task")?.trim()
        if (!taskName) return
        setTasks((current) => {
            if (current.some((task) => (task.name || "").trim() === taskName)) return current
            const blank = current.length === 1 && !(current[0].name || "").trim()
            if (blank) return [{ ...current[0], name: taskName }]
            return [...current, { ...defaultTask, id: uuid(), name: taskName }]
        })
    }, [editMode, location.search, setTasks])

    const reportBlock = reportBlockOf(currentUser)

    const { data: myAssignments = [] } = useQuery({
        queryKey: ["work-assignments"],
        enabled: !editMode,
        queryFn: () => WorkAssignmentApiService.list(),
    })

    const openAssignments = useMemo(
        () =>
            myAssignments.filter(
                (item) =>
                    item.status !== "DONE" &&
                    (!item.assignee || item.assignee === currentUser?.username) &&
                    !tasks.some((task) => (task.name || "").trim() === item.title.trim())
            ),
        [myAssignments, currentUser?.username, tasks]
    )

    const addAssignment = (title: string) => {
        setTasks((current) => {
            if (current.some((task) => (task.name || "").trim() === title.trim())) return current
            const blank = current.length === 1 && !(current[0].name || "").trim()
            if (blank) return [{ ...current[0], name: title }]
            return [...current, { ...defaultTask, id: uuid(), name: title }]
        })
    }

    if (editMode) {
        if (!id) {
            navigate("/not-found")
        }
        if (isFetchingReport) {
            return (
                <Flex className={classes.root}>
                    <LoadingScreen />
                </Flex>
            )
        }
        if (!hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER])) {
            if (currentUser?.username != report?.user) {
                navigate("/unauthorized", { replace: true })
            }
            if (report.status !== ReportStatus.REJECTED) {
                navigate("/unauthorized", { replace: true })
            }
        }
        setDocumentTitleByString(intl.formatMessage({ id: locales.titleEdit }))
    }

    const onSend = () => {
        for (let i = 0; i < tasks.length; i++) {
            const cardRef = taskRefs.current[tasks[i].id]
            if (cardRef.current) {
                const validationResult = cardRef.current.validate()
                if (validationResult?.hasErrors) {
                    cardRef.current.scrollIntoView()
                    return
                } else {
                    tasks[i] = cardRef.current.getValues()
                }
            }
        }
        if (tasks.some((task) => !task.customer)) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id={locales.customerRequired} />
                    </Text>
                )
            )
            return
        }
        if (!allTasksInOneWeek(tasks)) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id={locales.differentWeeks} />
                    </Text>
                )
            )
            return
        }
        const totalTimeSpent = tasks.map((t) => t.timeSpent).reduce((a, b) => a + b, 0)
        if (totalTimeSpent < 600) {
            setConfirmModalOpened(true)
        } else {
            sendReport()
        }
    }

    const sendReport = () => {
        setIsSending(true)
        const reportDto = editMode ? { tasks: tasks, id: report.id } : { tasks: tasks, id: uuid() }
        const response = editMode ? ReportApiService.updateReport(reportDto) : ReportApiService.createReport(reportDto)
        response
            .then((r) => {
                clearDraft()
                navigate(`/report/${r.data.id}`)
            })
            .catch((_) => {
                setIsSending(false)
            })
    }

    return (
        <Flex direction="column" className={classes.root}>
            <Anchor component={Link} to="/reports/personal" className={classes.backLink}>
                <IconArrowLeft size={16} />
                <FormattedMessage id="design.backToReports" />
            </Anchor>
            <div className={classes.header}>
                <Title order={1} className={classes.title}>
                    <FormattedMessage id={editMode ? locales.titleEdit : locales.title} />
                </Title>
            </div>
            {reportBlock.reportBlocked && (
                <Alert
                    color="red"
                    icon={<IconAlertTriangle size={18} />}
                    title={<FormattedMessage id={locales.blockedTitle} />}
                >
                    <FormattedMessage
                        id={locales.blockedDescription}
                        values={{
                            name: reportBlock.reportBlockedByFullName || reportBlock.reportBlockedBy || "",
                        }}
                    />
                    {reportBlock.reportBlockedReason && (
                        <Text size="sm" mt={6}>
                            <FormattedMessage
                                id={locales.blockedReason}
                                values={{ reason: reportBlock.reportBlockedReason }}
                            />
                        </Text>
                    )}
                </Alert>
            )}
            <div className={classes.workspace}>
                <div className={classes.taskContainer}>
                    <Flex direction="column" rowGap={24}>
                        {!editMode && openAssignments.length > 0 && (
                            <Flex wrap="wrap" gap={8} align="center">
                                <Text size="sm" c="dimmed">
                                    <FormattedMessage id="pages.tasks.open" />
                                </Text>
                                {openAssignments.map((item) => (
                                    <Button
                                        key={item.id}
                                        size="xs"
                                        variant="light"
                                        onClick={() => addAssignment(item.title)}
                                    >
                                        <FormattedMessage id="pages.tasks.add" />: {item.title}
                                    </Button>
                                ))}
                            </Flex>
                        )}
                        {tasks
                            .sort((t1, t2) => {
                                return dayjs(t1.date).diff(t2.date)
                            })
                            .map((task, index) => {
                                if (!taskRefs.current[task.id]) {
                                    taskRefs.current[task.id] = React.createRef()
                                }
                                return (
                                    <TaskCard
                                        key={task.id}
                                        ref={taskRefs.current[task.id]}
                                        task={task}
                                        index={index}
                                        deletable={tasks.length > 1}
                                        editMode={editMode}
                                        onChange={handleTaskChange}
                                        onDelete={handleTaskDelete}
                                    />
                                )
                            })}
                    </Flex>

                    <Button
                        className={classes.buttonAddTask}
                        variant="light"
                        rightSection={<IconPlus size={20} />}
                        onClick={handleTaskAdd}
                    >
                        <FormattedMessage id={locales.addButton} />
                    </Button>
                </div>
                <aside className={classes.summary}>
                    <div className={classes.summaryHeading}>
                        <IconNotes size={22} />
                        <Title order={2} size="h4">
                            <FormattedMessage id="design.reportSummary" />
                        </Title>
                    </div>
                    <Badge variant="light" size="lg" mt="md">
                        <FormattedMessage id="design.tasksCount" values={{ count: tasks.length }} />
                    </Badge>
                    <Text className={classes.description}>
                        <FormattedMessage id={locales.description} />
                    </Text>
                    <div className={classes.draftHint}>
                        <IconCircleCheck size={18} />
                        <Text size="xs">
                            <FormattedMessage id={editMode ? "design.editHint" : "design.draftHint"} />
                        </Text>
                    </div>
                    <Button
                        fullWidth
                        size="md"
                        rightSection={editMode ? <IconDeviceFloppy size={18} /> : <IconChevronRight size={18} />}
                        onClick={onSend}
                        loading={isSending}
                        disabled={isSending || !!reportBlock.reportBlocked}
                    >
                        <FormattedMessage id={editMode ? locales.saveButton : locales.sendButton} />
                    </Button>
                    <Anchor component={Link} to="/reporting-guide" className={classes.guideLink}>
                        <FormattedMessage id="design.reportGuide" />
                    </Anchor>
                </aside>
            </div>
            <ConfirmActionModal
                opened={confirmModalOpened}
                onClose={() => {
                    setConfirmModalOpened(false)
                }}
                onConfirm={sendReport}
                title={<FormattedMessage id={locales.confirmTitle} />}
                description={<FormattedMessage id={locales.confirmDescription} />}
                confirmButtonText={<FormattedMessage id={editMode ? locales.saveButton : locales.sendButton} />}
                cancelButtonText={<FormattedMessage id={locales.fillUpButton} />}
            />
        </Flex>
    )
}

export default EditReport
