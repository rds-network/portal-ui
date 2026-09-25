import { Badge, Button, Card, Flex, Text, Textarea, TextInput, Title } from "@mantine/core"
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
import { WorkAssignmentApiService, WorkAssignmentDto } from "src/shared/api/WorkAssignmentApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { NO_PROGRAM_CODE } from "src/shared/constants/Shared"
import { ProgramFilter } from "src/shared/ui/filter"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import classes from "./WorkTasksPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

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
    const isManager = hasPermission(user, MANAGERS)
    const [assignee, setAssignee] = useState<string | null>(null)
    const [program, setProgram] = useState<string | null>(null)
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

    const { data: assignments = [], isFetching } = useQuery({
        queryKey: ["work-assignments"],
        queryFn: () => WorkAssignmentApiService.list(),
    })

    const visible = useMemo(() => {
        if (isManager) return assignments
        return assignments.filter((item) => item.assignee === user?.username)
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
            setProgram(null)
            queryClient.invalidateQueries({ queryKey: ["work-assignments"] })
        },
    })

    const { mutate: patch } = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            WorkAssignmentApiService.patch(id, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-assignments"] }),
    })

    const onCreate = form.onSubmit((values) => {
        create({
            title: values.title.trim(),
            body: values.body.trim() || null,
            assignee,
            dueDate: values.dueDate ? dayjs(values.dueDate).format("YYYY-MM-DD") : null,
        })
    })

    const toReport = (item: WorkAssignmentDto) => {
        if (item.status === "TODO") {
            patch({ id: item.id, status: "DOING" })
        }
        navigate(`/report/create?task=${encodeURIComponent(item.title)}`)
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
                <Card withBorder p="lg" radius="lg">
                    <Title order={4} mb="md">
                        <FormattedMessage id="pages.tasks.create" />
                    </Title>
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
                            <DateInput
                                label={<FormattedMessage id="pages.tasks.fields.due" />}
                                valueFormat="DD.MM.YYYY"
                                clearable
                                {...form.getInputProps("dueDate")}
                            />
                            <Button type="submit" leftSection={<IconPlus size={16} />} loading={isPending} w="fit-content">
                                <FormattedMessage id="pages.tasks.submit" />
                            </Button>
                        </Flex>
                    </form>
                </Card>
            )}

            {visible.length === 0 && !isFetching ? (
                <Text c="dimmed">
                    <FormattedMessage id="pages.tasks.empty" />
                </Text>
            ) : (
                <div className={classes.grid}>
                    {visible.map((item) => (
                        <article key={item.id} className={classes.card}>
                            <div className={classes.meta}>
                                <Badge variant="light" color={STATUS_COLOR[item.status] ?? "gray"}>
                                    <FormattedMessage id={`pages.tasks.status.${item.status}`} />
                                </Badge>
                                {item.dueDate && (
                                    <Badge variant="outline" color="gray">
                                        {dayjs(item.dueDate).format("DD.MM")}
                                    </Badge>
                                )}
                            </div>
                            <div className={classes.title}>{item.title}</div>
                            {item.body && <div className={classes.body}>{item.body}</div>}
                            <Text className={classes.assignee} c="dimmed">
                                {item.assigneeName || item.assignee || "—"}
                            </Text>
                            {item.status !== "DONE" && item.assignee === user?.username && (
                                <div className={classes.actions}>
                                    {item.status === "TODO" && (
                                        <Button
                                            size="xs"
                                            variant="light"
                                            onClick={() => patch({ id: item.id, status: "DOING" })}
                                        >
                                            <FormattedMessage id="pages.tasks.take" />
                                        </Button>
                                    )}
                                    <Button
                                        size="xs"
                                        leftSection={<IconChecklist size={14} />}
                                        onClick={() => toReport(item)}
                                    >
                                        <FormattedMessage id="pages.tasks.to-report" />
                                    </Button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </Flex>
    )
}

export default WorkTasksPage
