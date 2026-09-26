import { Button, Flex, Modal, Select, Text, TextInput } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { notifications } from "@mantine/notifications"
import { IconArrowsExchange } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { v4 as uuid } from "uuid"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

type Props = {
    opened: boolean
    onClose: () => void
    initialFrom?: string | null
}

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

    const { mutate: transfer, isPending } = useMutation({
        mutationFn: async () => {
            if (!from || !to || from === to) {
                throw new Error("invalid")
            }
            const dateLabel = dayjs(transferDate || new Date()).format("DD.MM.YYYY")
            const noteBody = intl.formatMessage(
                {
                    id: "pages.applications.transfer.note",
                    defaultMessage: "Передача полномочий {date}: {from} → {to}",
                },
                { date: dateLabel, from: nameOf(from), to: nameOf(to) }
            )

            let moved = 0
            for (let guard = 0; guard < 40; guard += 1) {
                const response = await PrivateApplicationApiService.getApplications(
                    { pageNumber: 0, pageSize: 25, sort: ["created;desc"] },
                    "",
                    { showCompleted: false, assignee: from }
                )
                const batch = response.data.content || []
                if (batch.length === 0) break

                for (const application of batch) {
                    await PrivateApplicationApiService.assignApplication(application.id, { assignee: to })
                    await PrivateApplicationApiService.addNoteToApplication(application.id, {
                        id: uuid(),
                        text: noteBody,
                    })
                    moved += 1
                }
            }
            return moved
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
            queryClient.invalidateQueries({ queryKey: ["getApplications"] })
            queryClient.invalidateQueries({ queryKey: ["applications-open-count"] })
            queryClient.invalidateQueries({ queryKey: ["applications-dashboard"] })
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
                <Button
                    leftSection={<IconArrowsExchange size={16} />}
                    disabled={!from || !to || from === to}
                    loading={isPending}
                    onClick={() => transfer()}
                >
                    <FormattedMessage id="pages.applications.transfer.submit" defaultMessage="Передать заявки" />
                </Button>
            </Flex>
        </Modal>
    )
}
