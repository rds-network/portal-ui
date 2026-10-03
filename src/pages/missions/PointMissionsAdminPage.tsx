import { Button, Checkbox, Flex, Modal, NumberInput, Text, TextInput, Textarea, Title } from "@mantine/core"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import {
    PointMissionApiService,
    PointMissionDto,
    PointMissionWriteRequest,
} from "src/shared/api/PointMissionApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import classes from "./PointMissionsAdminPage.module.scss"

const PointMissionsAdminPage: React.FC = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const [edit, setEdit] = useState<PointMissionDto | null>(null)

    setDocumentTitleByLocale("pages.pointMissionsAdmin.title")

    const form = useForm({
        initialValues: {
            title: "",
            description: "",
            points: 20,
            link: "",
            active: true,
            oneTime: true,
            sortOrder: 0,
        },
        validate: {
            title: (v) => (v.trim().length < 2 ? intl.formatMessage({ id: "pages.pointMissionsAdmin.required" }) : null),
            points: (v) => (v < 1 ? intl.formatMessage({ id: "pages.pointMissionsAdmin.badPoints" }) : null),
            link: (v) => {
                const t = v.trim()
                if (!t) return null
                if (!/^https?:\/\//i.test(t)) return intl.formatMessage({ id: "pages.pointMissionsAdmin.badUrl" })
                return null
            },
        },
    })

    const { data: items = [], isFetching } = useQuery({
        queryKey: ["admin-point-missions"],
        queryFn: () => PointMissionApiService.adminList(),
    })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-point-missions"] })

    const { mutate: save, isPending } = useMutation({
        mutationFn: (payload: PointMissionWriteRequest) =>
            edit ? PointMissionApiService.update(edit.id, payload) : PointMissionApiService.create(payload),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.pointMissionsAdmin.saved" />
                    </Text>,
                    null
                )
            )
            form.reset()
            setEdit(null)
            setOpen(false)
            refresh()
        },
    })

    const { mutate: remove } = useMutation({
        mutationFn: (id: string) => PointMissionApiService.remove(id),
        onSuccess: refresh,
    })

    const openCreate = () => {
        setEdit(null)
        form.reset()
        setOpen(true)
    }

    const openEdit = (item: PointMissionDto) => {
        setEdit(item)
        form.setValues({
            title: item.title,
            description: item.description || "",
            points: item.points,
            link: item.link || "",
            active: item.active,
            oneTime: item.oneTime,
            sortOrder: item.sortOrder,
        })
        setOpen(true)
    }

    return (
        <div className={classes.root}>
            <Flex justify="space-between" align="flex-start" gap="md" wrap="wrap">
                <div>
                    <Title order={2}>
                        <FormattedMessage id="pages.pointMissionsAdmin.title" />
                    </Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        <FormattedMessage id="pages.pointMissionsAdmin.description" />
                    </Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
                    <FormattedMessage id="pages.pointMissionsAdmin.create" />
                </Button>
            </Flex>

            {isFetching && items.length === 0 ? (
                <Text c="dimmed" size="sm">
                    …
                </Text>
            ) : items.length === 0 ? (
                <Text c="dimmed" size="sm">
                    <FormattedMessage id="pages.pointMissionsAdmin.empty" />
                </Text>
            ) : (
                <div className={classes.list}>
                    {items.map((item) => (
                        <div key={item.id} className={classes.row}>
                            <div className={classes.meta}>
                                <Text fw={700}>
                                    {item.title}{" "}
                                    <Text span c="blue" fw={700}>
                                        +{item.points}
                                    </Text>
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {item.description || "—"}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {item.active
                                        ? intl.formatMessage({ id: "pages.pointMissionsAdmin.active" })
                                        : intl.formatMessage({ id: "pages.pointMissionsAdmin.inactive" })}
                                    {" · "}
                                    {item.oneTime
                                        ? intl.formatMessage({ id: "pages.pointMissionsAdmin.oneTime" })
                                        : intl.formatMessage({ id: "pages.pointMissionsAdmin.repeatable" })}
                                    {item.link ? ` · ${item.link}` : ""}
                                </Text>
                            </div>
                            <Flex gap="xs">
                                <Button size="xs" variant="light" onClick={() => openEdit(item)}>
                                    <FormattedMessage id="pages.pointMissionsAdmin.edit" />
                                </Button>
                                <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => remove(item.id)}
                                >
                                    <FormattedMessage id="pages.pointMissionsAdmin.delete" />
                                </Button>
                            </Flex>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                opened={open}
                onClose={() => setOpen(false)}
                title={intl.formatMessage({
                    id: edit ? "pages.pointMissionsAdmin.editTitle" : "pages.pointMissionsAdmin.createTitle",
                })}
            >
                <form
                    onSubmit={form.onSubmit((values) =>
                        save({
                            title: values.title.trim(),
                            description: values.description.trim() || null,
                            points: Number(values.points),
                            link: values.link.trim() || null,
                            active: values.active,
                            oneTime: values.oneTime,
                            sortOrder: Number(values.sortOrder) || 0,
                        })
                    )}
                >
                    <Flex direction="column" gap="sm">
                        <TextInput
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldTitle" })}
                            {...form.getInputProps("title")}
                        />
                        <Textarea
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldDescription" })}
                            autosize
                            minRows={2}
                            {...form.getInputProps("description")}
                        />
                        <NumberInput
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldPoints" })}
                            min={1}
                            max={10000}
                            {...form.getInputProps("points")}
                        />
                        <TextInput
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldLink" })}
                            placeholder="https://"
                            {...form.getInputProps("link")}
                        />
                        <NumberInput
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldSort" })}
                            {...form.getInputProps("sortOrder")}
                        />
                        <Checkbox
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldActive" })}
                            {...form.getInputProps("active", { type: "checkbox" })}
                        />
                        <Checkbox
                            label={intl.formatMessage({ id: "pages.pointMissionsAdmin.fieldOneTime" })}
                            {...form.getInputProps("oneTime", { type: "checkbox" })}
                        />
                        <Button type="submit" loading={isPending}>
                            <FormattedMessage id="pages.pointMissionsAdmin.save" />
                        </Button>
                    </Flex>
                </form>
            </Modal>
        </div>
    )
}

export default PointMissionsAdminPage
