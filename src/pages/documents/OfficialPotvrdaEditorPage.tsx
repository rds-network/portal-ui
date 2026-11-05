import {
    Alert,
    Button,
    Divider,
    Flex,
    NumberInput,
    Text,
    TextInput,
    Textarea,
    Title,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { PageRequest, ReportFilter, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconArrowLeft, IconFileTypeDoc, IconMail, IconMessage } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useSearchParams } from "react-router"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import {
    buildOfficialPotvrdaBlob,
    defaultOfficialPotvrdaFields,
    OfficialPotvrdaInput,
} from "src/shared/docs/potvrdaOfficialDocx"
import { loadPotvrdaSignDraft, PotvrdaSignDraft } from "src/shared/docs/potvrdaSignDraft"
import { PotvrdaSignPreview } from "src/pages/documents/PotvrdaSignPreview"
import { PotvrdaSignSection } from "src/pages/documents/PotvrdaSignSection"
import { sendPotvrdaToInbox } from "src/pages/documents/potvrdaDelivery"
import { issueYearFromFormDate, toApiDate } from "src/pages/documents/potvrdaDates"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { ReportStatus } from "src/shared/report/status"
import { getSpentTimeObjectFromReport } from "src/shared/report/timeSpent"
import { PotvrdaApiService } from "src/shared/api/PotvrdaApiService"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { hasPermission } from "src/shared/user/roles"
import { UserContext } from "src/app/providers/UserContext"
import { useContext } from "react"
import { z } from "zod"
import classes from "./OfficialPotvrdaEditorPage.module.scss"

const ADMIN = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]

const schema = z.object({
    confirmNumber: z.string().trim().min(1),
    issueDate: z.string().trim().min(8),
    fullName: z.string().trim().min(2),
    jmbg: z.string().trim(),
    birthDate: z.string().trim().min(8),
    citizenship: z.string().trim().min(3),
    addressCity: z.string().trim().min(3),
    periodFrom: z.string().trim().min(8),
    periodTo: z.string().trim().min(8),
    servicesDescription: z.string().trim().min(10),
    totalHours: z.number().min(0),
    volunteerCity: z.string().trim().min(3),
    trainingType: z.string().trim().min(2),
    trainingProvider: z.string().trim().min(3),
    trainingFrom: z.string().trim().min(8),
    trainingTo: z.string().trim().min(8),
})

type FormValues = z.infer<typeof schema>

const OfficialPotvrdaEditorPage = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const { user: currentUser } = useContext(UserContext)
    const [searchParams] = useSearchParams()
    const initialUsername = searchParams.get("username") ?? undefined

    setDocumentTitleByLocale("pages.documents.official.editorTitle")

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

    const [hoursFrom, setHoursFrom] = useState<Date | null>(null)
    const [hoursTo, setHoursTo] = useState<Date | null>(null)
    const [signDraft, setSignDraft] = useState<PotvrdaSignDraft>(() => loadPotvrdaSignDraft())
    const [lastDoc, setLastDoc] = useState<{ blob: Blob; fileName: string; confirmNumber: string } | null>(null)
    const [emailOpened, { open: openEmail, close: closeEmail }] = useDisclosure(false)
    const [deliveryBusy, setDeliveryBusy] = useState(false)

    const form = useForm<FormValues>({
        initialValues: {
            confirmNumber: "",
            issueDate: "",
            fullName: "",
            jmbg: "",
            birthDate: "",
            citizenship: "",
            addressCity: "",
            periodFrom: "",
            periodTo: "",
            servicesDescription: "",
            totalHours: 0,
            volunteerCity: "",
            trainingType: "",
            trainingProvider: "",
            trainingFrom: "",
            trainingTo: "",
        },
        validate: zodResolver(schema),
    })

    const loadUserIntoForm = async (target: UserInfoDto) => {
        const defaults = defaultOfficialPotvrdaFields(target)
        const from = target.contracts?.map((c) => c.startDate).filter(Boolean).sort()[0]
        const to = target.contracts?.map((c) => c.endDate).filter(Boolean).sort().at(-1)
        setHoursFrom(from ? dayjs(from).toDate() : dayjs().startOf("year").toDate())
        setHoursTo(to ? dayjs(to).toDate() : dayjs().toDate())
        const issueDate = defaults.issueDate ?? ""
        form.setValues({
            confirmNumber: defaults.confirmNumber ?? "",
            issueDate,
            fullName: defaults.fullName ?? "",
            jmbg: defaults.jmbg ?? "",
            birthDate: defaults.birthDate ?? "",
            citizenship: defaults.citizenship ?? "",
            addressCity: defaults.addressCity ?? "",
            periodFrom: defaults.periodFrom ?? "",
            periodTo: defaults.periodTo ?? "",
            servicesDescription: defaults.servicesDescription ?? "",
            totalHours: defaults.totalHours ?? 0,
            volunteerCity: defaults.volunteerCity ?? "",
            trainingType: defaults.trainingType ?? "",
            trainingProvider: defaults.trainingProvider ?? "",
            trainingFrom: defaults.trainingFrom ?? "",
            trainingTo: defaults.trainingTo ?? "",
        })
        form.clearErrors()
        setLastDoc(null)
        try {
            const next = await PotvrdaApiService.nextNumber(issueYearFromFormDate(issueDate))
            form.setFieldValue("confirmNumber", next.confirmNumber)
        } catch {
            /* manual */
        }
    }

    useEffect(() => {
        if (user?.username) {
            void loadUserIntoForm(user)
        }
    }, [user?.username, user?.id])

    const hoursQuery = useQuery({
        queryKey: ["officialPotvrdaHours", user?.username, hoursFrom?.toISOString(), hoursTo?.toISOString()],
        enabled: !!user?.username && !!hoursFrom && !!hoursTo,
        queryFn: async () => {
            const filter: ReportFilter = {
                login: user!.username!,
                status: ReportStatus.ACCEPTED,
                dateFrom: dayjs(hoursFrom).format(DEFAULT_DATE_FORMAT),
                dateTo: dayjs(hoursTo).format(DEFAULT_DATE_FORMAT),
            }
            const pageRequest: PageRequest = { pageNumber: 0, pageSize: 500 }
            const response = await ReportApiService.getReports(pageRequest, filter)
            const reports = response.data.content ?? []
            const minutes = reports.reduce((acc, report) => {
                const spent = getSpentTimeObjectFromReport(report)
                return acc + spent.h * 60 + spent.m
            }, 0)
            return Math.round((minutes / 60) * 10) / 10
        },
    })

    useEffect(() => {
        if (hoursQuery.data != null) {
            form.setFieldValue("totalHours", hoursQuery.data)
        }
    }, [hoursQuery.data, form])

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
                kind: "OFFICIAL",
                volunteerUsername: user.username,
                volunteerFullName: values.fullName,
                issueDate,
                periodFrom: toApiDate(values.periodFrom),
                periodTo: toApiDate(values.periodTo),
                totalHours: values.totalHours,
                programCode: user.program?.code ?? null,
                servicesDescription: values.servicesDescription,
            })
            const payload: OfficialPotvrdaInput = {
                ...values,
                confirmNumber: registered.confirmNumber,
                gender: user.gender ?? null,
            }
            const { blob, fileName } = await buildOfficialPotvrdaBlob(payload, signDraft, { download: true })
            return {
                delivery: { blob, fileName, confirmNumber: registered.confirmNumber },
            }
        },
        onSuccess: (result) => {
            setLastDoc(result.delivery)
            queryClient.invalidateQueries({ queryKey: ["potvrda-issues"] })
        },
        onError: (err) => {
            notifications.show({
                color: "red",
                message: err instanceof Error ? err.message : intl.formatMessage({ id: "errors.request" }),
            })
        },
    })

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

    const previewInput = useMemo((): OfficialPotvrdaInput => {
        const values = form.values
        return {
            confirmNumber: values.confirmNumber,
            issueDate: values.issueDate,
            fullName: values.fullName,
            jmbg: values.jmbg,
            birthDate: values.birthDate,
            gender: user?.gender ?? null,
            citizenship: values.citizenship,
            addressCity: values.addressCity,
            periodFrom: values.periodFrom,
            periodTo: values.periodTo,
            servicesDescription: values.servicesDescription,
            totalHours: values.totalHours,
            volunteerCity: values.volunteerCity,
            trainingType: values.trainingType,
            trainingProvider: values.trainingProvider,
            trainingFrom: values.trainingFrom,
            trainingTo: values.trainingTo,
        }
    }, [form.values, user?.gender])

    const volunteerEmail = user?.email

    const backLink = useMemo(
        () => (user?.username ? `/documents?username=${encodeURIComponent(user.username)}` : "/documents"),
        [user?.username]
    )

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
                        <FormattedMessage id="pages.documents.official.editorTitle" />
                    </Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        <FormattedMessage id="pages.documents.official.editorDescription" />
                    </Text>
                </div>
                <Flex gap="sm" wrap="wrap">
                    <Button
                        leftSection={<IconFileTypeDoc size={16} />}
                        loading={generateMutation.isPending}
                        disabled={!user?.username}
                        onClick={() => generateMutation.mutate(form.values)}
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
                    <form
                        className={classes.form}
                        onSubmit={form.onSubmit((values) => generateMutation.mutate(values))}
                    >
                        <Alert variant="light" color="blue">
                            <FormattedMessage id="pages.documents.official.hint" />
                        </Alert>
                        <Flex gap="sm" wrap="wrap">
                            <DateInput
                                label={<FormattedMessage id="pages.documents.official.hoursFrom" />}
                                value={hoursFrom}
                                onChange={setHoursFrom}
                                flex={1}
                                miw={160}
                            />
                            <DateInput
                                label={<FormattedMessage id="pages.documents.official.hoursTo" />}
                                value={hoursTo}
                                onChange={setHoursTo}
                                flex={1}
                                miw={160}
                            />
                            <NumberInput
                                label={<FormattedMessage id="pages.documents.official.totalHours" />}
                                min={0}
                                decimalScale={1}
                                {...form.getInputProps("totalHours")}
                                flex={1}
                                miw={120}
                                description={
                                    hoursQuery.isFetching
                                        ? intl.formatMessage({ id: "pages.documents.official.hoursLoading" })
                                        : undefined
                                }
                            />
                        </Flex>
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.confirmNumber" />}
                            {...form.getInputProps("confirmNumber")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.issueDate" />}
                            {...form.getInputProps("issueDate")}
                            onBlur={async (e) => {
                                form.getInputProps("issueDate").onBlur?.(e)
                                try {
                                    const next = await PotvrdaApiService.nextNumber(
                                        issueYearFromFormDate(e.currentTarget.value)
                                    )
                                    form.setFieldValue("confirmNumber", next.confirmNumber)
                                } catch {
                                    /* ignore */
                                }
                            }}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.fullName" />}
                            {...form.getInputProps("fullName")}
                        />
                        <Flex gap="sm" wrap="wrap">
                            <TextInput label="JMBG" {...form.getInputProps("jmbg")} flex={1} />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.birthDate" />}
                                {...form.getInputProps("birthDate")}
                                flex={1}
                            />
                        </Flex>
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.citizenship" />}
                            {...form.getInputProps("citizenship")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.addressCity" />}
                            {...form.getInputProps("addressCity")}
                        />
                        <Flex gap="sm" wrap="wrap">
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.periodFrom" />}
                                {...form.getInputProps("periodFrom")}
                                flex={1}
                            />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.periodTo" />}
                                {...form.getInputProps("periodTo")}
                                flex={1}
                            />
                        </Flex>
                        <Textarea
                            label={<FormattedMessage id="pages.documents.official.services" />}
                            minRows={2}
                            {...form.getInputProps("servicesDescription")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.volunteerCity" />}
                            {...form.getInputProps("volunteerCity")}
                        />
                        <Divider my="xs" />
                        <PotvrdaSignSection draft={signDraft} onChange={setSignDraft} />
                    </form>

                    <div className={classes.previewPane}>
                        <Text size="sm" fw={600} mb="xs">
                            <FormattedMessage id="pages.documents.official.previewSign" />
                        </Text>
                        <PotvrdaSignPreview draft={signDraft} input={previewInput} />
                    </div>
                </div>
            )}

            <EmailDrawer
                opened={emailOpened}
                close={closeEmail}
                recipients={
                    volunteerEmail
                        ? [{ name: user?.fullName ?? form.values.fullName, email: volunteerEmail }]
                        : []
                }
                prepareAttachments={async () => {
                    if (!lastDoc) {
                        return []
                    }
                    return [
                        new File([lastDoc.blob], lastDoc.fileName, {
                            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        }),
                    ]
                }}
                attachmentRevision={lastDoc?.confirmNumber ?? 0}
            />
        </div>
    )
}

export default OfficialPotvrdaEditorPage
