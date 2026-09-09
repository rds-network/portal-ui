import {
    Button,
    Checkbox,
    Flex,
    Loader,
    Radio,
    SegmentedControl,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { ApplicationDto, GenderEnumDto } from "@rds-network/portal-api-axios"
import {
    IconAlertCircle,
    IconAt,
    IconBrandTelegram,
    IconBriefcase,
    IconCake,
    IconCheck,
    IconEPassport,
    IconLanguageHiragana,
    IconLogin2,
    IconMailPin,
    IconMap2,
    IconPhone,
    IconSignature,
    IconWorld,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { defaultRequest } from "src/pages/application/form/lib/defaults"
import { locales } from "src/pages/application/form/lib/locales"
import { mapValuesToRequest } from "src/pages/application/form/lib/mapper"
import { PublicApplicationApiService } from "src/shared/api/applications/PublicApplicationApiService"
import { checkUserForApplication } from "src/shared/api/user/UserApiService"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { CaptchaSolver } from "src/shared/ui/captcha/CaptchaSolver"
import { CitySelect } from "src/shared/ui/citySelect/CitySelect"
import { z } from "zod"
import classes from "./Form.module.scss"

export const Form = () => {
    const intl = useIntl()
    const navigate = useNavigate()
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)

    const [request, setRequest] = useState<ApplicationDto>(defaultRequest)
    const [location, setLocation] = useState("IN")
    const [residence, setResidence] = useState("REQUIRED")
    const [experience, setExperience] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const fieldRequired = { message: intl.formatMessage({ id: locales.required }) }
    const selectCityList = { message: intl.formatMessage({ id: locales.selectCityList }) }
    const invalidSymbols = intl.formatMessage({ id: locales.invalidSymbols })
    const invalidSymbolsPassport = intl.formatMessage({ id: locales.invalidSymbolsPassport })
    const minMessage = (count: number) => intl.formatMessage({ id: locales.minLetters }, { count: count })
    const maxMessage = (count: number) => intl.formatMessage({ id: locales.maxLetters }, { count: count })
    const agreementRequired = { message: intl.formatMessage({ id: locales.agreementRequired }) }
    const agreement1Required = { message: intl.formatMessage({ id: locales.agreement1Error }) }
    const agreement3Required = { message: intl.formatMessage({ id: locales.agreement3Error }) }
    const agreement4Required = { message: intl.formatMessage({ id: locales.agreement4Error }) }

    const validationSchema = z.object({
        email: z
            .string(fieldRequired)
            .email(intl.formatMessage({ id: locales.emailInvalid }))
            .max(100, maxMessage(100)),
        name: z
            .string(fieldRequired)
            .regex(/^[a-zA-Z\s\-ĦħÀ-ÿ]+$/, invalidSymbols)
            .min(5, minMessage(5))
            .max(69, maxMessage(69)),
        patronymic: z
            .string()
            .regex(/^[a-zA-Z\s\-ĦħÀ-ÿ]+$/, invalidSymbols)
            .min(2, minMessage(2))
            .max(30, maxMessage(30))
            .optional(),
        birthDate: z.date(fieldRequired),
        passport: z
            .string(fieldRequired)
            .regex(/^[A-Za-z0-9]+$/, invalidSymbolsPassport)
            .min(6, minMessage(6))
            .max(20, maxMessage(20)),
        citizenship: z.string(fieldRequired).min(2, minMessage(2)).max(100, maxMessage(100)),
        telegram: z
            .string()
            .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, invalidSymbols)
            .min(5, minMessage(5))
            .max(32, maxMessage(32))
            .optional(),
        enterDate: location == "IN" ? z.date(fieldRequired) : z.date().optional(),
        city:
            location == "IN"
                ? z.string(selectCityList).min(2, selectCityList).max(100, maxMessage(100))
                : z.string().optional(),
        postalCode:
            location == "IN"
                ? z.string(fieldRequired).regex(/^\d{5}$/, intl.formatMessage({ id: locales.postalCodeInvalid }))
                : z.string().optional(),
        address:
            location == "IN"
                ? z.string(fieldRequired).min(16, minMessage(16)).max(200, maxMessage(200))
                : z.string().optional(),
        phone:
            location == "IN"
                ? z.string(fieldRequired).regex(/^\+381\d{9}$/, intl.formatMessage({ id: locales.phoneInvalid }))
                : z.string().optional(),
        agreement1:
            residence == "REQUIRED"
                ? z.boolean(agreement1Required).refine((v) => v, agreement1Required.message)
                : z.boolean().optional(),
        agreement2:
            residence == "REQUIRED"
                ? z.boolean(agreementRequired).refine((v) => v, agreementRequired.message)
                : z.boolean().optional(),
        agreement3:
            residence == "REQUIRED"
                ? z.boolean(agreement3Required).refine((v) => v, agreement3Required.message)
                : z.boolean().optional(),
        agreement4:
            residence == "REQUIRED"
                ? z.boolean(agreement4Required).refine((v) => v, agreement4Required.message)
                : z.boolean().optional(),
        agreement5:
            residence == "REQUIRED"
                ? z.boolean(agreementRequired).refine((v) => v, agreementRequired.message)
                : z.boolean().optional(),
        occupation: z.string(fieldRequired).min(3, minMessage(3)).max(100, maxMessage(100)),
        experience: experience ? z.string().min(20, minMessage(20)).max(1000, maxMessage(1000)) : z.string().optional(),
        languages: z.string(fieldRequired).min(5, minMessage(5)).max(200, maxMessage(200)),
        skills: z.string(fieldRequired).min(20, minMessage(20)).max(500, maxMessage(500)),
        goal: z.string(fieldRequired).min(100, minMessage(100)).max(1000, maxMessage(1000)),
        bio: z.string(fieldRequired).min(100, minMessage(100)).max(1000, maxMessage(1000)),
        gender: z.nativeEnum(GenderEnumDto, {
            required_error: intl.formatMessage({ id: locales.required }),
        }),
    })

    const form = useForm({
        mode: "uncontrolled",
        validate: zodResolver(validationSchema),
        onValuesChange: (values) => {
            setFormError(null)
            setRequest(mapValuesToRequest(values, request))
        },
    })

    const { data: currentUser } = useQuery({
        queryKey: ["checkUser"],
        queryFn: () =>
            checkUserForApplication().then((res) => {
                return res.data
            }),
    })

    useEffect(() => {
        if (currentUser) {
            form.setFieldValue("email", currentUser.email)
            form.setFieldValue("name", currentUser.fullName)
            form.setFieldValue("birthDate", dayjs(currentUser.birthDate).toDate())
            form.setFieldValue("telegram", currentUser.telegram)
            form.setFieldValue("address", currentUser.address)
            form.setFieldValue("phone", currentUser.phone)
            if (currentUser.gender) {
                form.setFieldValue("gender", currentUser.gender)
            }
        }
    }, [currentUser])

    const { isFetching, refetch } = useQuery({
        enabled: false,
        queryKey: ["sendApplication", request],
        queryFn: () =>
            PublicApplicationApiService.createApplication(captchaToken!!, request).then((res) => {
                notifications.show(
                    SuccessNotification(
                        <Text size="sm">
                            <FormattedMessage id={locales.applicationSent} />
                        </Text>,
                        null
                    )
                )
                navigate(`/application-status/${res.data.id}`)
            }),
    })

    const onSend = () => {
        if (captchaToken) {
            if (form.validate().hasErrors) {
                setFormError(intl.formatMessage({ id: locales.formError }))
            } else {
                refetch()
            }
        }
    }

    useEffect(() => {
        setFormError(null)
        setRequest({
            ...request,
            inSerbia: location == "IN",
            residenceRequired: residence == "REQUIRED",
            hasExperience: experience,
        })
    }, [location, residence, experience])

    useEffect(() => {
        if (captchaToken) {
            setFormError(null)
        } else {
            setFormError(intl.formatMessage({ id: locales.captchaError }))
        }
    }, [captchaToken])

    const addressArea = (
        <Flex className={classes.innerFlex}>
            <DateInput
                label={<FormattedMessage id={locales.enterDate} />}
                radius="md"
                className={classes.input}
                valueFormat="DD MMMM YYYY"
                maxDate={new Date()}
                withAsterisk
                leftSection={<IconLogin2 size={16} />}
                key={form.key("enterDate")}
                {...form.getInputProps("enterDate")}
                disabled={isFetching}
            />
            <CitySelect
                label={intl.formatMessage({ id: locales.city })}
                description={intl.formatMessage({ id: locales.cityDescription })}
                error={form.errors.city}
                withAsterisk
                className={classes.input}
                disabled={isFetching}
                {...form.getInputProps("city")}
            />
            <TextInput
                label={<FormattedMessage id={locales.postalCode} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconMailPin size={16} />}
                error={form.errors.postalCode}
                maxLength={5}
                placeholder="11000"
                {...form.getInputProps("postalCode")}
                disabled={isFetching}
                onChange={(event) => {
                    const value = event.currentTarget.value.replace(/\D/g, "")
                    form.setFieldValue("postalCode", value)
                }}
            />
            <TextInput
                label={<FormattedMessage id={locales.address} />}
                description={<FormattedMessage id={locales.addressDescription} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconMap2 size={16} />}
                key={form.key("address")}
                {...form.getInputProps("address")}
                disabled={isFetching}
            />
            <TextInput
                label={<FormattedMessage id={locales.phone} />}
                description={<FormattedMessage id={locales.phoneDescription} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconPhone size={16} />}
                key={form.key("phone")}
                {...form.getInputProps("phone")}
                disabled={isFetching}
            />
        </Flex>
    )

    const residenceArea = (
        <Flex className={classes.innerFlex} style={{ display: residence == "REQUIRED" ? "flex" : "none" }}>
            <Checkbox
                radius="md"
                label={<FormattedMessage id={locales.agreement1} />}
                key={form.key("agreement1")}
                {...form.getInputProps("agreement1")}
                disabled={isFetching}
            />
            <Checkbox
                radius="md"
                label={<FormattedMessage id={locales.agreement2} />}
                key={form.key("agreement2")}
                {...form.getInputProps("agreement2")}
                disabled={isFetching}
            />
            <Checkbox
                radius="md"
                label={<FormattedMessage id={locales.agreement3} />}
                key={form.key("agreement3")}
                {...form.getInputProps("agreement3")}
                disabled={isFetching}
            />
            <Checkbox
                radius="md"
                label={<FormattedMessage id={locales.agreement4} />}
                key={form.key("agreement4")}
                {...form.getInputProps("agreement4")}
                disabled={isFetching}
            />
            <Checkbox
                radius="md"
                label={<FormattedMessage id={locales.agreement5} />}
                key={form.key("agreement5")}
                {...form.getInputProps("agreement5")}
                disabled={isFetching}
            />
        </Flex>
    )

    return (
        <Flex className={classes.root}>
            <Text className={classes.title}>
                <FormattedMessage id={locales.title} />
            </Text>
            <TextInput
                label={<FormattedMessage id={locales.email} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconAt size={16} />}
                key={form.key("email")}
                {...form.getInputProps("email")}
                disabled={isFetching || currentUser !== undefined}
            />
            <TextInput
                label={<FormattedMessage id={locales.name} />}
                description={<FormattedMessage id={locales.nameDescription} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconSignature size={16} />}
                key={form.key("name")}
                {...form.getInputProps("name")}
                disabled={isFetching || currentUser !== undefined}
            />
            <TextInput
                label={<FormattedMessage id={locales.patronymic} />}
                description={<FormattedMessage id={locales.patronymicDescription} />}
                radius="md"
                className={classes.input}
                key={form.key("patronymic")}
                {...form.getInputProps("patronymic")}
                disabled={isFetching}
            />
            <DateInput
                label={<FormattedMessage id={locales.birthDate} />}
                radius="md"
                className={classes.input}
                withAsterisk
                defaultLevel="decade"
                valueFormat="DD MMMM YYYY"
                minDate={dayjs().subtract(100, "year").toDate()}
                maxDate={dayjs().subtract(18, "year").toDate()}
                leftSection={<IconCake size={16} />}
                key={form.key("birthDate")}
                {...form.getInputProps("birthDate")}
                disabled={isFetching}
            />
            <TextInput
                label={<FormattedMessage id={locales.passport} />}
                description={<FormattedMessage id={locales.passportDescription} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconEPassport size={16} />}
                key={form.key("passport")}
                {...form.getInputProps("passport")}
                disabled={isFetching}
            />
            <TextInput
                label={<FormattedMessage id={locales.citizenship} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconWorld size={16} />}
                key={form.key("citizenship")}
                {...form.getInputProps("citizenship")}
                disabled={isFetching}
            />
            <TextInput
                label={<FormattedMessage id={locales.telegram} />}
                description={<FormattedMessage id={locales.telegramDescription} />}
                radius="md"
                className={classes.input}
                leftSection={<IconBrandTelegram size={16} />}
                key={form.key("telegram")}
                {...form.getInputProps("telegram")}
                disabled={isFetching}
            />
            <SegmentedControl
                fullWidth
                radius="md"
                value={location}
                onChange={(v) => setLocation(v)}
                data={[
                    { value: "IN", label: <FormattedMessage id={locales.inSerbia} /> },
                    {
                        value: "OUT",
                        label: <FormattedMessage id={locales.outSerbia} />,
                    },
                ]}
                disabled={isFetching}
            />
            {location == "IN" && addressArea}
            <SegmentedControl
                fullWidth
                radius="md"
                value={residence}
                onChange={(v) => setResidence(v)}
                data={[
                    {
                        value: "REQUIRED",
                        label: <FormattedMessage id={locales.residenceRequired} />,
                    },
                    { value: "NOT_REQUIRED", label: <FormattedMessage id={locales.residenceNotRequired} /> },
                ]}
                disabled={isFetching}
            />
            {residenceArea}
            <Radio.Group
                withAsterisk
                label={
                    <Flex align="center" gap={6} style={{ display: "inline-flex" }}>
                        <FormattedMessage id={locales.gender} />
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
                                aria-label={String(intl.formatMessage({ id: "pages.profile.props.gender.hint" }))}
                                style={{ display: "inline-flex" }}
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => e.preventDefault()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <IconAlertCircle size={14} />
                            </span>
                        </Tooltip>
                    </Flex>
                }
                className={classes.input}
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
            <TextInput
                label={<FormattedMessage id={locales.occupation} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconBriefcase size={16} />}
                key={form.key("occupation")}
                {...form.getInputProps("occupation")}
                disabled={isFetching}
            />
            <Checkbox
                radius="md"
                label={<FormattedMessage id={locales.checkExperience} />}
                onChange={(e) => setExperience(e.currentTarget.checked)}
                disabled={isFetching}
            />
            {experience && (
                <Textarea
                    label={<FormattedMessage id={locales.experience} />}
                    radius="md"
                    autosize
                    minRows={4}
                    withAsterisk
                    key={form.key("experience")}
                    {...form.getInputProps("experience")}
                    disabled={isFetching}
                />
            )}
            <TextInput
                label={<FormattedMessage id={locales.languages} />}
                description={<FormattedMessage id={locales.languagesDescription} />}
                radius="md"
                className={classes.input}
                withAsterisk
                leftSection={<IconLanguageHiragana size={16} />}
                key={form.key("languages")}
                {...form.getInputProps("languages")}
                disabled={isFetching}
            />
            <Textarea
                label={<FormattedMessage id={locales.skills} />}
                description={<FormattedMessage id={locales.skillsDescription} />}
                radius="md"
                autosize
                minRows={2}
                withAsterisk
                key={form.key("skills")}
                {...form.getInputProps("skills")}
                disabled={isFetching}
            />
            <Textarea
                label={<FormattedMessage id={locales.goal} />}
                radius="md"
                autosize
                minRows={4}
                withAsterisk
                key={form.key("goal")}
                {...form.getInputProps("goal")}
                disabled={isFetching}
            />
            <Textarea
                label={<FormattedMessage id={locales.bio} />}
                radius="md"
                autosize
                minRows={4}
                withAsterisk
                key={form.key("bio")}
                {...form.getInputProps("bio")}
                disabled={isFetching}
            />
            <CaptchaSolver
                className={classes.captcha}
                onSuccess={setCaptchaToken}
                onError={() => setCaptchaToken(null)}
            />
            <Flex columnGap="md" rowGap="sm" align="center" justify="end" wrap="wrap">
                {formError && (
                    <Flex align="center" justify="end" columnGap={4}>
                        <IconAlertCircle size={16} color="red" />
                        <Text className={classes.errorMessage}>{formError}</Text>
                    </Flex>
                )}
                <Button
                    className={classes.button}
                    variant="gradient"
                    onClick={onSend}
                    disabled={isFetching}
                    leftSection={isFetching ? <Loader size={16} /> : <IconCheck size={16} />}
                >
                    <FormattedMessage id={locales.buttonSend} />
                </Button>
            </Flex>
        </Flex>
    )
}

export default Form
