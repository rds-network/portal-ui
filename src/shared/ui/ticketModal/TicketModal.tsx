import { Alert, Button, Drawer, Flex, Loader, Pill, Select, Text, Textarea, TextInput } from "@mantine/core"
import { useForm, zodResolver } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { Link, RichTextEditor } from "@mantine/tiptap"
import { FileInfoDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { TicketCreateRequest } from "@rds-network/portal-api-axios/api"
import { IconDeviceIpadCheck, IconLabel, IconLifebuoy, IconUser } from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import Highlight from "@tiptap/extension-highlight"
import SubScript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import parse from "html-react-parser"
import React, { useEffect, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { TicketApiService } from "src/shared/api/TicketApiService"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import TicketTemplate from "src/shared/ticket/TicketTemplate"
import { FileUploader, FileUploaderInterface } from "src/shared/ui/fileUploader/FileUploader"
import { TicketGroupTarget, pickTicketGroupByTarget } from "src/shared/ui/ticketModal/lib/groupTarget"
import { locales } from "src/shared/ui/ticketModal/lib/locales"
import classes from "src/shared/ui/ticketModal/TicketModal.module.scss"
import { z } from "zod"

interface TicketModalProps {
    opened: boolean
    close: () => void
    fromUser?: UserInfoDto
    toUser?: UserInfoDto
    /** legacy props */
    title?: string
    body?: string
    /** preferred props for pre-filling */
    initialTitle?: string
    initialBody?: string
    initialGroup?: string
    groupTarget?: TicketGroupTarget
    allowAttachments?: boolean
    attachmentsRequired?: boolean
    templates?: TicketTemplate[]
}

type TicketFormValues = {
    title: string
    group: string
    body: string
}

export const TicketModal: React.FC<TicketModalProps> = ({
    opened,
    close,
    fromUser,
    toUser,
    title,
    body,
    initialTitle,
    initialBody,
    initialGroup,
    groupTarget,
    allowAttachments = true,
    attachmentsRequired = false,
    templates,
}) => {
    const intl = useIntl()

    const fileUploaderRef = useRef<FileUploaderInterface | null>(null)
    const [uploadedFiles, setUploadedFiles] = useState<FileInfoDto[]>([])
    const [loadingFiles, setLoadingFiles] = useState<string[]>([])

    const { data: ticketGroups } = useQuery({
        queryKey: ["ticketGroups"],
        queryFn: () => TicketApiService.getTicketGroups().then((r) => r.data),
    })

    const requiredMessage = { message: intl.formatMessage({ id: locales.required }) }

    const validationSchema = z.object({
        title: z.string(requiredMessage).nonempty(requiredMessage),
        group: z.string(requiredMessage).nonempty(requiredMessage),
        body: z.string(requiredMessage).nonempty(requiredMessage),
    })

    const form = useForm<TicketFormValues>({
        mode: "uncontrolled",
        validate: zodResolver(validationSchema),
        initialValues: {
            title: initialTitle ?? title ?? "",
            group: "",
            body: initialBody ?? body ?? "",
        },
    })

    const { mutateAsync: createTicket, isPending: creating } = useMutation({
        mutationFn: (payload: TicketCreateRequest) => TicketApiService.createTicket(payload),
    })

    const editor = useEditor(
        {
            extensions: [
                StarterKit,
                Underline,
                Link,
                Superscript,
                SubScript,
                Highlight,
                TextAlign.configure({ types: ["heading", "paragraph"] }),
            ],
            editable: !creating,
            content: form.getValues().body,
            onUpdate: ({ editor }) => {
                form.setFieldValue("body", editor.getHTML())
            },
        },
        [creating]
    )

    useEffect(() => {
        if (!opened) return

        // Reset group + files every time modal opens
        form.setFieldValue("group", initialGroup ?? "")
        setUploadedFiles([])
        setLoadingFiles([])

        const nextTitle = initialTitle ?? title ?? ""
        const nextBody = initialBody ?? body ?? ""

        form.setFieldValue("title", nextTitle)
        form.setFieldValue("body", nextBody)
        editor?.commands.setContent(nextBody || "")
    }, [opened, initialTitle, initialBody, initialGroup, title, body, editor])

    useEffect(() => {
        if (!opened) return
        if (form.getValues().group) return

        const selected = initialGroup ?? pickTicketGroupByTarget(ticketGroups, groupTarget)
        if (!selected) return

        form.setFieldValue("group", selected)
    }, [opened, ticketGroups, groupTarget, initialGroup])

    const hasAttachments = uploadedFiles.length > 0 || loadingFiles.length > 0

    const handleTemplateClick = (template: TicketTemplate) => {
        form.setFieldValue("title", template.topic)
        form.setFieldValue("body", template.content)
        editor?.commands.setContent(template.content)
    }

    const handleSubmit = async (values: TicketFormValues) => {
        console.log(values)
        try {
            if (attachmentsRequired && uploadedFiles.length === 0) {
                notifications.show(
                    ErrorNotification(
                        <Text size="sm">{intl.formatMessage({ id: "common.ticket-modal.attachmentsRequired" })}</Text>,
                        null
                    )
                )
                return
            }

            const createdTicket = await createTicket({
                toUser: toUser?.username ?? null,
                fromUser: fromUser?.username ?? null,
                group: values.group,
                title: values.title,
                body: values.body,
                attachments: uploadedFiles.map((f) => f.id),
            })

            console.log(createdTicket.data)

            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        {parse(
                            intl.formatMessage(
                                { id: locales.success },
                                {
                                    number: createdTicket.data.id,
                                    link: createdTicket.data.ticketLink,
                                },
                                { ignoreTag: true }
                            )
                        )}
                    </Text>,
                    null
                )
            )

            // 🔥 CLEAR FORM + EDITOR + FILES
            form.reset()
            editor?.commands.clearContent()
            setUploadedFiles([])
            setLoadingFiles([])

            close()
        } catch (e) {
            notifications.show(
                ErrorNotification(<Text size="sm">{parse(intl.formatMessage({ id: locales.error }))}</Text>, null)
            )
        }
    }

    return (
        <Drawer
            opened={opened}
            onClose={close}
            title={<FormattedMessage id={locales.modalTitle} />}
            offset={16}
            radius="md"
            size="xl"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Flex direction="column" className={classes.drawer} gap="md">
                    {toUser && (
                        <Flex direction="column" gap="lg">
                            <Alert variant="light" color="blue">
                                {parse(intl.formatMessage({ id: locales.internalDescription }))}
                            </Alert>

                            <Textarea
                                label={<FormattedMessage id={locales.toUser} />}
                                leftSection={<IconUser size={14} />}
                                description={intl.formatMessage({ id: locales.toUserDescription })}
                                disabled
                                autosize
                                minRows={1}
                                withAsterisk
                                value={toUser.fullName}
                            />
                        </Flex>
                    )}

                    {fromUser && !toUser && (
                        <Alert variant="light" color="blue">
                            {parse(intl.formatMessage({ id: locales.publicDescription }))}
                        </Alert>
                    )}

                    <TextInput
                        withAsterisk
                        leftSection={<IconLabel size={14} />}
                        label={<FormattedMessage id={locales.titleLabel} />}
                        key={form.key("title")}
                        {...form.getInputProps("title")}
                    />

                    <Select
                        withAsterisk
                        leftSection={<IconLifebuoy size={14} />}
                        label={intl.formatMessage({ id: locales.group })}
                        placeholder={intl.formatMessage({ id: locales.groupPlaceholder })}
                        description={intl.formatMessage({ id: locales.groupDescription })}
                        allowDeselect={false}
                        data={ticketGroups}
                        key={form.key("group")}
                        {...form.getInputProps("group")}
                    />

                    <RichTextEditor editor={editor} style={{ minHeight: 200 }}>
                        <RichTextEditor.Toolbar sticky stickyOffset={60}>
                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Bold />
                                <RichTextEditor.Italic />
                                <RichTextEditor.Underline />
                                <RichTextEditor.Strikethrough />
                                <RichTextEditor.ClearFormatting />
                                <RichTextEditor.Highlight />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.H1 />
                                <RichTextEditor.H2 />
                                <RichTextEditor.H3 />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Link />
                                <RichTextEditor.Unlink />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.AlignLeft />
                                <RichTextEditor.AlignCenter />
                                <RichTextEditor.AlignJustify />
                                <RichTextEditor.AlignRight />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Undo />
                                <RichTextEditor.Redo />
                            </RichTextEditor.ControlsGroup>
                        </RichTextEditor.Toolbar>

                        <RichTextEditor.Content />
                    </RichTextEditor>

                    {form.errors.body && (
                        <Text size="xs" c="red.7" mt={4}>
                            {form.errors.body}
                        </Text>
                    )}

                    {templates && templates.length > 0 && (
                        <Flex wrap="wrap" className={classes.templates}>
                            {templates.map((template) => (
                                <Pill
                                    key={template.name}
                                    disabled={creating}
                                    className={classes.template}
                                    onClick={() => handleTemplateClick(template)}
                                >
                                    {template.name}
                                </Pill>
                            ))}
                        </Flex>
                    )}

                    {fromUser && allowAttachments && (
                        <FileUploader
                            ref={fileUploaderRef}
                            maxFiles={10}
                            maxSize={10}
                            onFilesUploaded={setUploadedFiles}
                            onFilesLoading={setLoadingFiles}
                        />
                    )}

                    {hasAttachments && (
                        <Flex className={classes.filesContainer} wrap="wrap">
                            {uploadedFiles.map((file) => (
                                <Pill
                                    key={file.id}
                                    withRemoveButton
                                    className={classes.filePill}
                                    onRemove={() => fileUploaderRef.current?.delete(file.id)}
                                >
                                    <Text className={classes.filePillText} truncate="end">
                                        {file.name}
                                    </Text>
                                </Pill>
                            ))}

                            {loadingFiles.map((file, index) => (
                                <Pill key={index} className={classes.filePill}>
                                    <Flex justify="center" align="center" columnGap={6}>
                                        <Text className={classes.filePillText} truncate="end" c="dimmed">
                                            {file}
                                        </Text>
                                        <Loader size={10} stroke="4" />
                                    </Flex>
                                </Pill>
                            ))}
                        </Flex>
                    )}

                    <Flex>
                        <Button
                            type="submit"
                            className={classes.sendButton}
                            leftSection={creating ? <Loader size={16} /> : <IconDeviceIpadCheck size={16} />}
                            disabled={creating || loadingFiles.length !== 0}
                        >
                            <FormattedMessage id={locales.create} />
                        </Button>
                    </Flex>
                </Flex>
            </form>
        </Drawer>
    )
}

export default TicketModal
