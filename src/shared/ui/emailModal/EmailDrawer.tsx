import { Anchor, Button, Drawer, Flex, Loader, Pill, Text, Textarea, TextInput } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { Link, RichTextEditor } from "@mantine/tiptap"
import { FileInfoDto } from "@rds-network/portal-api-axios"
import { IconMailForward } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"
import Highlight from "@tiptap/extension-highlight"
import SubScript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import React, { createRef, useEffect, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link as RouterLink } from "react-router"
import { FilesApiService } from "src/shared/api/FilesApiService"
import { MailApiService } from "src/shared/api/MailApiService"
import EmailTemplate from "src/shared/email/EmailTemplate"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { FileUploader, FileUploaderInterface } from "src/shared/ui/fileUploader/FileUploader"
import { AttachmentPreview } from "./AttachmentPreview"
import classes from "./EmailDrawer.module.scss"
import { locales } from "./lib/locales"

interface EmailModalProps {
    opened: boolean
    close: () => void
    recipients: { name: string; email: string }[]
    templates?: EmailTemplate[] | undefined
    from?: string
    /** Файлы, которые нужно загрузить и приложить при открытии окна. */
    prepareAttachments?: () => Promise<File[]>
    /** Куда перейти, если договор и анкета не приложились из‑за пустых дат. */
    datesHref?: string
}

export const EmailDrawer = (props: EmailModalProps) => {
    const intl = useIntl()

    const from = props.from || "Русская Диаспора <info@russian.rs>"
    const [topic, setTopic] = useState("")
    const [content, setContent] = useState("")
    const [template, setTemplate] = useState("")

    const fileUploaderRef = createRef<FileUploaderInterface>()
    const [uploadedFiles, setUploadedFiles] = useState<FileInfoDto[]>([])
    const [loadingFiles, setLoadingFiles] = useState<String[]>([])
    const [autoDocsNote, setAutoDocsNote] = useState<"attached" | "missing" | null>(null)
    const [attaching, setAttaching] = useState(false)
    const [previewId, setPreviewId] = useState<string | null>(null)
    const prepareRef = useRef(props.prepareAttachments)
    prepareRef.current = props.prepareAttachments

    const { mutate: send, isPending: sending } = useMutation({
        mutationFn: () =>
            MailApiService.sendMail(
                topic,
                content,
                from,
                props.recipients[0].email,
                undefined,
                uploadedFiles.map((f) => f.id)
            ),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id={locales.success} />
                    </Text>,
                    null
                )
            )
            props.close()
            setTopic("")
            setContent("")
            setTemplate("")
        },
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
            editable: !sending,
            content: template,
            onUpdate: ({ editor }) => {
                setContent(editor.getHTML())
            },
        },
        [sending, template]
    )

    useEffect(() => {
        if (!props.opened) {
            setUploadedFiles([])
            setLoadingFiles([])
            setAutoDocsNote(null)
            setAttaching(false)
            setPreviewId(null)
            return
        }
        const prepare = prepareRef.current
        if (!prepare) return
        let cancelled = false
        ;(async () => {
            setAttaching(true)
            try {
                const files = await prepare()
                if (cancelled) return
                if (files.length === 0) {
                    setAutoDocsNote("missing")
                    return
                }
                const uploaded: FileInfoDto[] = []
                for (const file of files) {
                    const resp = await FilesApiService.uploadFile(file)
                    uploaded.push(resp.data)
                }
                if (!cancelled) {
                    setUploadedFiles(uploaded)
                    setAutoDocsNote("attached")
                }
            } catch {
                // Генераторы PDF уже показывают, какого поля не хватает.
            } finally {
                if (!cancelled) setAttaching(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [props.opened])

    useEffect(() => {
        if (previewId && uploadedFiles.some((file) => file.id === previewId)) return
        const next = uploadedFiles.find((file) => file.name.toLowerCase().endsWith(".pdf")) ?? uploadedFiles[0]
        setPreviewId(next?.id ?? null)
    }, [uploadedFiles, previewId])

    const previewFile = uploadedFiles.find((file) => file.id === previewId) ?? null

    const onSend = () => {
        if (topic === "") {
            alert(intl.formatMessage({ id: locales.emptySubject }))
            return
        }
        if (content === "") {
            alert(intl.formatMessage({ id: locales.emptyContent }))
            return
        }
        send()
    }

    return (
        <Drawer
            opened={props.opened}
            onClose={props.close}
            title={<FormattedMessage id={locales.title} />}
            offset={16}
            radius="md"
            size={previewFile ? "min(76rem, 96vw)" : "xl"}
        >
            <div className={previewFile ? `${classes.shell} ${classes.shellSplit}` : classes.shell}>
            <Flex direction="column" className={classes.drawer}>
                <Textarea
                    label={<FormattedMessage id={locales.recipients} />}
                    disabled={true}
                    autosize
                    minRows={1}
                    withAsterisk
                    value={props.recipients
                        .map((r) => {
                            return `${r.name} <${r.email}>`
                        })
                        .join(", ")}
                />
                <TextInput
                    withAsterisk
                    label={<FormattedMessage id={locales.subject} />}
                    value={topic}
                    onChange={(event) => {
                        setTopic(event.target.value)
                    }}
                ></TextInput>
                <RichTextEditor editor={editor}>
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

                    <RichTextEditor.Content className={classes.editor} />
                </RichTextEditor>
                {props.templates && (
                    <Flex wrap="wrap" className={classes.templates}>
                        {props.templates.map((template) => (
                            <Pill
                                key={template.name}
                                disabled={sending}
                                className={classes.template}
                                onClick={() => {
                                    setTopic(template.topic)
                                    setContent(template.content)
                                    setTemplate(template.content)
                                }}
                            >
                                {template.name}
                            </Pill>
                        ))}
                    </Flex>
                )}
                <FileUploader
                    ref={fileUploaderRef}
                    maxFiles={10}
                    maxSize={10}
                    files={uploadedFiles}
                    onFilesUploaded={(files) => setUploadedFiles(files)}
                    onFilesLoading={(files) => setLoadingFiles(files)}
                />
                {attaching && (
                    <Flex align="center" gap={8}>
                        <Loader size={14} />
                        <Text size="sm" c="dimmed">
                            <FormattedMessage id={locales.attaching} />
                        </Text>
                    </Flex>
                )}
                {autoDocsNote === "attached" && (
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id={locales.autoDocs} />
                    </Text>
                )}
                {autoDocsNote === "missing" && (
                    <Text size="sm" c="red">
                        <FormattedMessage id={locales.autoDocsMissing} />{" "}
                        {props.datesHref && (
                            <Anchor component={RouterLink} to={props.datesHref} inherit onClick={props.close}>
                                <FormattedMessage id={locales.autoDocsSetDates} />
                            </Anchor>
                        )}
                    </Text>
                )}
                {(uploadedFiles.length !== 0 || loadingFiles.length !== 0) && (
                    <Flex className={classes.filesContainer} wrap="wrap">
                        {uploadedFiles.map((file) => {
                            return (
                                <Pill
                                    key={file.id}
                                    withRemoveButton
                                    className={
                                        file.id === previewId
                                            ? `${classes.filePill} ${classes.filePillActive}`
                                            : classes.filePill
                                    }
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setPreviewId(file.id)}
                                    onRemove={() => fileUploaderRef.current?.delete(file.id)}
                                >
                                    <Text className={classes.filePillText} truncate="end">
                                        {file.name}
                                    </Text>
                                </Pill>
                            )
                        })}
                        {loadingFiles.map((file, index) => {
                            return (
                                <Pill key={index} className={classes.filePill}>
                                    <Flex justify="center" align="center" columnGap={6}>
                                        <Text className={classes.filePillText} truncate="end" c="dimmed">
                                            {file}
                                        </Text>
                                        <Loader size={10} stroke="4" />
                                    </Flex>
                                </Pill>
                            )
                        })}
                    </Flex>
                )}
                <Flex>
                    <Button
                        onClick={onSend}
                        className={classes.sendButton}
                        leftSection={sending ? <Loader size={16} /> : <IconMailForward size={16} />}
                        disabled={sending || attaching || loadingFiles.length !== 0}
                    >
                        <FormattedMessage id={locales.send} />
                    </Button>
                </Flex>
            </Flex>
            {previewFile && <AttachmentPreview file={previewFile} />}
            </div>
        </Drawer>
    )
}
