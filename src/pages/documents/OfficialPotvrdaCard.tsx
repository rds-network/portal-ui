import { Alert, Button, Card, Flex, Modal, NumberInput, Text, TextInput, Textarea } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { PageRequest, ReportFilter, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconFileTypeDoc } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import {
    defaultOfficialPotvrdaFields,
    generateOfficialPotvrdaDocx,
    OfficialPotvrdaInput,
} from "src/shared/docs/potvrdaOfficialDocx"
import { ReportStatus } from "src/shared/report/status"
import { getSpentTimeObjectFromReport } from "src/shared/report/timeSpent"
import { PotvrdaApiService } from "src/shared/api/PotvrdaApiService"
import { issueYearFromFormDate, toApiDate } from "src/pages/documents/potvrdaDates"
import { z } from "zod"
import classes from "./DocumentsPage.module.scss"

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

interface OfficialPotvrdaCardProps {
    user: UserInfoDto
}

export const OfficialPotvrdaCard = ({ user }: OfficialPotvrdaCardProps) => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [opened, { open, close }] = useDisclosure(false)
    const [hoursFrom, setHoursFrom] = useState<Date | null>(null)
    const [hoursTo, setHoursTo] = useState<Date | null>(null)

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

    const hoursQuery = useQuery({
        queryKey: ["officialPotvrdaHours", user.username, hoursFrom?.toISOString(), hoursTo?.toISOString()],
        enabled: opened && !!user.username && !!hoursFrom && !!hoursTo,
        queryFn: async () => {
            const filter: ReportFilter = {
                login: user.username!,
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

    const refreshNextNumber = async (issueDateText: string) => {
        try {
            const next = await PotvrdaApiService.nextNumber(issueYearFromFormDate(issueDateText))
            form.setFieldValue("confirmNumber", next.confirmNumber)
        } catch {
            // API ещё не на сервере — номер вводят вручную.
        }
    }

    const openModal = () => {
        const defaults = defaultOfficialPotvrdaFields(user)
        const from = user.contracts?.map((c) => c.startDate).filter(Boolean).sort()[0]
        const to = user.contracts?.map((c) => c.endDate).filter(Boolean).sort().at(-1)
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
        open()
        void refreshNextNumber(issueDate)
    }

    const generateMutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const issueDate = toApiDate(values.issueDate)
            if (!issueDate || !user.username) {
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
            await generateOfficialPotvrdaDocx(payload)
            return registered
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["potvrda-issues"] })
            close()
        },
        onError: (err) => {
            notifications.show({
                color: "red",
                message: err instanceof Error ? err.message : intl.formatMessage({ id: "errors.request" }),
            })
        },
    })

    const onSubmit = form.onSubmit((values) => generateMutation.mutate(values))

    return (
        <>
            <Card withBorder radius="md" padding="lg" className={classes.card}>
                <Text fw={600} size="lg">
                    <FormattedMessage id="pages.documents.official.title" />
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                    <FormattedMessage id="pages.documents.official.description" />
                </Text>
                <Button
                    mt="md"
                    leftSection={<IconFileTypeDoc size={18} />}
                    onClick={openModal}
                    disabled={!user.username}
                >
                    <FormattedMessage id="pages.documents.official.generate" />
                </Button>
            </Card>

            <Modal
                opened={opened}
                onClose={close}
                title={<FormattedMessage id="pages.documents.official.modalTitle" />}
                size="lg"
            >
                <form onSubmit={onSubmit}>
                    <Flex direction="column" gap="sm">
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
                            placeholder="008/2025"
                            {...form.getInputProps("confirmNumber")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.issueDate" />}
                            {...form.getInputProps("issueDate")}
                            onBlur={(e) => {
                                form.getInputProps("issueDate").onBlur?.(e)
                                void refreshNextNumber(e.currentTarget.value)
                            }}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.fullName" />}
                            {...form.getInputProps("fullName")}
                        />
                        <Flex gap="sm" wrap="wrap">
                            <TextInput label="JMBG" {...form.getInputProps("jmbg")} flex={1} miw={160} />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.birthDate" />}
                                {...form.getInputProps("birthDate")}
                                flex={1}
                                miw={160}
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
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.trainingType" />}
                            {...form.getInputProps("trainingType")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.official.trainingProvider" />}
                            {...form.getInputProps("trainingProvider")}
                        />
                        <Flex gap="sm" wrap="wrap">
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.trainingFrom" />}
                                {...form.getInputProps("trainingFrom")}
                                flex={1}
                            />
                            <TextInput
                                label={<FormattedMessage id="pages.documents.official.trainingTo" />}
                                {...form.getInputProps("trainingTo")}
                                flex={1}
                            />
                        </Flex>
                        <Flex justify="flex-end" gap="sm" mt="xs">
                            <Button variant="default" onClick={close} type="button">
                                <FormattedMessage id="pages.documents.cancel" />
                            </Button>
                            <Button
                                type="submit"
                                loading={generateMutation.isPending}
                                leftSection={<IconFileTypeDoc size={18} />}
                            >
                                <FormattedMessage id="pages.documents.official.generate" />
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Modal>
        </>
    )
}
