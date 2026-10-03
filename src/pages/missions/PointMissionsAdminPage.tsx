import {
    Button,
    Checkbox,
    FileButton,
    Flex,
    Modal,
    NumberInput,
    SegmentedControl,
    Text,
    TextInput,
    Textarea,
    Title,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconPlus, IconTrash, IconUpload } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { FilesApiService } from "src/shared/api/FilesApiService"
import {
    PointMissionApiService,
    PointMissionDto,
    PointMissionWriteRequest,
} from "src/shared/api/PointMissionApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import {
    MISSION_PICTOGRAMS,
    MissionVisualMark,
    MissionVisualType,
} from "src/shared/missions/missionVisuals"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import classes from "./PointMissionsAdminPage.module.scss"

type FormValues = {
    title: string
    description: string
    points: number
    link: string
    active: boolean
    oneTime: boolean
    sortOrder: number
    visualType: MissionVisualType
    visualKey: string
    imageUrl: string
}

const PointMissionsAdminPage: React.FC = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const [edit, setEdit] = useState<PointMissionDto | null>(null)
    const [uploading, setUploading] = useState(false)

    setDocumentTitleByLocale("pages.pointMissionsAdmin.title")

    const form = useForm<FormValues>({
        initialValues: {
            title: "",
            description: "",
            points: 20,
            link: "",
            active: true,
            oneTime: true,
            sortOrder: 0,
            visualType: "PICTOGRAM",
            visualKey: "star",
            imageUrl: "",
        },
        validate: {
            title: (v) =>
                v.trim().length < 2 ? intl.formatMessage({ id: "pages.pointMissionsAdmin.required" }) : null,
            points: (v) => (v < 1 ? intl.formatMessage({ id: "pages.pointMissionsAdmin.badPoints" }) : null),
            link: (v) => {
                const t = v.trim()
                if (!t) return null
                if (!/^https?:\/\//i.test(t)) return intl.formatMessage({ id: "pages.pointMissionsAdmin.badUrl" })
                return null
            },
            imageUrl: (v, values) => {
                if (values.visualType === "PICTOGRAM") return null
                const t = v.trim()
                if (!t) return intl.formatMessage({ id: "pages.pointMissionsAdmin.imageRequired" })
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
            visualType: ((item.visualType as MissionVisualType) || "PICTOGRAM") as MissionVisualType,
            visualKey: item.visualKey || "star",
            imageUrl: item.imageUrl || "",
        })
        setOpen(true)
    }

    const uploadImage = async (file: File | null) => {
        if (!file) return
        setUploading(true)
        try {
            const resp = await FilesApiService.uploadFile(file)
            const link = resp.data?.link
            if (link) form.setFieldValue("imageUrl", link)
        } finally {
            setUploading(false)
        }
    }

    const toPayload = (values: FormValues): PointMissionWriteRequest => ({
        title: values.title.trim(),
        description: values.description.trim() || null,
        points: Number(values.points),
        link: values.link.trim() || null,
        active: values.active,
        oneTime: values.oneTime,
        sortOrder: Number(values.sortOrder) || 0,
        visualType: values.visualType,
        visualKey: values.visualType === "PICTOGRAM" ? values.visualKey : null,
        imageUrl: values.visualType === "PICTOGRAM" ? null : values.imageUrl.trim() || null,
    })

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
                            <MissionVisualMark
                                visualType={item.visualType}
                                visualKey={item.visualKey}
                                imageUrl={item.imageUrl}
                                size={48}
                            />
                            <div className={classes.meta}>
                                <Text fw={700}>
                                    {item.title}{" "}
                                    <Text span c="teal" fw={700}>
                                        +{item.points}
                                    </Text>
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {item.description || "—"}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {intl.formatMessage({
                                        id: `pages.pointMissionsAdmin.visual.${(item.visualType || "PICTOGRAM").toLowerCase()}`,
                                    })}
                                    {" · "}
                                    {item.active
                                        ? intl.formatMessage({ id: "pages.pointMissionsAdmin.active" })
                                        : intl.formatMessage({ id: "pages.pointMissionsAdmin.inactive" })}
                                    {" · "}
                                    {item.oneTime
                                        ? intl.formatMessage({ id: "pages.pointMissionsAdmin.oneTime" })
                                        : intl.formatMessage({ id: "pages.pointMissionsAdmin.repeatable" })}
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
                size="lg"
            >
                <form onSubmit={form.onSubmit((values) => save(toPayload(values)))}>
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

                        <div>
                            <Text size="sm" fw={600} mb={6}>
                                <FormattedMessage id="pages.pointMissionsAdmin.fieldVisual" />
                            </Text>
                            <SegmentedControl
                                fullWidth
                                value={form.values.visualType}
                                onChange={(v) => form.setFieldValue("visualType", v as MissionVisualType)}
                                data={[
                                    {
                                        value: "PICTOGRAM",
                                        label: intl.formatMessage({
                                            id: "pages.pointMissionsAdmin.visual.pictogram",
                                        }),
                                    },
                                    {
                                        value: "LOGO",
                                        label: intl.formatMessage({
                                            id: "pages.pointMissionsAdmin.visual.logo",
                                        }),
                                    },
                                    {
                                        value: "COVER",
                                        label: intl.formatMessage({
                                            id: "pages.pointMissionsAdmin.visual.cover",
                                        }),
                                    },
                                ]}
                            />
                        </div>

                        {form.values.visualType === "PICTOGRAM" ? (
                            <div className={classes.pictogramGrid}>
                                {MISSION_PICTOGRAMS.map((key) => {
                                    const selected = form.values.visualKey === key
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            className={`${classes.pictogramBtn} ${
                                                selected ? classes.pictogramSelected : ""
                                            }`}
                                            onClick={() => form.setFieldValue("visualKey", key)}
                                            title={key}
                                        >
                                            <MissionVisualMark visualType="PICTOGRAM" visualKey={key} size={44} />
                                            <span>
                                                {intl.formatMessage({
                                                    id: `pages.pointMissionsAdmin.icons.${key}`,
                                                })}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <Flex direction="column" gap="xs">
                                <Text size="xs" c="dimmed">
                                    <FormattedMessage
                                        id={
                                            form.values.visualType === "COVER"
                                                ? "pages.pointMissionsAdmin.coverHint"
                                                : "pages.pointMissionsAdmin.logoHint"
                                        }
                                    />
                                </Text>
                                <Flex gap="sm" align="flex-end" wrap="wrap">
                                    <TextInput
                                        style={{ flex: 1, minWidth: 220 }}
                                        label={intl.formatMessage({
                                            id: "pages.pointMissionsAdmin.fieldImageUrl",
                                        })}
                                        placeholder="https://"
                                        {...form.getInputProps("imageUrl")}
                                    />
                                    <FileButton onChange={uploadImage} accept="image/*">
                                        {(props) => (
                                            <Button
                                                {...props}
                                                variant="light"
                                                loading={uploading}
                                                leftSection={<IconUpload size={16} />}
                                            >
                                                <FormattedMessage id="pages.pointMissionsAdmin.upload" />
                                            </Button>
                                        )}
                                    </FileButton>
                                </Flex>
                                {form.values.imageUrl && (
                                    <div className={classes.preview}>
                                        {form.values.visualType === "COVER" ? (
                                            <img
                                                src={form.values.imageUrl}
                                                alt=""
                                                className={classes.previewCover}
                                            />
                                        ) : (
                                            <MissionVisualMark
                                                visualType="LOGO"
                                                imageUrl={form.values.imageUrl}
                                                size={64}
                                            />
                                        )}
                                    </div>
                                )}
                            </Flex>
                        )}

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
