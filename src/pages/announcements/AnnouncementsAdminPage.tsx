import { Button, Card, Flex, Select, Text, TextInput, Title } from "@mantine/core"
import { useForm, zodResolver } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { Link, RichTextEditor } from "@mantine/tiptap"
import { AnnouncementAudience } from "@rds-network/portal-api-axios"
import { IconSend } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Highlight from "@tiptap/extension-highlight"
import SubScript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { AnnouncementExtraApi } from "src/shared/api/AnnouncementApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { hasPermission } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { z } from "zod"
import classes from "./AnnouncementsAdminPage.module.scss"

const ADMIN_ROLES = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]

type AudienceChoice = AnnouncementAudience | "USER"

type AnnouncementFormValues = {
    title: string
    body: string
    audience: AudienceChoice
    programCode: string | null
    username: string | null
    placement: "bell" | "banner"
}

export const AnnouncementsAdminPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const intl = useIntl()
    const queryClient = useQueryClient()

    setDocumentTitleByLocale("pages.announcements.admin.title")

    const requiredMessage = { message: intl.formatMessage({ id: "pages.announcements.admin.required" }) }
    const minMessage = (count: number) => intl.formatMessage({ id: "pages.user-list.min-letters" }, { count })
    const maxMessage = (count: number) => intl.formatMessage({ id: "pages.user-list.max-letters" }, { count })

    const validationSchema = useMemo(
        () =>
            z
                .object({
                    title: z.string(requiredMessage).trim().min(3, minMessage(3)).max(200, maxMessage(200)),
                    body: z.string(requiredMessage).trim().min(1, requiredMessage).max(10000, maxMessage(10000)),
                    audience: z.enum(
                        [AnnouncementAudience.All, AnnouncementAudience.Program, "USER"],
                        requiredMessage
                    ),
                    programCode: z.string().nullable(),
                    username: z.string().nullable(),
                    placement: z.enum(["bell", "banner"]),
                })
                .superRefine((values, ctx) => {
                    if (values.placement === "banner" && values.audience === "USER") {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["audience"],
                            message: intl.formatMessage({ id: "pages.announcements.admin.bannerNoPerson" }),
                        })
                    }
                    if (values.audience === AnnouncementAudience.Program && !values.programCode) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["programCode"],
                            message: intl.formatMessage({ id: "pages.announcements.admin.emptyProgram" }),
                        })
                    }
                    if (values.audience === "USER" && !values.username) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["username"],
                            message: intl.formatMessage({ id: "pages.announcements.admin.emptyPerson" }),
                        })
                    }
                }),
        [intl]
    )

    const form = useForm<AnnouncementFormValues>({
        initialValues: {
            title: "",
            body: "",
            audience: AnnouncementAudience.All,
            programCode: null,
            username: null,
            placement: "bell",
        },
        validate: zodResolver(validationSchema),
    })

    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })
    const isManager = hasPermission(user, ADMIN_ROLES)
    const curatorPrograms = curatorMe?.programs || []
    const isCuratorOnly = !isManager && !!curatorMe?.curator

    useEffect(() => {
        if (!user || curatorMe === undefined) return
        if (!isManager && !curatorMe.curator) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, isManager, curatorMe, navigate])

    useEffect(() => {
        if (!isCuratorOnly) return
        form.setFieldValue("audience", AnnouncementAudience.Program)
        if (curatorPrograms.length === 1) {
            form.setFieldValue("programCode", curatorPrograms[0])
        }
    }, [isCuratorOnly, curatorPrograms.join(",")])

    const { data: programs = [] } = useQuery({
        queryKey: ["programs"],
        queryFn: () => ProgramsApiService.getPrograms().then((r) => r.data),
    })

    const programOptions = useMemo(
        () =>
            programs
                .filter((program) => !isCuratorOnly || curatorPrograms.includes(program.code))
                .map((program) => ({
                    value: program.code,
                    label: getLocalizedName(program, intl.locale) || program.code,
                })),
        [programs, intl.locale, isCuratorOnly, curatorPrograms]
    )

    const [person, setPerson] = useState<string | null>(null)

    const { mutate: publish, isPending } = useMutation({
        mutationFn: async (values: AnnouncementFormValues) => {
            return AnnouncementExtraApi.publish({
                title: values.title.trim(),
                body: values.body.trim(),
                audience: values.audience,
                programCode: values.audience === AnnouncementAudience.Program ? values.programCode : null,
                username: values.audience === "USER" ? values.username : null,
                banner: values.placement === "banner",
            })
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
            editable: !isPending,
            content: "",
            onUpdate: ({ editor }) => {
                form.setFieldValue("body", editor.getHTML())
            },
        },
        [isPending]
    )

    const onPublish = form.onSubmit((values) => {
        publish(
            {
                ...values,
                username: person,
            },
            {
                onSuccess: () => {
                    notifications.show(
                        SuccessNotification(
                            <Text size="sm">
                                <FormattedMessage id="pages.announcements.admin.success" />
                            </Text>,
                            null
                        )
                    )
                    form.reset()
                    setPerson(null)
                    editor?.commands.clearContent()
                    queryClient.invalidateQueries({ queryKey: ["announcements"] })
                    queryClient.invalidateQueries({ queryKey: ["inbox"] })
                    queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
                },
            }
        )
    })

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <Title order={2}>
                <FormattedMessage id="pages.announcements.admin.title" />
            </Title>
            <Text c="dimmed">
                <FormattedMessage id="pages.announcements.admin.description" />
            </Text>

            <Card withBorder p="lg" className={classes.editorCard}>
                <form onSubmit={onPublish}>
                    <Flex direction="column" gap="md">
                        <TextInput
                            label={<FormattedMessage id="pages.announcements.admin.fields.title" />}
                            maxLength={200}
                            {...form.getInputProps("title")}
                        />

                        <Flex direction="column" gap={4}>
                            <Text size="sm" fw={500}>
                                <FormattedMessage id="pages.announcements.admin.fields.body" />
                            </Text>
                            <RichTextEditor editor={editor} style={{ minHeight: 200 }}>
                                <RichTextEditor.Toolbar sticky>
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
                                <Text size="xs" c="red.7">
                                    {form.errors.body}
                                </Text>
                            )}
                        </Flex>

                        <Select
                            label={<FormattedMessage id="pages.announcements.admin.fields.placement" />}
                            data={[
                                {
                                    value: "bell",
                                    label: intl.formatMessage({ id: "pages.announcements.admin.placement.bell" }),
                                },
                                {
                                    value: "banner",
                                    label: intl.formatMessage({ id: "pages.announcements.admin.placement.banner" }),
                                },
                            ]}
                            {...form.getInputProps("placement")}
                            onChange={(value) => {
                                form.setFieldValue("placement", value === "banner" ? "banner" : "bell")
                                if (value === "banner" && form.values.audience === "USER") {
                                    form.setFieldValue("audience", AnnouncementAudience.All)
                                    form.setFieldValue("username", null)
                                    setPerson(null)
                                }
                            }}
                        />
                        <Select
                            label={<FormattedMessage id="pages.announcements.admin.fields.audience" />}
                            data={[
                                ...(!isCuratorOnly
                                    ? [
                                          {
                                              value: AnnouncementAudience.All,
                                              label: intl.formatMessage({
                                                  id: "pages.announcements.admin.audience.all",
                                              }),
                                          },
                                      ]
                                    : []),
                                {
                                    value: AnnouncementAudience.Program,
                                    label: intl.formatMessage({ id: "pages.announcements.admin.audience.program" }),
                                },
                                ...(!isCuratorOnly && form.values.placement !== "banner"
                                    ? [
                                          {
                                              value: "USER",
                                              label: intl.formatMessage({
                                                  id: "pages.announcements.admin.audience.person",
                                              }),
                                          },
                                      ]
                                    : []),
                            ]}
                            {...form.getInputProps("audience")}
                            onChange={(value) => {
                                form.setFieldValue("audience", (value as AudienceChoice) || AnnouncementAudience.All)
                                if (value !== AnnouncementAudience.Program) {
                                    form.setFieldValue("programCode", null)
                                }
                                if (value !== "USER") {
                                    form.setFieldValue("username", null)
                                    setPerson(null)
                                }
                            }}
                        />
                        {form.values.audience === "USER" && (
                            <UserSearch
                                key="announce-person"
                                label={<FormattedMessage id="pages.announcements.admin.fields.person" />}
                                onUserChange={(picked) => {
                                    const login = picked?.username ?? null
                                    setPerson(login)
                                    form.setFieldValue("username", login)
                                }}
                            />
                        )}
                        {form.values.audience === AnnouncementAudience.Program && (
                            <Select
                                label={<FormattedMessage id="pages.announcements.admin.fields.program" />}
                                placeholder={intl.formatMessage({
                                    id: "pages.announcements.admin.fields.programPlaceholder",
                                })}
                                data={programOptions}
                                searchable
                                {...form.getInputProps("programCode")}
                            />
                        )}
                        <Button type="submit" leftSection={<IconSend size={16} />} loading={isPending}>
                            <FormattedMessage id="pages.announcements.admin.publish" />
                        </Button>
                    </Flex>
                </form>
            </Card>
        </Flex>
    )
}

export default AnnouncementsAdminPage
