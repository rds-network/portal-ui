import {
    ActionIcon,
    Button,
    Flex,
    Group,
    Image,
    Modal,
    Pill,
    SimpleGrid,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { ResidencePermitDto } from "@rds-network/portal-api-axios"
import { IconCalendar, IconDeviceFloppy, IconEye, IconId, IconTrash } from "@tabler/icons-react"
import dayjs from "dayjs"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { FileUploader } from "src/shared/ui/fileUploader/FileUploader"
import { z } from "zod"
import { labels, locales } from "./lib/locales"

interface ResidencePermitFormProps {
    initialValues: ResidencePermitDto
    onSubmit: (values: ResidencePermitDto) => void
    onDelete?: () => void
    canDelete: boolean
    isNew?: boolean
    onCancel: () => void
}

export const ResidencePermitForm = ({
    initialValues,
    onSubmit,
    onDelete,
    canDelete,
    isNew,
    onCancel,
}: ResidencePermitFormProps) => {
    const intl = useIntl()
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const requiredMessage = { message: intl.formatMessage({ id: locales.required }) }

    const validationSchema = z
        .object({
            nationality: z.string(requiredMessage).min(1),
            registrationNumber: z
                .string(requiredMessage)
                .regex(
                    /^\d{9}$/,
                    intl.formatMessage({ id: "pages.profile.residencePermit.validation.registrationNumber" })
                ),
            validUntil: z.date(requiredMessage),
            purposeOfStay: z.string(requiredMessage).min(1),
            identityNumber: z
                .string(requiredMessage)
                .regex(
                    /^\d{13}$/,
                    intl.formatMessage({ id: "pages.profile.residencePermit.validation.identityNumber" })
                ),
            issuingDate: z.date(requiredMessage),
            issuingAuthority: z.string(requiredMessage).min(1),
            stateOfBirth: z.string(requiredMessage).min(1),
            frontSidePhoto: z.any().refine((file) => file !== null, requiredMessage),
            backSidePhoto: z.any().refine((file) => file !== null, requiredMessage),
        })
        .refine((data) => dayjs(data.validUntil).isAfter(dayjs(data.issuingDate)), {
            message: intl.formatMessage({ id: locales.validationEndDateAfterStart }),
            path: ["validUntil"],
        })

    const form = useForm({
        initialValues: {
            ...initialValues,
            validUntil: initialValues.validUntil ? dayjs(initialValues.validUntil).toDate() : undefined,
            issuingDate: initialValues.issuingDate ? dayjs(initialValues.issuingDate).toDate() : undefined,
            frontSidePhoto: initialValues.frontSidePhoto || null,
            backSidePhoto: initialValues.backSidePhoto || null,
        },
        validate: zodResolver(validationSchema),
    })

    const handleSubmit = (values: typeof form.values) => {
        const dto: ResidencePermitDto = {
            ...initialValues,
            ...values,
            validUntil: dayjs(values.validUntil).format("YYYY-MM-DD"),
            issuingDate: dayjs(values.issuingDate).format("YYYY-MM-DD"),
            frontSidePhoto: values.frontSidePhoto,
            backSidePhoto: values.backSidePhoto,
        }
        onSubmit(dto)
    }

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Flex direction="column" gap="sm">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* Левая колонка */}
                    <Flex direction="column" gap="sm">
                        <TextInput label={labels.nationality} withAsterisk {...form.getInputProps("nationality")} />

                        <TextInput
                            label={labels.regNo}
                            description={<FormattedMessage id={locales.registrationNumberDescription} />}
                            leftSection={<IconId size={16} />}
                            withAsterisk
                            {...form.getInputProps("registrationNumber")}
                        />

                        <DateInput
                            label={labels.validUntil}
                            leftSection={<IconCalendar size={16} />}
                            valueFormat="DD MMMM YYYY"
                            withAsterisk
                            {...form.getInputProps("validUntil")}
                        />

                        <TextInput label={labels.purposeOfStay} withAsterisk {...form.getInputProps("purposeOfStay")} />

                        <Textarea label={labels.note} {...form.getInputProps("note")} />
                    </Flex>

                    {/* Правая колонка */}
                    <Flex direction="column" gap="sm">
                        <TextInput
                            label={labels.identityNumber}
                            description={<FormattedMessage id={locales.identityNumberDescription} />}
                            leftSection={<IconId size={16} />}
                            withAsterisk
                            {...form.getInputProps("identityNumber")}
                        />

                        <DateInput
                            label={labels.issueDate}
                            leftSection={<IconCalendar size={16} />}
                            valueFormat="DD MMMM YYYY"
                            withAsterisk
                            {...form.getInputProps("issuingDate")}
                        />

                        <TextInput
                            label={labels.issuingAuthority}
                            withAsterisk
                            {...form.getInputProps("issuingAuthority")}
                        />

                        <TextInput label={labels.stateOfBirth} withAsterisk {...form.getInputProps("stateOfBirth")} />
                    </Flex>
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <div>
                        <Text size="sm" fw={500} mb={4}>
                            <FormattedMessage id={locales.frontSidePhoto} />
                            <span style={{ color: "var(--mantine-color-red-6)" }}> *</span>
                        </Text>
                        <FileUploader
                            files={form.values.frontSidePhoto ? [form.values.frontSidePhoto] : []}
                            onFilesUploaded={(files) => form.setFieldValue("frontSidePhoto", files[0] || null)}
                            maxFiles={1}
                        />
                        {form.errors.frontSidePhoto && (
                            <Text c="red" size="xs" mt={2}>
                                {form.errors.frontSidePhoto}
                            </Text>
                        )}
                        {form.values.frontSidePhoto && (
                            <Group gap="xs" mt="xs">
                                <Pill
                                    key={form.values.frontSidePhoto.id}
                                    withRemoveButton
                                    onRemove={() => form.setFieldValue("frontSidePhoto", null)}
                                >
                                    <Text size="sm" truncate="end" style={{ maxWidth: "200px" }}>
                                        {form.values.frontSidePhoto.name}
                                    </Text>
                                </Pill>
                                {form.values.frontSidePhoto.link && (
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        color="gray"
                                        onClick={() => setPreviewImage(form.values.frontSidePhoto?.link || null)}
                                    >
                                        <IconEye size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                        )}
                    </div>

                    <div>
                        <Text size="sm" fw={500} mb={4}>
                            <FormattedMessage id={locales.backSidePhoto} />
                            <span style={{ color: "var(--mantine-color-red-6)" }}> *</span>
                        </Text>
                        <FileUploader
                            files={form.values.backSidePhoto ? [form.values.backSidePhoto] : []}
                            onFilesUploaded={(files) => form.setFieldValue("backSidePhoto", files[0] || null)}
                            maxFiles={1}
                        />
                        {form.errors.backSidePhoto && (
                            <Text c="red" size="xs" mt={2}>
                                {form.errors.backSidePhoto}
                            </Text>
                        )}
                        {form.values.backSidePhoto && (
                            <Group gap="xs" mt="xs">
                                <Pill
                                    key={form.values.backSidePhoto.id}
                                    withRemoveButton
                                    onRemove={() => form.setFieldValue("backSidePhoto", null)}
                                >
                                    <Text size="sm" truncate="end" style={{ maxWidth: "200px" }}>
                                        {form.values.backSidePhoto.name}
                                    </Text>
                                </Pill>
                                {form.values.backSidePhoto.link && (
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        color="gray"
                                        onClick={() => setPreviewImage(form.values.backSidePhoto?.link || null)}
                                    >
                                        <IconEye size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                        )}
                    </div>
                </SimpleGrid>

                <Group justify="flex-end" mt="md" wrap="nowrap">
                    {canDelete && (
                        <Button variant="subtle" color="red" onClick={onDelete} leftSection={<IconTrash size={16} />}>
                            <FormattedMessage id={locales.delete} />
                        </Button>
                    )}
                    <Button variant="default" onClick={onCancel}>
                        <FormattedMessage id={locales.cancel} />
                    </Button>
                    <Button type="submit" leftSection={<IconDeviceFloppy size={16} />}>
                        <FormattedMessage id="pages.profile.residencePermit.save" />
                    </Button>
                </Group>
            </Flex>
            <Modal opened={!!previewImage} onClose={() => setPreviewImage(null)} size="auto" centered>
                {previewImage && <Image src={previewImage} style={{ maxHeight: "80vh" }} />}
            </Modal>
        </form>
    )
}
