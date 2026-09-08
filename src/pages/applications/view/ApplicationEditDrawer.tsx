import { Button, Drawer, Flex, Radio, Select, TextInput, Tooltip } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { ApplicationDto, GenderEnumDto } from "@rds-network/portal-api-axios"
import {
    IconAt,
    IconBrandTelegram,
    IconCake,
    IconDeviceFloppy,
    IconEPassport,
    IconInfoCircle,
    IconLocation,
    IconMapPin,
    IconPhone,
    IconSignature,
} from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { CitiesApiService } from "src/shared/api/CitiesApiService"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { CitySelect } from "src/shared/ui/citySelect/CitySelect"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { z } from "zod"

interface ApplicationEditDrawerProps {
    opened: boolean
    onClose: () => void
    application: ApplicationDto
    onApplicationUpdate: (application: ApplicationDto) => void
}

export const ApplicationEditDrawer = ({
    opened,
    onClose,
    application,
    onApplicationUpdate,
}: ApplicationEditDrawerProps) => {
    const intl = useIntl()

    const { data: cities = [] } = useQuery({
        queryKey: ["cities"],
        queryFn: () => CitiesApiService.getCities().then((response) => response.data),
    })

    // Типобезопасный доступ к дополнительному полю gender,
    // которого пока нет в сгенерированном ApplicationDto
    type ApplicationWithGender = { gender?: GenderEnumDto }
    const appGender: string = (application as unknown as ApplicationWithGender).gender || ""

    const validationSchema = z.object({
        name: z
            .string()
            .regex(/^[a-zA-Z\s\-ĦħÀ-ÿ]+$/, intl.formatMessage({ id: "pages.profile.validation.invalidSymbols" }))
            .min(5, intl.formatMessage({ id: "pages.profile.validation.minLetters" }, { count: 5 }))
            .max(69, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 69 }))
            .optional()
            .or(z.literal("")),
        patronymic: z
            .string()
            .regex(/^[a-zA-Z\s\-ĦħÀ-ÿ]+$/, intl.formatMessage({ id: "pages.profile.validation.invalidSymbols" }))
            .min(2, intl.formatMessage({ id: "pages.profile.validation.minLetters" }, { count: 2 }))
            .max(30, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 30 }))
            .optional()
            .or(z.literal("")),
        email: z
            .string()
            .email(intl.formatMessage({ id: "pages.profile.validation.invalidEmail" }))
            .max(100, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 100 })),
        phone: z
            .string()
            .regex(/^\+?\d{10,15}$/, intl.formatMessage({ id: "pages.profile.validation.invalidPhone" }))
            .max(20, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 20 }))
            .optional()
            .or(z.literal("")),
        telegram: z
            .string()
            .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, intl.formatMessage({ id: "pages.profile.validation.invalidTelegram" }))
            .max(32, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 32 }))
            .optional()
            .or(z.literal("")),
        birthDate: z
            .string()
            .refine(
                (val) => {
                    const date = dayjs(val, "YYYY-MM-DD", true)
                    return date.isValid() && date.isBefore(dayjs()) && date.isAfter(dayjs().subtract(120, "years"))
                },
                intl.formatMessage({ id: "pages.profile.validation.invalidBirthDate" })
            )
            .refine(
                (val) => {
                    const date = dayjs(val, "YYYY-MM-DD", true)
                    return date.isBefore(dayjs().subtract(18, "years"))
                },
                intl.formatMessage({ id: "pages.profile.validation.tooYoung" })
            )
            .optional()
            .or(z.literal("")),
        passport: z
            .string()
            .max(50, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 50 }))
            .optional()
            .or(z.literal("")),
        city: z
            .string()
            .max(100, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 100 }))
            .refine(
                (val) => !val || !cities.length || cities.some((c) => c.name === val || c.nameCyrillic === val),
                intl.formatMessage({ id: "pages.profile.validation.cityNotInList" })
            )
            .or(z.literal("")),
        postalCode: z
            .string()
            .regex(/^\d{5}$/, intl.formatMessage({ id: "pages.profile.validation.invalidPostalCode" }))
            .optional()
            .or(z.literal("")),
        address: z
            .string()
            .max(200, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 200 }))
            .optional()
            .or(z.literal("")),
        program: z.string().optional(),
        project: z.string().optional(),
    })

    const form = useForm({
        initialValues: {
            name: application.name || "",
            patronymic: application.patronymic || "",
            email: application.email || "",
            phone: application.phone || "",
            telegram: application.telegram || "",
            birthDate: application.birthDate || "",
            passport: application.passport || "",
            city: application.city || "",
            postalCode: application.postalCode || "",
            address: application.address || "",
            program: application.program || "",
            project: application.project || "",
            gender: appGender,
        },
        validate: zodResolver(validationSchema),
    })

    const { programs, visibleProjects } = useProgramProjectFilter(
        form.values.program || null,
        form.values.project || null
    )

    const programOptions = programs.map((program) => ({
        value: program.code,
        label: getLocalizedName(program, intl.locale),
    }))
    const projectOptions = visibleProjects.map((project) => ({
        value: project.code,
        label: getLocalizedName(project, intl.locale),
    }))

    const { mutate: updateApplication, isPending } = useMutation({
        mutationKey: ["writeApplication"],
        mutationFn: async (data: Partial<ApplicationDto>) => {
            const response = await PrivateApplicationApiService.updateApplication({
                id: application.id,
                ...data,
            })
            return response.data
        },
        onSuccess: (updatedApplication) => {
            onApplicationUpdate(updatedApplication)
            notifications.show(SuccessNotification(<FormattedMessage id="pages.applications.view.editSuccess" />, null))
            onClose()
        },
        onError: () => {
            notifications.show(ErrorNotification(<FormattedMessage id="pages.applications.view.editError" />))
        },
    })

    const handleSubmit = () => {
        if (form.validate().hasErrors) {
            return
        }

        type UpdateApplicationPayload = Partial<ApplicationDto> & { gender?: GenderEnumDto }
        const updateData: UpdateApplicationPayload = {}

        if (form.values.name?.trim()) updateData.name = form.values.name.trim()
        if (form.values.patronymic?.trim()) updateData.patronymic = form.values.patronymic.trim()
        if (form.values.email?.trim()) updateData.email = form.values.email.trim()
        if (form.values.phone?.trim()) updateData.phone = form.values.phone.trim()
        if (form.values.telegram?.trim()) updateData.telegram = form.values.telegram.trim()
        if (form.values.birthDate?.trim()) updateData.birthDate = form.values.birthDate.trim()
        if (form.values.passport?.trim()) updateData.passport = form.values.passport.trim()
        if (form.values.city?.trim()) updateData.city = form.values.city.trim()
        if (form.values.postalCode?.trim()) updateData.postalCode = form.values.postalCode.trim()
        if (form.values.address?.trim()) updateData.address = form.values.address.trim()
        updateData.program = form.values.program.trim()
        updateData.project = form.values.project?.trim() || ""
        if (form.values.gender?.trim()) updateData.gender = form.values.gender as GenderEnumDto

        updateApplication(updateData)
    }

    // Обновляем форму при изменении application
    React.useEffect(() => {
        if (opened) {
            form.setValues({
                name: application.name || "",
                patronymic: application.patronymic || "",
                email: application.email || "",
                phone: application.phone || "",
                telegram: application.telegram || "",
                birthDate: application.birthDate || "",
                passport: application.passport || "",
                city: application.city || "",
                postalCode: application.postalCode || "",
                address: application.address || "",
                program: application.program || "",
                project: application.project || "",
                gender: (application as unknown as ApplicationWithGender).gender || "",
            })
        }
    }, [opened, application])

    const onProgramChange = (program: string | null) => {
        form.setFieldValue("program", program ?? "")

        const selectedProgramDto = programs.find((p) => p.code === program)
        const projectAvailable =
            form.values.project && (selectedProgramDto?.projectCodes ?? []).includes(form.values.project)
        if (!projectAvailable) {
            form.setFieldValue("project", "")
        }
    }

    const onProjectChange = (project: string | null) => {
        form.setFieldValue("project", project ?? "")
    }

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={<FormattedMessage id="pages.applications.view.editTitle" />}
            position="right"
            size="md"
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit()
                }}
            >
                <Flex direction="column" gap="md">
                    <TextInput
                        leftSection={<IconSignature size={16} />}
                        label={<FormattedMessage id="pages.applications.view.name" />}
                        {...form.getInputProps("name")}
                    />
                    <TextInput
                        leftSection={<IconSignature size={16} />}
                        label={<FormattedMessage id="pages.applications.view.patronymic" />}
                        {...form.getInputProps("patronymic")}
                    />
                    <TextInput
                        leftSection={<IconAt size={16} />}
                        label={<FormattedMessage id="pages.applications.view.email" />}
                        withAsterisk
                        {...form.getInputProps("email")}
                    />
                    <TextInput
                        leftSection={<IconPhone size={16} />}
                        label={<FormattedMessage id="pages.applications.view.phone" />}
                        withAsterisk
                        {...form.getInputProps("phone")}
                    />
                    <TextInput
                        leftSection={<IconBrandTelegram size={16} />}
                        label={<FormattedMessage id="pages.applications.view.telegram" />}
                        {...form.getInputProps("telegram")}
                    />
                    <DateInput
                        leftSection={<IconCake size={16} />}
                        valueFormat="DD MMMM YYYY"
                        label={<FormattedMessage id="pages.applications.view.birth" />}
                        value={form.values.birthDate ? dayjs(form.values.birthDate).toDate() : null}
                        onChange={(date) => {
                            form.setFieldValue("birthDate", date ? dayjs(date).format("YYYY-MM-DD") : "")
                        }}
                        error={form.errors.birthDate}
                        clearable
                    />
                    <TextInput
                        leftSection={<IconEPassport size={16} />}
                        label={<FormattedMessage id="pages.applications.view.passport" />}
                        {...form.getInputProps("passport")}
                    />
                    <CitySelect
                        label={<FormattedMessage id="pages.applications.view.city" />}
                        withAsterisk
                        {...form.getInputProps("city")}
                    />
                    <TextInput
                        leftSection={<IconMapPin size={16} />}
                        label={<FormattedMessage id="pages.applications.view.postal-code" />}
                        {...form.getInputProps("postalCode")}
                    />
                    <TextInput
                        leftSection={<IconLocation size={16} />}
                        label={<FormattedMessage id="pages.applications.view.address" />}
                        {...form.getInputProps("address")}
                    />
                    <Select
                        label={<FormattedMessage id="pages.applications.view.program" />}
                        placeholder={intl.formatMessage({ id: "pages.application.form.program-placeholder" })}
                        searchable
                        clearable
                        data={programOptions}
                        value={form.values.program || null}
                        error={form.errors.program}
                        onChange={onProgramChange}
                    />
                    <Select
                        label={<FormattedMessage id="pages.applications.view.project" />}
                        placeholder={intl.formatMessage({ id: "pages.application.form.project-placeholder" })}
                        searchable
                        clearable
                        data={projectOptions}
                        value={form.values.project || null}
                        onChange={onProjectChange}
                        disabled={!form.values.program || projectOptions.length === 0}
                    />
                    <Radio.Group
                        label={
                            <Flex align="center" gap={6}>
                                <FormattedMessage id="pages.applications.view.gender" />
                                <Tooltip
                                    label={<FormattedMessage id="pages.profile.props.gender.hint" />}
                                    multiline
                                    withArrow
                                    w={380}
                                    events={{ hover: true, focus: true, touch: true }}
                                    withinPortal
                                >
                                    <span
                                        tabIndex={0}
                                        role="button"
                                        aria-label={String(
                                            intl.formatMessage({ id: "pages.profile.props.gender.hint" })
                                        )}
                                        style={{ display: "inline-flex" }}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <IconInfoCircle size={14} />
                                    </span>
                                </Tooltip>
                            </Flex>
                        }
                        key={form.key("gender")}
                        {...form.getInputProps("gender")}
                    >
                        <Flex gap={16} wrap="wrap">
                            <Radio
                                value={GenderEnumDto.Male}
                                label={<FormattedMessage id="pages.profile.props.gender.male" />}
                            />
                            <Radio
                                value={GenderEnumDto.Female}
                                label={<FormattedMessage id="pages.profile.props.gender.female" />}
                            />
                        </Flex>
                    </Radio.Group>
                    <Button type="submit" loading={isPending} rightSection={<IconDeviceFloppy size={14} />}>
                        <FormattedMessage id="pages.profile.buttons.save" />
                    </Button>
                </Flex>
            </form>
        </Drawer>
    )
}
