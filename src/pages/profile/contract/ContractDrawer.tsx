import { ActionIcon, Button, Drawer, Flex, Group } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { ContractDto, ContractTypeEnum } from "@rds-network/portal-api-axios"
import { IconCalendar, IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useEffect } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ContractTypeSelect } from "src/shared/ui/contractTypeSelect/ContractTypeSelect"
import { z } from "zod"

interface ContractDrawerProps {
    opened: boolean
    onClose: () => void
    onSuccess: () => void
    userId: number
    contracts: ContractDto[]
}

interface FormValues {
    startDate: string
    endDate: string
    type: ContractTypeEnum | null
}

export const ContractDrawer = ({ opened, onClose, onSuccess, userId, contracts }: ContractDrawerProps) => {
    const intl = useIntl()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (opened) {
            form.reset()
            form.setValues({
                contracts: contracts.map((c) => ({
                    startDate: c.startDate,
                    endDate: c.endDate,
                    type: c.type,
                })),
            })
        }
    }, [opened, contracts])

    const validationSchema = z
        .object({
            startDate: z.string().refine(
                (val) => {
                    const date = dayjs(val, "YYYY-MM-DD", true)
                    return date.isValid()
                },
                intl.formatMessage({ id: "pages.profile.validation.invalidDate" })
            ),
            endDate: z.string().refine(
                (val) => {
                    const date = dayjs(val, "YYYY-MM-DD", true)
                    return date.isValid()
                },
                intl.formatMessage({ id: "pages.profile.validation.invalidDate" })
            ),
            type: z.nativeEnum(ContractTypeEnum, {
                errorMap: () => ({
                    message: intl.formatMessage({ id: "pages.profile.validation.contractTypeRequired" }),
                }),
            }),
        })
        .refine(
            (data) => {
                if (!data.startDate || !data.endDate) return true
                return dayjs(data.endDate).isAfter(dayjs(data.startDate))
            },
            {
                message: intl.formatMessage({ id: "pages.profile.validation.endDateAfterStart" }),
                path: ["endDate"],
            }
        )

    const form = useForm<{ contracts: FormValues[] }>({
        initialValues: {
            contracts: contracts.map((c) => ({
                startDate: c.startDate,
                endDate: c.endDate,
                type: c.type,
            })),
        },
        validate: zodResolver(
            z.object({
                contracts: z.array(validationSchema),
            })
        ),
    })

    const { mutate: updateContracts, isPending } = useMutation({
        mutationFn: async (values: { contracts: FormValues[] }) => {
            const validContracts = values.contracts.filter((c) => c.startDate && c.endDate && c.type)

            return UserApiService.updateContracts(
                userId,
                validContracts.map((c) => ({
                    id: crypto.randomUUID(),
                    startDate: dayjs(c.startDate).format("YYYY-MM-DD"),
                    endDate: dayjs(c.endDate).format("YYYY-MM-DD"),
                    type: c.type as ContractTypeEnum,
                }))
            )
        },
        onSuccess: () => {
            notifications.show(SuccessNotification(<FormattedMessage id="pages.profile.contract.created" />, null))
            queryClient.invalidateQueries({ queryKey: ["getInfo"] })
            onSuccess()
            onClose()
        },
        onError: () => {
            notifications.show(ErrorNotification(<FormattedMessage id="pages.profile.contract.createError" />))
        },
    })

    const handleSubmit = (values: { contracts: FormValues[] }) => {
        if (form.validate().hasErrors) {
            return
        }
        updateContracts(values)
    }

    const handleDeleteContract = (index: number) => {
        if (form.values.contracts.length <= 1) {
            notifications.show(ErrorNotification(<FormattedMessage id="pages.profile.contract.cannotDeleteLast" />))
            return
        }
        form.removeListItem("contracts", index)
    }

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={<FormattedMessage id="pages.profile.contract.add" />}
            position="right"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Flex direction="column" gap="md">
                    {form.values.contracts.length > 0 ? (
                        form.values.contracts.map((contract, index) => (
                            <Flex
                                key={index}
                                direction="column"
                                gap="md"
                                style={{
                                    position: "relative",
                                    padding: "16px",
                                    border: "1px solid var(--portal-border)",
                                    borderRadius: "var(--mantine-radius-sm)",
                                }}
                            >
                                <Group justify="space-between" mb="xs">
                                    <FormattedMessage
                                        id={`pages.profile.contract.number`}
                                        values={{ number: index + 1 }}
                                    />
                                    <ActionIcon
                                        color="red"
                                        variant="subtle"
                                        onClick={() => handleDeleteContract(index)}
                                        disabled={form.values.contracts.length <= 1}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                                <DateInput
                                    leftSection={<IconCalendar size={16} />}
                                    label={<FormattedMessage id="pages.profile.contract.startDate" />}
                                    valueFormat="DD MMMM YYYY"
                                    clearable
                                    withAsterisk
                                    value={contract.startDate ? dayjs(contract.startDate).toDate() : null}
                                    onChange={(date) => {
                                        const startDate = date ? dayjs(date).startOf("day") : null
                                        form.setFieldValue(
                                            `contracts.${index}.startDate`,
                                            startDate ? startDate.format("YYYY-MM-DD") : ""
                                        )

                                        // Автоматически устанавливаем дату окончания через год
                                        if (startDate) {
                                            const endDate = startDate.add(1, "year")
                                            form.setFieldValue(
                                                `contracts.${index}.endDate`,
                                                endDate.format("YYYY-MM-DD")
                                            )
                                        }
                                    }}
                                    error={form.errors?.[`contracts.${index}.startDate`]}
                                />
                                <DateInput
                                    leftSection={<IconCalendar size={16} />}
                                    label={<FormattedMessage id="pages.profile.contract.endDate" />}
                                    valueFormat="DD MMMM YYYY"
                                    clearable
                                    withAsterisk
                                    value={contract.endDate ? dayjs(contract.endDate).toDate() : null}
                                    onChange={(date) => {
                                        form.setFieldValue(
                                            `contracts.${index}.endDate`,
                                            date ? dayjs(date).startOf("day").format("YYYY-MM-DD") : ""
                                        )
                                    }}
                                    error={form.errors?.[`contracts.${index}.endDate`]}
                                />
                                <ContractTypeSelect
                                    form={form}
                                    path={`contracts.${index}.type`}
                                    error={form.errors?.[`contracts.${index}.type`]}
                                    initial={contract.type ?? null}
                                />
                            </Flex>
                        ))
                    ) : (
                        <Flex
                            align="center"
                            justify="center"
                            style={{
                                padding: "32px",
                                border: "1px dashed var(--portal-border)",
                                borderRadius: "var(--mantine-radius-sm)",
                            }}
                        >
                            <FormattedMessage id="pages.profile.contract.no-contract" />
                        </Flex>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => form.insertListItem("contracts", { startDate: "", endDate: "", type: null })}
                        rightSection={<IconPlus size={14} />}
                    >
                        <FormattedMessage id="pages.profile.contract.button" />
                    </Button>
                    <Button type="submit" loading={isPending} rightSection={<IconDeviceFloppy size={14} />}>
                        <FormattedMessage id="pages.profile.contract.save" />
                    </Button>
                </Flex>
            </form>
        </Drawer>
    )
}
