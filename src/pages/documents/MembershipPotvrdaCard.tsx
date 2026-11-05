import { Alert, Button, Card, Flex, Modal, Switch, Text, TextInput } from "@mantine/core"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { IconFileTypePdf } from "@tabler/icons-react"
import dayjs from "dayjs"
import { useQuery } from "@tanstack/react-query"
import { FormattedMessage, useIntl } from "react-intl"
import { useContext, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { UserContext } from "src/app/providers/UserContext"
import { ApplicationLookupApiService } from "src/shared/api/applications/ApplicationLookupApiService"
import { PotvrdaApiService } from "src/shared/api/PotvrdaApiService"
import { toApiDate } from "src/pages/documents/potvrdaDates"
import { hasPermission } from "src/shared/user/roles"
import {
    defaultPotvrdaFieldsFromProfile,
    generatePotvrdaMembershipPdf,
} from "src/shared/docs/potvrdaMembership"
import { z } from "zod"
import classes from "./DocumentsPage.module.scss"

const schema = z
    .object({
        fullName: z.string().trim().min(2),
        passportOrId: z.string().trim().min(3),
        contractNumber: z.string().trim().min(1),
        contractSignedOn: z.string().trim().min(8),
        indefinite: z.boolean(),
        validUntil: z.string().trim(),
    })
    .superRefine((data, ctx) => {
        if (!data.indefinite && data.validUntil.trim().length < 8) {
            ctx.addIssue({ code: "custom", path: ["validUntil"], message: "required" })
        }
    })

type FormValues = z.infer<typeof schema>

const STAFF = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]

interface MembershipPotvrdaCardProps {
    user: UserInfoDto
    volunteerPickRequired?: boolean
}

export const MembershipPotvrdaCard = ({ user, volunteerPickRequired = false }: MembershipPotvrdaCardProps) => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const { user: currentUser } = useContext(UserContext)
    const registerIssues = hasPermission(currentUser, STAFF)
    const [opened, { open, close }] = useDisclosure(false)
    const issueForUsernameRef = useRef<string | null>(null)
    const issueForGenderRef = useRef<"MALE" | "FEMALE" | null>(null)

    const { data: application, isFetching, isError } = useQuery({
        queryKey: ["applicationForUser", user.username, "potvrda"],
        queryFn: () => ApplicationLookupApiService.getForUser(user.username!),
        enabled: !!user.username,
    })

    const form = useForm<FormValues>({
        initialValues: {
            fullName: "",
            passportOrId: "",
            contractNumber: "",
            contractSignedOn: "",
            indefinite: false,
            validUntil: "",
        },
        validate: zodResolver(schema),
    })

    const openModal = () => {
        issueForUsernameRef.current = user.username ?? null
        issueForGenderRef.current = (user.gender as "MALE" | "FEMALE" | undefined) ?? null
        const defaults = defaultPotvrdaFieldsFromProfile(user, application ?? undefined)
        form.setValues({
            fullName: defaults.fullName ?? "",
            passportOrId: defaults.passportOrId ?? "",
            contractNumber: defaults.contractNumber ?? "",
            contractSignedOn: defaults.contractSignedOn ?? "",
            indefinite: defaults.indefinite ?? false,
            validUntil: defaults.validUntil ?? "",
        })
        form.clearErrors()
        open()
    }

    const onSubmit = form.onSubmit(async (values) => {
        try {
            const volunteerUsername = issueForUsernameRef.current
            if (registerIssues && volunteerUsername) {
                const issueDate = toApiDate(values.contractSignedOn) ?? toApiDate(dayjs().format("DD.MM.YYYY."))
                if (issueDate) {
                    await PotvrdaApiService.create({
                        kind: "MEMBERSHIP",
                        volunteerUsername,
                        volunteerFullName: values.fullName,
                        issueDate,
                        periodFrom: toApiDate(values.contractSignedOn),
                        periodTo: values.indefinite ? null : toApiDate(values.validUntil),
                        servicesDescription: `Ugovor br. ${values.contractNumber}`,
                    })
                    queryClient.invalidateQueries({ queryKey: ["potvrda-issues"] })
                }
            }
            generatePotvrdaMembershipPdf({
                ...values,
                validUntil: values.indefinite ? null : values.validUntil.trim(),
                gender: issueForGenderRef.current ?? null,
            })
            close()
        } catch (err) {
            notifications.show({
                color: "red",
                message: err instanceof Error ? err.message : intl.formatMessage({ id: "errors.request" }),
            })
        }
    })

    const missingApplication = !isFetching && (isError || !application?.passport)

    return (
        <>
            <Card withBorder radius="md" padding="lg" className={classes.card}>
                <Text fw={600} size="lg">
                    <FormattedMessage id="pages.documents.membership.title" />
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                    <FormattedMessage id="pages.documents.membership.description" />
                </Text>
                {missingApplication && (
                    <Alert color="yellow" mt="md" variant="light">
                        <FormattedMessage id="pages.documents.membership.missingData" />
                    </Alert>
                )}
                <Button
                    mt="md"
                    leftSection={<IconFileTypePdf size={18} />}
                    onClick={openModal}
                    loading={isFetching}
                    disabled={!user.username || volunteerPickRequired}
                    title={
                        volunteerPickRequired
                            ? intl.formatMessage({ id: "pages.documents.subjectPickRequired" })
                            : undefined
                    }
                >
                    <FormattedMessage id="pages.documents.generatePdf" />
                </Button>
            </Card>

            <Modal
                opened={opened}
                onClose={close}
                title={<FormattedMessage id="pages.documents.membership.modalTitle" />}
                size="lg"
            >
                <form onSubmit={onSubmit}>
                    <Flex direction="column" gap="sm">
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.fullName" />}
                            {...form.getInputProps("fullName")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.passport" />}
                            {...form.getInputProps("passportOrId")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.contractNumber" />}
                            description={<FormattedMessage id="pages.documents.membership.contractNumberHint" />}
                            {...form.getInputProps("contractNumber")}
                        />
                        <TextInput
                            label={<FormattedMessage id="pages.documents.membership.contractDate" />}
                            placeholder="DD.MM.YYYY."
                            {...form.getInputProps("contractSignedOn")}
                        />
                        <Switch
                            label={<FormattedMessage id="pages.documents.membership.indefinite" />}
                            {...form.getInputProps("indefinite", { type: "checkbox" })}
                        />
                        {!form.values.indefinite && (
                            <TextInput
                                label={<FormattedMessage id="pages.documents.membership.validUntil" />}
                                placeholder="DD.MM.YYYY."
                                {...form.getInputProps("validUntil")}
                            />
                        )}
                        <Text size="xs" c="dimmed">
                            <FormattedMessage id="pages.documents.membership.footerNote" />
                        </Text>
                        <Flex justify="flex-end" gap="sm" mt="xs">
                            <Button variant="default" onClick={close} type="button">
                                <FormattedMessage id="pages.documents.cancel" />
                            </Button>
                            <Button type="submit" leftSection={<IconFileTypePdf size={18} />}>
                                <FormattedMessage id="pages.documents.generatePdf" />
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Modal>
        </>
    )
}
