import { Button, Flex, Modal, Select, Text, TextInput } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { notifications } from "@mantine/notifications"
import { IconArrowsExchange, IconArrowBackUp } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { RequestHttp } from "src/shared/http/RequestHttp"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

type Props = {
    opened: boolean
    onClose: () => void
    initialFrom?: string | null
}

type TransferResponse = { moved: number }

export const ApplicationTransferModal: React.FC<Props> = ({ opened, onClose, initialFrom = null }) => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [from, setFrom] = useState<string | null>(initialFrom)
    const [to, setTo] = useState<string | null>(null)
    const [transferDate, setTransferDate] = useState<Date | null>(new Date())

    const { data: employees = [] } = useQuery({
        queryKey: ["applicationAssignees"],
        queryFn: () => PrivateApplicationApiService.getApplicationAssignees().then((r) => r.data),
        enabled: opened,
    })

    const options = useMemo(
        () => employees.map((employee) => ({ value: employee.username, label: employee.fullName })),
        [employees]
    )

    const nameOf = (login: string | null) =>
        options.find((option) => option.value === login)?.label || login || "—"

    useEffect(() => {
        if (opened) {
            setFrom(initialFrom)
            setTo(null)
            setTransferDate(new Date())
        }
    }, [opened, initialFrom])

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["getApplications"] })
        queryClient.invalidateQueries({ queryKey: ["applications-open-count"] })
        queryClient.invalidateQueries({ queryKey: ["applications-dashboard"] })
    }

    const { mutate: transfer, isPending: transferring } = useMutation({
        mutationFn: async () => {
            if (!from || !to || from === to) throw new Error("invalid")
            const { data } = await RequestHttp.post<TransferResponse>("/application/transfer", {
                from,
                to,
                date: dayjs(transferDate || new Date()).format("YYYY-MM-DD"),
            })
            return data.moved
        },
        onSuccess: (moved) => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage
                            id="pages.applications.transfer.done"
                            defaultMessage="Передано заявок: {count}"
                            values={{ count: moved }}
                        />
                    </Text>,
                    null
                )
            )
            invalidate()
            onClose()
        },
        onError: () => {
            notifications.show(
                ErrorNotification(
                    <FormattedMessage
                        id="pages.applications.transfer.error"
                        defaultMessage="Не удалось передать заявки"
                    />
                )
            )
        },
    })

    const { mutate: revert, isPending: reverting } = useMutation({
        mutationFn: async () => {
            if (!from || !to || from === to) throw new Error("invalid")
            // from = original owner (Sobolevskaya), to = current holder (Fomenko)
            const { data } = await RequestHttp.post<TransferResponse>("/application/transfer/revert", {
                from,
                to,
            })
            return data.moved
        },
        onSuccess: (moved) => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage
                            id="pages.applications.transfer.revertDone"
                            defaultMessage="Возвращено заявок: {count}"
                            values={{ count: moved }}
                        />
                    </Text>,
                    null
                )
            )
            invalidate()
            onClose()
        },
        onError: () => {
            notifications.show(
                ErrorNotification(
                    <FormattedMessage
                        id="pages.applications.transfer.revertError"
                        defaultMessage="Не удалось откатить передачу"
                    />
                )
            )
        },
    })

    const busy = transferring || reverting

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<FormattedMessage id="pages.applications.transfer.title" defaultMessage="Передача полномочий" />}
            centered
        >
            <Flex direction="column" gap="sm">
                <Text size="sm" c="dimmed">
                    <FormattedMessage
                        id="pages.applications.transfer.hint"
                        defaultMessage="Все открытые заявки выбранного ответственного перейдут другому. В каждую заявку добавится комментарий с датой передачи."
                    />
                </Text>
                <Text size="sm" c="dimmed">
                    <FormattedMessage
                        id="pages.applications.transfer.revertHint"
                        defaultMessage="Откат вернёт только заявки, у которых есть комментарий о передаче «От кого → Кому». Остальные заявки «Кому» не трогаются."
                    />
                </Text>
                <Select
                    label={<FormattedMessage id="pages.applications.transfer.from" defaultMessage="От кого" />}
                    data={options}
                    value={from}
                    onChange={setFrom}
                    searchable
                    nothingFoundMessage={intl.formatMessage({ id: "pages.applications.noEmployees" })}
                />
                <Select
                    label={<FormattedMessage id="pages.applications.transfer.to" defaultMessage="Кому" />}
                    data={options.filter((option) => option.value !== from)}
                    value={to}
                    onChange={setTo}
                    searchable
                    nothingFoundMessage={intl.formatMessage({ id: "pages.applications.noEmployees" })}
                />
                <DateInput
                    label={<FormattedMessage id="pages.applications.transfer.date" defaultMessage="Дата передачи" />}
                    valueFormat="DD.MM.YYYY"
                    value={transferDate}
                    onChange={setTransferDate}
                />
                <TextInput
                    label={<FormattedMessage id="pages.applications.transfer.preview" defaultMessage="Комментарий" />}
                    value={intl.formatMessage(
                        {
                            id: "pages.applications.transfer.note",
                            defaultMessage: "Передача полномочий {date}: {from} → {to}",
                        },
                        {
                            date: dayjs(transferDate || new Date()).format("DD.MM.YYYY"),
                            from: nameOf(from),
                            to: nameOf(to),
                        }
                    )}
                    readOnly
                />
                <Flex gap="sm" wrap="wrap">
                    <Button
                        leftSection={<IconArrowsExchange size={16} />}
                        disabled={!from || !to || from === to}
                        loading={transferring}
                        onClick={() => transfer()}
                    >
                        <FormattedMessage id="pages.applications.transfer.submit" defaultMessage="Передать заявки" />
                    </Button>
                    <Button
                        variant="light"
                        color="gray"
                        leftSection={<IconArrowBackUp size={16} />}
                        disabled={!from || !to || from === to || busy}
                        loading={reverting}
                        onClick={() => revert()}
                    >
                        <FormattedMessage
                            id="pages.applications.transfer.revert"
                            defaultMessage="Откатить передачу"
                        />
                    </Button>
                </Flex>
            </Flex>
        </Modal>
    )
}
