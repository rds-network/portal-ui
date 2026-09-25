import { Badge, Button, Flex, Modal, Text, Textarea, TextInput, Title } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconChecklist, IconPlus } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import {
    WorkAssignmentApiService,
    WorkAssignmentDto,
    WorkAssignmentPatchRequest,
    WorkAssignmentStatus,
} from "src/shared/api/WorkAssignmentApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { NO_PROGRAM_CODE } from "src/shared/constants/Shared"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ProgramFilter } from "src/shared/ui/filter"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./WorkTasksPage.module.scss"

const SUPERVISORS = [UserGroup.ADMIN, UserGroup.ADMIN_SSO, UserGroup.MAIN_VOLUNTEER]
const LANES: WorkAssignmentStatus[] = ["TODO", "DOING", "REVIEW", "REDO", "DONE"]
const ASSIGNEE_LANES: WorkAssignmentStatus[] = ["TODO", "DOING", "REVIEW"]
const CUSTOMER_LANES: WorkAssignmentStatus[] = ["TODO", "DOING", "REDO", "DONE"]

const STATUS_COLOR: Record<string, string> = {
    TODO: "gray",
    DOING: "blue",
    REVIEW: "yellow",
    REDO: "orange",
    DONE: "green",
}

export const WorkTasksPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })
    const isManager = !!curatorMe?.curator || hasPermission(user, SUPERVISORS)
    const [assignee, setAssignee] = useState<string | null>(null)
    const [customer, setCustomer] = useState<string | null>(null)
    const [program, setProgram] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [edit, setEdit] = useState<WorkAssignmentDto | null>(null)
    const [editAssignee, setEditAssignee] = useState<string | null>(null)
    const [editCustomer, setEditCustomer] = useState<string | null>(null)
    const assigneeProgram = program === NO_PROGRAM_CODE ? "" : program

    setDocumentTitleByLocale("pages.tasks.title")

    const form = useForm({
        initialValues: {
            title: "",
            body: "",
            dueDate: null as Date | null,
        },
        validate: {
            title: (value) => (value.trim().length < 3 ? intl.formatMessage({ id: "pages.tasks.required" }) : null),
        },
    })

    const editForm = useForm({
        initialValues: {
            title: "",
            body: "",
            dueDate: null as Date | null,
        },
    })

    const { data: assignments = [], isFetching } = useQuery({
        queryKey: ["work-assignments"],
        queryFn: () => WorkAssignmentApiService.list(),
    })

    const visible = useMemo(() => {
        if (isManager) return assignments
        return assignments.filter(
            (item) => item.assignee === user?.username || item.customer === user?.username
        )
    }, [assignments, isManager, user?.username])

    const { mutate: create, isPending } = useMutation({
        mutationFn: WorkAssignmentApiService.create,
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.tasks.created" />
                    </Text>,
                    null
                )
            )
            form.reset()
            setAssignee(null)
            setCustomer(null)
            setProgram(null)
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ["work-assignments"] })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
            queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
        },
    })

    const { mutate: patch, isPending: isPatching } = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: WorkAssignmentPatchRequest }) =>
            WorkAssignmentApiService.patch(id, payload),
        onSuccess: (updated) => {
            if (edit?.id === updated.id) setEdit(updated)
            queryClient.invalidateQueries({ queryKey: ["work-assignments"] })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
            queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
        },
    })

    const { mutate: archiveCard, isPending: isArchiving } = useMutation({
        mutationFn: (id: string) => WorkAssignmentApiService.archive(id),
        onSuccess: () => {
            setEdit(null)
            queryClient.invalidateQueries({ queryKey: ["work-assignments"] })
        },
    })

    const { mutate: deleteCard, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => WorkAssignmentApiService.remove(id),
        onSuccess: () => {
            setEdit(null)
            queryClient.invalidateQueries({ queryKey: ["work-assignments"] })
        },
    })

    const onCreate = form.onSubmit((values) => {
        create({
            title: values.title.trim(),
            body: values.body.trim() || null,
            assignee,
            customer: customer || user?.username || null,
            dueDate: values.dueDate ? dayjs(values.dueDate).format("YYYY-MM-DD") : null,
        })
    })

    const openEdit = (item: WorkAssignmentDto) => {
        setEdit(item)
        setEditAssignee(item.assignee ?? null)
        setEditCustomer(item.customer ?? null)
        editForm.setValues({
            title: item.title,
            body: item.body ?? "",
            dueDate: item.dueDate ? dayjs(item.dueDate).toDate() : null,
        })
    }

    const saveEdit = editForm.onSubmit((values) => {
        if (!edit) return
        patch({
            id: edit.id,
            payload: {
                title: values.title.trim(),
                body: values.body.trim() || null,
                assignee: editAssignee,
                customer: editCustomer,
                dueDate: values.dueDate ? dayjs(values.dueDate).format("YYYY-MM-DD") : null,
            },
        })
        setEdit(null)
    })

    const toReport = (item: WorkAssignmentDto) => {
        if (item.status === "TODO") {
            patch({ id: item.id, payload: { status: "DOING" } })
        }
        navigate(`/report/create?task=${encodeURIComponent(item.title)}`)
    }

    const roleOf = (item: WorkAssignmentDto) => {
        const isAssignee = item.assignee === user?.username
        const isCustomer = item.customer === user?.username
        return { isAssignee, isCustomer, manager: isManager }
    }

    const canDragTo = (item: WorkAssignmentDto, status: string) => {
        const { isAssignee, isCustomer, manager } = roleOf(item)
        if (manager) return true
        if (isAssignee) return ASSIGNEE_LANES.includes(status as WorkAssignmentStatus)
        if (isCustomer) return CUSTOMER_LANES.includes(status as WorkAssignmentStatus)
        return false
    }

    const onDrop = (status: string, event: React.DragEvent) => {
        event.preventDefault()
        const id = event.dataTransfer.getData("text/plain")
        const card = visible.find((item) => item.id === id)
        if (!card || card.status === status || !canDragTo(card, status)) return
        patch({ id, payload: { status } })
    }

    const setStatus = (item: WorkAssignmentDto, status: WorkAssignmentStatus) => {
        if (item.status === status) return
        patch({ id: item.id, payload: { status } })
    }

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.tasks.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.tasks.description" />
                </Text>
            </div>

            {isManager && (
                <Button leftSection={<IconPlus size={16} />} w="fit-content" onClick={() => setCreateOpen(true)}>
                    <FormattedMessage id="pages.tasks.create" />
                </Button>
            )}

            <Flex gap="md" wrap="wrap" className={classes.legend}>
                {LANES.map((lane) => (
                    <Flex key={lane} align="center" gap={6}>
                        <span className={`${classes.swatch} ${classes[lane.toLowerCase()]}`} />
                        <Text size="sm">
                            <FormattedMessage id={`pages.tasks.status.${lane}`} />
                        </Text>
                    </Flex>
                ))}
            </Flex>

            {visible.length === 0 && !isFetching ? (
                <Text c="dimmed">
                    <FormattedMessage id="pages.tasks.empty" />
                </Text>
            ) : (
                <div className={classes.board}>
                    {LANES.map((lane) => {
                        const cards = visible.filter((item) => item.status === lane)
                        return (
                            <section
                                key={lane}
                                className={classes.lane}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => onDrop(lane, event)}
                            >
                                <div className={classes.laneHead}>
                                    <FormattedMessage id={`pages.tasks.status.${lane}`} />
                                    <Badge size="sm" variant="light" color={STATUS_COLOR[lane]}>
                                        {cards.length}
                                    </Badge>
                                </div>
                                {cards.map((item) => (
                                    <article
                                        key={item.id}
                                        className={`${classes.card} ${classes[item.status.toLowerCase()]}`}
                                        draggable
                                        onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                                        onClick={() => openEdit(item)}
                                    >
                                        <div className={classes.meta}>
                                            {item.dueDate && (
                                                <Badge variant="outline" color={item.startedAt ? "blue" : "gray"}>
                                                    {dayjs(item.dueDate).format("DD.MM")}
                                                    {!item.startedAt ? " · ждёт" : ""}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className={classes.title}>{item.title}</div>
                                        {item.body && <div className={classes.body}>{item.body}</div>}
                                        <Text className={classes.assignee} c="dimmed">
                                            <FormattedMessage id="pages.tasks.fields.assignee" />:{" "}
                                            {item.assigneeName || item.assignee || "—"}
                                        </Text>
                                        <Text className={classes.assignee} c="dimmed">
                                            <FormattedMessage id="pages.tasks.fields.customer" />:{" "}
                                            {item.customerName || item.customer || "—"}
                                        </Text>
                                        {item.status !== "DONE" && item.assignee === user?.username && (
                                            <div className={classes.actions}>
                                                <Button
                                                    size="xs"
                                                    leftSection={<IconChecklist size={14} />}
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        toReport(item)
                                                    }}
                                                >
                                                    <FormattedMessage id="pages.tasks.to-report" />
                                                </Button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </section>
                        )
                    })}
                </div>
            )}

            <Modal
                opened={createOpen}
                onClose={() => setCreateOpen(false)}
                title={<FormattedMessage id="pages.tasks.create" />}
                centered
            >
                <form onSubmit={onCreate}>
                    <Flex direction="column" gap="sm">
                        <TextInput
                            label={<FormattedMessage id="pages.tasks.fields.title" />}
                            {...form.getInputProps("title")}
                        />
                        <Textarea
                            label={<FormattedMessage id="pages.tasks.fields.body" />}
                            minRows={3}
                            {...form.getInputProps("body")}
                        />
                        <ProgramFilter
                            label={<FormattedMessage id="pages.tasks.fields.program" />}
                            value={program}
                            onChange={(next) => {
                                setProgram(next)
                                setAssignee(null)
                            }}
                        />
                        <UserSearch
                            key={program ?? "all"}
                            label={<FormattedMessage id="pages.tasks.fields.assignee" />}
                            program={assigneeProgram}
                            onUserChange={(picked) => setAssignee(picked?.username ?? null)}
                        />
                        <UserSearch
                            key={`customer-${program ?? "all"}`}
                            label={<FormattedMessage id="pages.tasks.fields.customer" />}
                            initialSearch={user?.fullName || user?.username || ""}
                            onUserChange={(picked) => setCustomer(picked?.username ?? null)}
                        />
                        <DateInput
                            label={<FormattedMessage id="pages.tasks.fields.due" />}
                            description={<FormattedMessage id="pages.tasks.fields.dueHint" />}
                            valueFormat="DD.MM.YYYY"
                            clearable
                            {...form.getInputProps("dueDate")}
                        />
                        <Button type="submit" leftSection={<IconPlus size={16} />} loading={isPending}>
                            <FormattedMessage id="pages.tasks.submit" />
                        </Button>
                    </Flex>
                </form>
            </Modal>

            <Modal
                opened={!!edit}
                onClose={() => setEdit(null)}
                title={<FormattedMessage id="pages.tasks.edit" />}
                centered
            >
                {edit && (
                    <form onSubmit={isManager ? saveEdit : (event) => event.preventDefault()}>
                        <Flex direction="column" gap="sm">
                            <TextInput
                                label={<FormattedMessage id="pages.tasks.fields.title" />}
                                disabled={!isManager}
                                {...editForm.getInputProps("title")}
                            />
                            <Textarea
                                label={<FormattedMessage id="pages.tasks.fields.body" />}
                                minRows={4}
                                disabled={!isManager}
                                {...editForm.getInputProps("body")}
                            />
                            {isManager && (
                                <>
                                    <UserSearch
                                        key={`${edit.id}-assignee`}
                                        label={<FormattedMessage id="pages.tasks.fields.assignee" />}
                                        initialSearch={edit.assigneeName || edit.assignee || ""}
                                        onUserChange={(picked) => setEditAssignee(picked?.username ?? null)}
                                    />
                                    <UserSearch
                                        key={`${edit.id}-customer`}
                                        label={<FormattedMessage id="pages.tasks.fields.customer" />}
                                        initialSearch={edit.customerName || edit.customer || ""}
                                        onUserChange={(picked) => setEditCustomer(picked?.username ?? null)}
                                    />
                                </>
                            )}
                            {!isManager && (
                                <>
                                    <Text size="sm">
                                        <FormattedMessage id="pages.tasks.fields.assignee" />:{" "}
                                        {edit.assigneeName || edit.assignee || "—"}
                                    </Text>
                                    <Text size="sm">
                                        <FormattedMessage id="pages.tasks.fields.customer" />:{" "}
                                        {edit.customerName || edit.customer || "—"}
                                    </Text>
                                </>
                            )}
                            <DateInput
                                label={<FormattedMessage id="pages.tasks.fields.due" />}
                                description={<FormattedMessage id="pages.tasks.fields.dueHint" />}
                                valueFormat="DD.MM.YYYY"
                                clearable
                                disabled={!isManager}
                                {...editForm.getInputProps("dueDate")}
                            />
                            <Flex gap="sm" wrap="wrap">
                                {edit.assignee === user?.username && edit.status !== "DONE" && (
                                    <Button
                                        type="button"
                                        loading={isPatching}
                                        onClick={() => setStatus(edit, "REVIEW")}
                                    >
                                        <FormattedMessage id="pages.tasks.markReady" />
                                    </Button>
                                )}
                                {edit.customer === user?.username && (
                                    <>
                                        <Button
                                            type="button"
                                            color="orange"
                                            variant="light"
                                            loading={isPatching}
                                            onClick={() => setStatus(edit, "REDO")}
                                        >
                                            <FormattedMessage id="pages.tasks.markRedo" />
                                        </Button>
                                        <Button
                                            type="button"
                                            color="teal"
                                            loading={isPatching}
                                            onClick={() => setStatus(edit, "DONE")}
                                        >
                                            <FormattedMessage id="pages.tasks.markDone" />
                                        </Button>
                                    </>
                                )}
                            </Flex>
                            {isManager && (
                                <Flex gap="sm" wrap="wrap">
                                    <Button type="submit" loading={isPatching}>
                                        <FormattedMessage id="pages.tasks.save" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="light"
                                        loading={isArchiving}
                                        onClick={() => archiveCard(edit.id)}
                                    >
                                        <FormattedMessage id="pages.tasks.archive" />
                                    </Button>
                                    <Button
                                        type="button"
                                        color="red"
                                        variant="subtle"
                                        loading={isDeleting}
                                        onClick={() => deleteCard(edit.id)}
                                    >
                                        <FormattedMessage id="pages.tasks.delete" />
                                    </Button>
                                </Flex>
                            )}
                        </Flex>
                    </form>
                )}
            </Modal>
        </Flex>
    )
}

export default WorkTasksPage
