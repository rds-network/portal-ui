import { Button, Drawer, Flex, Loader, MantineSize, Text, TextInput } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { UserCreateRequest } from "@rds-network/portal-api-axios"
import { IconAt, IconCalendarMonth, IconCalendarOff, IconUser, IconUserPlus } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { defaultCreateRequest, defaultCreateUserFormValues } from "src/pages/users/lib/defaults"
import { locales } from "src/pages/users/lib/locales"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ContractTypeSelect } from "src/shared/ui/contractTypeSelect/ContractTypeSelect"
import { z } from "zod"
import classes from "./CreateUser.module.scss"

export const CreateUser = ({
    withLabel = false,
    className,
    size,
}: {
    withLabel?: boolean
    className?: string
    size?: MantineSize
}) => {
    const intl = useIntl()
    const [opened, { open, close }] = useDisclosure(false)
    const [request, setRequest] = useState<UserCreateRequest>(defaultCreateRequest)

    const requiredMessage = { message: intl.formatMessage({ id: locales.required }) }
    const minMessage = (count: number) => intl.formatMessage({ id: locales.minLetters }, { count: count })
    const maxMessage = (count: number) => intl.formatMessage({ id: locales.maxLetters }, { count: count })
    const validationSchema = z.object({
        firstName: z
            .string(requiredMessage)
            .min(2, minMessage(2))
            .max(50, maxMessage(50))
            .regex(/^[a-zA-Z\s'-]+$/, intl.formatMessage({ id: locales.invalidName })),
        secondName: z
            .string(requiredMessage)
            .min(2, minMessage(2))
            .max(50, maxMessage(50))
            .regex(/^[a-zA-Z\s'-]+$/, intl.formatMessage({ id: locales.invalidName })),
        email: z.string(requiredMessage).email(intl.formatMessage({ id: locales.invalidEmail })),
        username: z
            .string(requiredMessage)
            .min(4, minMessage(4))
            .max(32, maxMessage(32))
            .regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, intl.formatMessage({ id: locales.invalidUsername })),
        contractFrom: z.date(requiredMessage),
        contractUntil: z.date(requiredMessage),
        contractType: z.string(requiredMessage),
    })

    const form = useForm({
        mode: "uncontrolled",
        validate: zodResolver(validationSchema),
        onValuesChange: (values, previous) => {
            const currentRequest = request
            if (values["firstName"] && values["secondName"]) {
                currentRequest.fullName = `${values["firstName"].trim()} ${values["secondName"].trim()}`
            }
            if (values["email"]) {
                const email = (values["email"] as string).toLowerCase().trim()
                currentRequest.email = email
                if (values["email"] !== previous["email"]) {
                    if (email.includes("@")) {
                        form.setFieldValue("username", email.split("@")[0])
                    } else {
                        form.setFieldValue("username", email)
                    }
                }
            }
            if (values["username"]) {
                currentRequest.username = (values["username"] as string).toLowerCase().trim()
            }
            if (values["contractUntil"]) {
                const date = dayjs(values["contractUntil"]).format(DEFAULT_DATE_FORMAT)
                currentRequest.contract = { ...currentRequest.contract, endDate: date }
            }
            if (values["contractFrom"]) {
                if (
                    !previous["contractFrom"] ||
                    (values["contractFrom"] as Date).toISOString() !== (previous["contractFrom"] as Date).toISOString()
                ) {
                    const date = dayjs(values["contractFrom"])
                    form.setFieldValue("contractUntil", date.add(1, "year").toDate())
                    currentRequest.contract = {
                        ...currentRequest.contract,
                        startDate: date.format(DEFAULT_DATE_FORMAT),
                    }
                }
            }
            if (values["contractType"]) {
                currentRequest.contract = { ...currentRequest.contract, type: values["contractType"] }
            }
            setRequest(currentRequest)
        },
    })

    const { isFetching, refetch } = useQuery({
        enabled: false,
        queryKey: ["createUser", request],
        queryFn: () =>
            UserApiService.createUser(request).then((_) => {
                notifications.show(
                    SuccessNotification(
                        <Text size="sm">
                            <FormattedMessage id={locales.userCreatedMessage} />
                        </Text>,
                        null
                    )
                )
                close()
                setRequest(defaultCreateRequest)
                form.setValues(defaultCreateUserFormValues)
            }),
    })

    const onClickCreate = () => {
        if (!form.validate().hasErrors) {
            refetch()
        }
    }

    return (
        <>
            <Drawer opened={opened} onClose={close} title={<FormattedMessage id={locales.newUser} />}>
                <Flex direction="column" rowGap={8}>
                    <Flex className={classes.fieldRow} columnGap={8}>
                        <TextInput
                            withAsterisk
                            className={classes.name}
                            key={form.key("firstName")}
                            label={<FormattedMessage id={locales.firstName} />}
                            {...form.getInputProps("firstName")}
                        ></TextInput>
                        <TextInput
                            withAsterisk
                            className={classes.lastName}
                            key={form.key("secondName")}
                            label={<FormattedMessage id={locales.lastName} />}
                            {...form.getInputProps("secondName")}
                        ></TextInput>
                    </Flex>
                    <TextInput
                        withAsterisk
                        key={form.key("email")}
                        label={<FormattedMessage id={locales.email} />}
                        leftSection={<IconAt size={16} />}
                        {...form.getInputProps("email")}
                    ></TextInput>
                    <TextInput
                        withAsterisk
                        key={form.key("username")}
                        label={<FormattedMessage id={locales.username} />}
                        leftSection={<IconUser size={16} />}
                        {...form.getInputProps("username")}
                    ></TextInput>
                    <Text c="dimmed" size="sm" mt="md">
                        <FormattedMessage id={locales.contractInfo} />
                    </Text>
                    <Flex className={classes.fieldRow} columnGap={8}>
                        <DateInput
                            withAsterisk
                            valueFormat="DD MMM YYYY"
                            className={classes.contractFrom}
                            key={form.key("contractFrom")}
                            leftSection={<IconCalendarMonth size={16} />}
                            label={<FormattedMessage id={locales.contractFrom} />}
                            {...form.getInputProps("contractFrom")}
                        ></DateInput>
                        <DateInput
                            withAsterisk
                            valueFormat="DD MMM YYYY"
                            className={classes.contractUntil}
                            key={form.key("contractUntil")}
                            leftSection={<IconCalendarOff size={16} />}
                            label={<FormattedMessage id={locales.contractUntil} />}
                            {...form.getInputProps("contractUntil")}
                        ></DateInput>
                    </Flex>
                    <ContractTypeSelect form={form} path={"contractType"} {...form.getInputProps("contractType")} />
                    <Button
                        mt="md"
                        disabled={isFetching}
                        rightSection={isFetching ? <Loader size={16} /> : <IconUserPlus size={16} />}
                        onClick={onClickCreate}
                    >
                        <FormattedMessage id={locales.createButton} />
                    </Button>
                </Flex>
            </Drawer>
            <Button
                variant={withLabel ? "filled" : "transparent"}
                size={size || (withLabel ? "md" : "sm")}
                radius="md"
                leftSection={<IconUserPlus size={18} aria-hidden="true" />}
                aria-label={intl.formatMessage({ id: locales.addUser, defaultMessage: "Добавить пользователя" })}
                className={className}
                onClick={open}
            >
                {withLabel && <FormattedMessage id={locales.addUser} defaultMessage="Добавить пользователя" />}
            </Button>
        </>
    )
}
