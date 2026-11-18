import { Alert, Button, Checkbox, Divider, Flex, Input, SegmentedControl, Text, TextInput, Title } from "@mantine/core"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { IconArrowLeft, IconFileTypeDoc, IconMail, IconMessage } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { sendPotvrdaToInbox } from "src/pages/documents/potvrdaDelivery"
import { issueYearFromFormDate, toApiDate } from "src/pages/documents/potvrdaDates"
import { PotvrdaDocxPreview } from "src/pages/documents/PotvrdaDocxPreview"
import { PotvrdaSignSection } from "src/pages/documents/PotvrdaSignSection"
import { ApplicationLookupApiService } from "src/shared/api/applications/ApplicationLookupApiService"
import { PotvrdaApiService } from "src/shared/api/PotvrdaApiService"
import { mupLetterOf, UserApiService } from "src/shared/api/user/UserApiService"
import {
    buildTerminationPotvrdaBlob,
    defaultTerminationPotvrdaFields,
    TerminationPotvrdaInput,
    terminationReasonSummary,
} from "src/shared/docs/potvrdaTerminationDocx"
import { loadPotvrdaSignDraft, PotvrdaSignDraft } from "src/shared/docs/potvrdaSignDraft"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { hasPermission } from "src/shared/user/roles"
import { z } from "zod"
import classes from "./OfficialPotvrdaEditorPage.module.scss"

const ADMIN = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]
const DOC_TITLE = "Potvrda o prestanku ugovora o volontiranju"

const makeSchema = (mupDateRequired: string) =>
    z
    .object({
        confirmNumber: z.string().trim().min(1),
        issueDate: z.string().trim().min(8),
        fullName: z.string().trim().min(2),
        birthDate: z.string().trim().min(8),
        citizenship: z.string().trim().min(3),
        passport: z.string().trim().min(5),
        contractNumber: z.string().trim(),
        contractDate: z.string().trim().min(8),
        terminationDate: z.string().trim().min(8),
        reason: z.enum(["VOLUNTEER_REQUEST", "NON_COMPLIANCE"]),
        mupNotified: z.boolean(),
        mupNotifiedDate: z.string().trim(),
    })
    .refine((v) => v.reason !== "NON_COMPLIANCE" || v.mupNotifiedDate.length >= 8, {
        path: ["mupNotifiedDate"],
        message: mupDateRequired,
    })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const emptyValues: FormValues = {
    confirmNumber: "",
    issueDate: "",
    fullName: "",
    birthDate: "",
    citizenship: "",
    passport: "",
    contractNumber: "",
    contractDate: "",
    terminationDate: "",
    reason: "VOLUNTEER_REQUEST",
    mupNotified: true,
    mupNotifiedDate: "",
}

const TerminationPotvrdaEditorPage = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const { user: currentUser } = useContext(UserContext)
    const [searchParams] = useSearchParams()
    const initialUsername = searchParams.get("username") ?? undefined

    setDocumentTitleByLocale("pages.documents.termination.editorTitle")

    const allowed = hasPermission(currentUser, ADMIN)
    const [subject, setSubject] = useState<UserInfoDto | null>(null)
    const subjectUsername = subject?.username ?? null

    const { data: resolvedUser } = useQuery({
        queryKey: ["potvrda-editor-user", subjectUsername],
        queryFn: async () => {
            const response = await UserApiService.resolveUsers([subjectUsername!])
            return response.data.find((u) => u.username === subjectUsername) ?? response.data[0] ?? null
        },
        enabled: !!subjectUsername,
    })
    const user = resolvedUser ?? subject

    const { data: application, isFetched: applicationFetched } = useQuery({
        queryKey: ["application-for-user", user?.username],
        queryFn: () => ApplicationLookupApiService.getForUser(user!.username!),
        enabled: !!user?.username,
    })

    const [signDraft, setSignDraft] = useState<PotvrdaSignDraft>(() => loadPotvrdaSignDraft())
    const [lastDoc, setLastDoc] = useState<{ blob: Blob; fileName: string; confirmNumber: string } | null>(null)
    const [emailOpened, { open: openEmail, close: closeEmail }] = useDisclosure(false)
    const [deliveryBusy, setDeliveryBusy] = useState(false)

    const form = useForm<FormValues>({
        initialValues: emptyValues,
        validate: zodResolver(
            makeSchema(intl.formatMessage({ id: "pages.documents.termination.mupNotifiedDateRequired" }))
        ),
    })

    const refreshNumber = async (issueDate: string) => {
        try {
            const next = await PotvrdaApiService.nextNumber(issueYearFromFormDate(issueDate))
            form.setFieldValue("confirmNumber", next.confirmNumber)
        } catch {
            /* number can be typed manually */
        }
    }

    useEffect(() => {
        if (!user?.username || !applicationFetched) {
            return
        }
        const defaults = defaultTerminationPotvrdaFields({ ...user, ...mupLetterOf(user) }, application)
        form.setValues({ ...defaults, confirmNumber: "" })
        form.clearErrors()
        setLastDoc(null)
        void refreshNumber(defaults.issueDate)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.username, applicationFetched, application?.id])

    const generateMutation = useMutation({
        mutationFn: async (values: FormValues) => {
            if (!user?.username) {
                throw new Error(intl.formatMessage({ id: "pages.documents.subjectPickRequired" }))
            }
            const issueDate = toApiDate(values.issueDate)
            if (!issueDate) {
                throw new Error(intl.formatMessage({ id: "pages.documents.registry.badDate" }))
            }
            const registered = await PotvrdaApiService.create({
                kind: "TERMINATION",
                volunteerUsername: user.username,
                volunteerFullName: values.fullName,
                issueDate,
                periodFrom: toApiDate(values.contractDate),
                periodTo: toApiDate(values.terminationDate),
                programCode: user.program?.code ?? null,
                servicesDescription: terminationReasonSummary(values.reason),
            })
            const payload: TerminationPotvrdaInput = { ...values, confirmNumber: registered.confirmNumber }
            const { blob, fileName } = await buildTerminationPotvrdaBlob(payload, signDraft, { download: true })
            return { blob, fileName, confirmNumber: registered.confirmNumber }
        },
        onSuccess: (doc) => {
            setLastDoc(doc)
            form.setFieldValue("confirmNumber", doc.confirmNumber)
            queryClient.invalidateQueries({ queryKey: ["potvrda-issues"] })
        },
        onError: (err) => {
            notifications.show({
                color: "red",
                message: err instanceof Error ? err.message : intl.formatMessage({ id: "errors.request" }),
            })
        },
    })

    const onGenerate = () => {
        if (generateMutation.isPending || form.validate().hasErrors) {
            return
        }
        generateMutation.mutate(form.values)
    }

    const sendToInbox = async () => {
        if (!lastDoc || !user?.username) {
            return
        }
        setDeliveryBusy(true)
        try {
            await sendPotvrdaToInbox({
                blob: lastDoc.blob,
                fileName: lastDoc.fileName,
                volunteerUsername: user.username,
                confirmNumber: lastDoc.confirmNumber,
                volunteerFullName: user.fullName ?? form.values.fullName,
                docTitle: DOC_TITLE,
            })
            notifications.show({
                color: "green",
                message: intl.formatMessage({ id: "pages.documents.official.sentInbox" }),
            })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
        } catch (err) {
            notifications.show({
                color: "red",
                message: err instanceof Error ? err.message : intl.formatMessage({ id: "errors.request" }),
            })
        } finally {
            setDeliveryBusy(false)
        }
    }

    const previewInput = useMemo((): TerminationPotvrdaInput => ({ ...form.values }), [form.values])

    const buildPreview = useCallback(
        () => buildTerminationPotvrdaBlob(previewInput, signDraft, { download: false }).then((r) => r.blob),
        [previewInput, signDraft]
    )

    const volunteerEmail = user?.email
    const emailTemplates = useMemo(
        () => [
            {
                name: intl.formatMessage({ id: "pages.documents.termination.emailTemplate" }),
                topic: `${DOC_TITLE} ${lastDoc?.confirmNumber ?? ""}`.trim(),
                content: intl.formatMessage(
                    { id: "pages.documents.termination.emailBody" },
                    { name: user?.fullName ?? form.values.fullName }
                ),
            },
        ],
        [intl, lastDoc?.confirmNumber, user?.fullName, form.values.fullName]
    )

    const backLink = user?.username ? `/documents?username=${encodeURIComponent(user.username)}` : "/documents"

    if (!allowed) {
        return null
    }

    return (
        <div className={classes.root}>
            <div className={classes.header}>
                <div>
                    <Button
                        component={Link}
                        to={backLink}
                        variant="subtle"
                        size="compact-sm"
                        leftSection={<IconArrowLeft size={16} />}
                    >
                        <FormattedMessage id="pages.documents.official.back" />
                    </Button>
                    <Title order={2} mt="xs">
                        <FormattedMessage id="pages.documents.termination.editorTitle" />
                    </Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        <FormattedMessage id="pages.documents.termination.editorDescription" />
                    </Text>
                </div>
                <Flex gap="sm" wrap="wrap">
                    <Button
                        leftSection={<IconFileTypeDoc size={16} />}
                        loading={generateMutation.isPending}
                        disabled={!user?.username}
                        onClick={onGenerate}
                    >
                        <FormattedMessage id="pages.documents.official.generate" />
                    </Button>
                    {lastDoc && (
                        <>
                            <Button
                                variant="light"
                                leftSection={<IconMail size={16} />}
                                disabled={!volunteerEmail}
                                onClick={openEmail}
                            >
                                <FormattedMessage id="pages.documents.official.sendEmail" />
                            </Button>
                            <Button
                                variant="light"
                                leftSection={<IconMessage size={16} />}
                                loading={deliveryBusy}
                                onClick={() => void sendToInbox()}
                            >
                                <FormattedMessage id="pages.documents.official.sendInbox" />
                            </Button>
                        </>
                    )}
                </Flex>
            </div>

            <UserSearch
                label={<FormattedMessage id="pages.documents.subjectLabel" />}
                description={<FormattedMessage id="pages.documents.subjectHint" />}
                onUserChange={setSubject}
                initialSearch={initialUsername}
            />

            {!user?.username && (
                <Alert color="blue">
                    <FormattedMessage id="pages.documents.subjectPickRequired" />
                </Alert>
            )}

            {user?.username && (
                <div className={classes.layout}>
                    <form className={classes.form} onSubmit={(e) => e.preventDefault()}>
                        <Alert variant="light" color="blue">
                            <FormattedMessage id="pages.documents.termination.hint" />
                        </Alert>
                        {applicationFetched && !application?.passport && (
                            <Alert variant="light" color="yellow">
                                <FormattedMessage id="pages.documents.membership.missingData" />
                            </Alert>
                        )}
                        <Flex gap="sm" wrap="wrap">
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.confirmNumber" />}
                                {...form.getInputProps("confirmNumber")}
                                flex={1}
                                miw={140}
                            />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.issueDate" />}
                                {...form.getInputProps("issueDate")}
                                onBlur={(e) => {
                                    form.getInputProps("issueDate").onBlur?.(e)
                                    void refreshNumber(e.currentTarget.value)
                                }}
                                flex={1}
                                miw={140}
                            />
                        </Flex>
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.fullName" />}
                            description={<FormattedMessage id="pages.documents.termination.fullNameHint" />}
                            {...form.getInputProps("fullName")}
                        />
                        <Flex gap="sm" wrap="wrap">
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.birthDate" />}
                                {...form.getInputProps("birthDate")}
                                flex={1}
                                miw={140}
                            />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.termination.passport" />}
                                {...form.getInputProps("passport")}
                                flex={1}
                                miw={140}
                            />
                        </Flex>
                        <TextInput
                            label={<FormattedMessage id="pages.documents.termination.citizenship" />}
                            {...form.getInputProps("citizenship")}
                        />
                        <Flex gap="sm" wrap="wrap">
                            <TextInput
                                label={<FormattedMessage id="pages.documents.termination.contractNumber" />}
                                description={<FormattedMessage id="pages.documents.termination.contractNumberHint" />}
                                {...form.getInputProps("contractNumber")}
                                flex={1}
                                miw={140}
                            />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.termination.contractDate" />}
                                {...form.getInputProps("contractDate")}
                                flex={1}
                                miw={140}
                            />
                        </Flex>
                        <TextInput
                            label={<FormattedMessage id="pages.documents.termination.terminationDate" />}
                            {...form.getInputProps("terminationDate")}
                        />
                        <Input.Wrapper
                            label={<FormattedMessage id="pages.documents.termination.reason" />}
                            description={<FormattedMessage id="pages.documents.termination.reasonHint" />}
                        >
                            <SegmentedControl
                                fullWidth
                                mt={4}
                                value={form.values.reason}
                                onChange={(value) =>
                                    form.setFieldValue("reason", value as FormValues["reason"])
                                }
                                data={[
                                    {
                                        value: "VOLUNTEER_REQUEST",
                                        label: intl.formatMessage({ id: "pages.mup.reasonVolunteerRequest" }),
                                    },
                                    {
                                        value: "NON_COMPLIANCE",
                                        label: intl.formatMessage({ id: "pages.mup.reasonNonCompliance" }),
                                    },
                                ]}
                            />
                        </Input.Wrapper>
                        {form.values.reason === "NON_COMPLIANCE" ? (
                            <TextInput
                                label={<FormattedMessage id="pages.documents.termination.mupNotifiedDate" />}
                                {...form.getInputProps("mupNotifiedDate")}
                            />
                        ) : (
                            <Checkbox
                                label={<FormattedMessage id="pages.documents.termination.mupNotified" />}
                                {...form.getInputProps("mupNotified", { type: "checkbox" })}
                            />
                        )}
                        <Divider my="xs" />
                        <PotvrdaSignSection draft={signDraft} onChange={setSignDraft} />
                    </form>

                    <div className={classes.previewPane}>
                        <Text size="sm" fw={600} mb="xs">
                            <FormattedMessage id="pages.documents.official.previewSign" />
                        </Text>
                        <PotvrdaDocxPreview buildBlob={buildPreview} />
                    </div>
                </div>
            )}

            <EmailDrawer
                opened={emailOpened}
                close={closeEmail}
                recipients={
                    volunteerEmail ? [{ name: user?.fullName ?? form.values.fullName, email: volunteerEmail }] : []
                }
                templates={emailTemplates}
                prepareAttachments={async () =>
                    lastDoc
                        ? [
                              new File([lastDoc.blob], lastDoc.fileName, {
                                  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                              }),
                          ]
                        : []
                }
                attachmentRevision={lastDoc?.confirmNumber ?? 0}
            />
        </div>
    )
}

export default TerminationPotvrdaEditorPage
