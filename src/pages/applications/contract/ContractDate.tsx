import { Button, Flex, Popover, Text } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { ApplicationDto, ContractDto, ContractTypeEnum } from "@rds-network/portal-api-axios"
import { IconCalendarMonth, IconCalendarOff, IconDeviceFloppy, IconPencil, IconPlus } from "@tabler/icons-react"
import dayjs from "dayjs"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import classes from "src/pages/applications/contract/ContractDate.module.scss"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { ContractTypeSelect } from "src/shared/ui/contractTypeSelect/ContractTypeSelect"
import { ApplicationStatus } from "src/shared/user/applications"
import { v4 } from "uuid"
import { z } from "zod"
import { locales } from "./lib/locales"

interface ContractEditModalProps {
    application: ApplicationDto
    onChange?: (contractDto: ContractDto) => void
    className?: string
    disabled?: boolean
}

export const ContractDate = ({ application, onChange, className, disabled }: ContractEditModalProps) => {
    const intl = useIntl()
    const [opened, { close, toggle }] = useDisclosure(false)

    const isApplicationCompleted = application.status === ApplicationStatus.DONE

    const initialContract: ContractDto = application.contract || {
        id: v4(),
        startDate: dayjs().format(DEFAULT_DATE_FORMAT),
        endDate: dayjs().add(1, "years").format(DEFAULT_DATE_FORMAT),
        type: application.residenceRequired ? ContractTypeEnum.Regular : ContractTypeEnum.Associated,
    }

    const [contract, setContract] = useState<ContractDto>(initialContract)

    const requiredMessage = { message: intl.formatMessage({ id: locales.required }) }
    const validationSchema = z.object({
        contractFrom: z.date(requiredMessage),
        contractUntil: z.date(requiredMessage).min(dayjs(contract.startDate).toDate()),
        contractType: z.string(requiredMessage),
    })

    const form = useForm({
        mode: "uncontrolled",
        validate: zodResolver(validationSchema),
        initialValues: {
            contractFrom: dayjs(contract.startDate).toDate(),
            contractUntil: dayjs(contract.endDate).toDate(),
            contractType: contract.type,
        },
        onValuesChange: (values, previous) => {
            const currentContract = { ...contract }
            if (values["contractUntil"]) {
                currentContract.endDate = dayjs(values["contractUntil"]).format(DEFAULT_DATE_FORMAT)
            }
            if (values["contractFrom"]) {
                if (
                    !previous["contractFrom"] ||
                    (values["contractFrom"] as Date).toISOString() !== (previous["contractFrom"] as Date).toISOString()
                ) {
                    const date = dayjs(values["contractFrom"])
                    form.setFieldValue("contractUntil", date.add(1, "year").toDate())
                    currentContract.startDate = date.format(DEFAULT_DATE_FORMAT)
                }
            }
            if (values["contractType"]) {
                currentContract.type = values["contractType"]
            }
            setContract(currentContract)
        },
    })

    const onUpdate = () => {
        if (!form.validate().hasErrors) {
            if (onChange) {
                const formValues = form.getValues()
                onChange({
                    id: contract.id,
                    startDate: dayjs(formValues.contractFrom).format(DEFAULT_DATE_FORMAT),
                    endDate: dayjs(formValues.contractUntil).format(DEFAULT_DATE_FORMAT),
                    type: formValues.contractType as ContractTypeEnum,
                })
                close()
            }
        }
    }

    return (
        <Popover width={350} withArrow shadow="md" opened={opened}>
            <Popover.Target>
                <Button
                    variant="transparent"
                    rightSection={application.contract ? <IconPencil size={14} /> : <IconPlus size={14} />}
                    color={application.contract ? "blue" : "gray"}
                    onClick={toggle}
                    className={className}
                    disabled={disabled || isApplicationCompleted}
                    size="xs"
                    h={28}
                    px="sm"
                >
                    {application.contract && (
                        <Text size="sm">{dayjs(application.contract.startDate).format("DD MMM YYYY")}</Text>
                    )}
                    {!application.contract && (
                        <Text size="sm">
                            <FormattedMessage id={locales.add} />
                        </Text>
                    )}
                </Button>
            </Popover.Target>
            <Popover.Dropdown>
                <Flex rowGap={8} direction="column">
                    <Flex columnGap={8}>
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
                    <ContractTypeSelect
                        form={form}
                        path={"contractType"}
                        {...form.getInputProps("contractType")}
                        initial={contract.type}
                    />
                    <Flex columnGap={8}>
                        <Button variant="light" color="gray" size="xs" className={classes.button} onClick={close}>
                            <FormattedMessage id={locales.cancel} />
                        </Button>
                        <Button
                            size="xs"
                            className={classes.button}
                            onClick={onUpdate}
                            disabled={disabled}
                            leftSection={<IconDeviceFloppy size={16} />}
                        >
                            <FormattedMessage id={locales.save} />
                        </Button>
                    </Flex>
                </Flex>
            </Popover.Dropdown>
        </Popover>
    )
}
