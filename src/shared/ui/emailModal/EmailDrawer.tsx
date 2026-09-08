import { Button, Drawer, Flex, Loader, Pill, Text, Textarea, TextInput } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { Link, RichTextEditor } from "@mantine/tiptap"
import { FileInfoDto } from "@rds-network/portal-api-axios"
import { IconMailForward } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import Highlight from "@tiptap/extension-highlight"
import SubScript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import React, { createRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { MailApiService } from "src/shared/api/MailApiService"
import EmailTemplate from "src/shared/email/EmailTemplate"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { FileUploader, FileUploaderInterface } from "src/shared/ui/fileUploader/FileUploader"
import classes from "./EmailDrawer.module.scss"
import { locales } from "./lib/locales"

interface EmailModalProps {
    opened: boolean
    close: () => void
    recipients: { name: string; email: string }[]
    templates?: EmailTemplate[] | undefined
    from?: string
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

    const { isFetching: sending, refetch: send } = useQuery({
        enabled: false,
        queryKey: ["sendEmail", topic, content],
        queryFn: () =>
            MailApiService.sendMail(
                topic,
                content,
                from,
                props.recipients[0].email,
                undefined,
                uploadedFiles.map((f) => f.id)
            ).then((_) => {
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
            }),
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
            size="xl"
        >
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
                    onFilesUploaded={(files) => setUploadedFiles(files)}
                    onFilesLoading={(files) => setLoadingFiles(files)}
                />
                {(uploadedFiles.length !== 0 || loadingFiles.length !== 0) && (
                    <Flex className={classes.filesContainer} wrap="wrap">
                        {uploadedFiles.map((file) => {
                            return (
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
                        disabled={sending || loadingFiles.length !== 0}
                    >
                        <FormattedMessage id={locales.send} />
                    </Button>
                </Flex>
            </Flex>
        </Drawer>
    )
}
