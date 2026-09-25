import { Anchor, Button, Card, Flex, Modal, Text, TextInput, Textarea, Title } from "@mantine/core"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconExternalLink, IconPlus, IconTrash } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useContext, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { OrgLinkApiService, OrgLinkDto, OrgLinkWriteRequest } from "src/shared/api/OrgLinkApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./ResourcesPage.module.scss"

const SUPERVISORS = [UserGroup.ADMIN, UserGroup.ADMIN_SSO, UserGroup.MAIN_VOLUNTEER]

export const ResourcesPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const queryClient = useQueryClient()
    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })
    const isManager = !!curatorMe?.curator || hasPermission(user, SUPERVISORS)
    const [open, setOpen] = useState(false)
    const [edit, setEdit] = useState<OrgLinkDto | null>(null)

    setDocumentTitleByLocale("pages.resources.title")

    const form = useForm({
        initialValues: {
            title: "",
            url: "",
            description: "",
        },
        validate: {
            title: (value) => (value.trim().length < 2 ? intl.formatMessage({ id: "pages.resources.required" }) : null),
            url: (value) =>
                value.trim().length < 8 || !/^https?:\/\//i.test(value.trim())
                    ? intl.formatMessage({ id: "pages.resources.badUrl" })
                    : null,
        },
    })

    const { data: links = [], isFetching } = useQuery({
        queryKey: ["org-links"],
        queryFn: () => OrgLinkApiService.list(),
    })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["org-links"] })

    const { mutate: save, isPending } = useMutation({
        mutationFn: (payload: OrgLinkWriteRequest) =>
            edit ? OrgLinkApiService.update(edit.id, payload) : OrgLinkApiService.create(payload),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.resources.saved" />
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
        mutationFn: (id: string) => OrgLinkApiService.remove(id),
        onSuccess: refresh,
    })

    const openCreate = () => {
        setEdit(null)
        form.reset()
        setOpen(true)
    }

    const openEdit = (item: OrgLinkDto) => {
        setEdit(item)
        form.setValues({
            title: item.title,
            url: item.url,
            description: item.description || "",
        })
        setOpen(true)
    }

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.resources.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.resources.description" />
                </Text>
            </div>

            {isManager && (
                <Button leftSection={<IconPlus size={16} />} w="fit-content" onClick={openCreate}>
                    <FormattedMessage id="pages.resources.add" />
                </Button>
            )}

            {links.length === 0 && !isFetching ? (
                <Text c="dimmed">
                    <FormattedMessage id="pages.resources.empty" />
                </Text>
            ) : (
                <div className={classes.grid}>
                    {links.map((item) => (
                        <Card key={item.id} withBorder p="lg" radius="lg" className={classes.card}>
                            <Anchor href={item.url} target="_blank" fw={650} className={classes.title}>
                                {item.title}
                                <IconExternalLink size={16} />
                            </Anchor>
                            {item.description && (
                                <Text size="sm" c="dimmed" mt={8}>
                                    {item.description}
                                </Text>
                            )}
                            <Text size="xs" c="dimmed" mt={10} className={classes.url}>
                                {item.url}
                            </Text>
                            {isManager && (
                                <Flex gap="sm" mt="md">
                                    <Button size="xs" variant="light" onClick={() => openEdit(item)}>
                                        <FormattedMessage id="pages.resources.edit" />
                                    </Button>
                                    <Button
                                        size="xs"
                                        color="red"
                                        variant="subtle"
                                        leftSection={<IconTrash size={14} />}
                                        onClick={() => remove(item.id)}
                                    >
                                        <FormattedMessage id="common.buttons.delete" />
                                    </Button>
                                </Flex>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                opened={open}
                onClose={() => setOpen(false)}
                title={<FormattedMessage id={edit ? "pages.resources.edit" : "pages.resources.add"} />}
                centered
            >
                <form
                    onSubmit={form.onSubmit((values) =>
                        save({
                            title: values.title.trim(),
                            url: values.url.trim(),
                            description: values.description.trim() || null,
                        })
                    )}
                >
                    <Flex direction="column" gap="sm">
                        <TextInput
                            label={<FormattedMessage id="pages.resources.fields.title" />}
                            {...form.getInputProps("title")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.resources.fields.url" />}
                            {...form.getInputProps("url")}
                        />
                        <Textarea
                            label={<FormattedMessage id="pages.resources.fields.description" />}
                            minRows={3}
                            {...form.getInputProps("description")}
                        />
                        <Button type="submit" loading={isPending}>
                            <FormattedMessage id="pages.resources.save" />
                        </Button>
                    </Flex>
                </form>
            </Modal>
        </Flex>
    )
}

export default ResourcesPage
