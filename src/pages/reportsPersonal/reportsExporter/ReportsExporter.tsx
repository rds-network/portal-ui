import { Alert, Button, Flex, Modal } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { PageRequest, ReportFilter } from "@rds-network/portal-api-axios"
import { IconCalendar, IconFileTypePdf, IconInfoCircle } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { generateReportsPdf } from "src/shared/docs/generateReportsPrintPdf"
import { ReportStatus } from "src/shared/report/status"

import { locales } from "../lib/constants"

const PAGE_SIZE = 200

export const ReportsExporter: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const [opened, { open, close }] = useDisclosure(false)

    const [fromDate, setFromDate] = useState<Date | null>(null)
    const [toDate, setToDate] = useState<Date | null>(null)

    const isRangeInvalid = useMemo(() => {
        if (!fromDate || !toDate) return false
        return dayjs(fromDate).isAfter(toDate, "day")
    }, [fromDate, toDate])

    const generateReportsMutation = useMutation({
        mutationFn: async () => {
            if (!user?.username) {
                throw new Error("User is not available")
            }
            if (!fromDate || !toDate) {
                throw new Error("Dates are required")
            }
            if (dayjs(fromDate).isAfter(toDate, "day")) {
                throw new Error("Invalid date range")
            }

            const filter: ReportFilter = {
                login: user.username,
                status: ReportStatus.ACCEPTED,
                dateFrom: dayjs(fromDate).format(DEFAULT_DATE_FORMAT),
                dateTo: dayjs(toDate).format(DEFAULT_DATE_FORMAT),
            }

            const pageRequest: PageRequest = {
                pageNumber: 0,
                pageSize: PAGE_SIZE,
            }

            const response = await ReportApiService.getReports(pageRequest, filter)
            return response.data.content ?? []
        },
        onSuccess: (reports) => {
            if (!user || !fromDate || !toDate) return

            if (reports.length === 0) {
                notifications.show({ message: intl.formatMessage({ id: locales.noReportsFound }) })
                return
            }

            generateReportsPdf(reports, user, fromDate, toDate)
            close()
        },
        onError: (err) => {
            notifications.show({
                message: err instanceof Error ? err.message : intl.formatMessage({ id: locales.somethingWentWrong }),
            })
            console.error(err)
        },
    })

    return (
        <Flex align="flex-end">
            <Modal opened={opened} onClose={close} title={<FormattedMessage id={locales.printPDF} />}>
                <Flex direction="column" gap={12}>
                    <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light">
                        <FormattedMessage
                            id={locales.pdfTestNotice}
                            defaultMessage="This is a test function. Automatic translation into Serbian is not provided."
                        />
                    </Alert>

                    <DateInput
                        value={fromDate}
                        onChange={setFromDate}
                        label={<FormattedMessage id={locales.pdfPeriodStart} />}
                        valueFormat="DD MMM YYYY"
                        leftSection={<IconCalendar size={18} />}
                        maxDate={new Date()}
                    />

                    <DateInput
                        value={toDate}
                        onChange={setToDate}
                        label={<FormattedMessage id={locales.pdfPeriodEnd} />}
                        valueFormat="DD MMM YYYY"
                        leftSection={<IconCalendar size={18} />}
                        maxDate={new Date()}
                        error={isRangeInvalid ? <FormattedMessage id={locales.invalidDateRange} /> : null}
                    />

                    <Button
                        onClick={() => generateReportsMutation.mutate()}
                        loading={generateReportsMutation.isPending}
                        disabled={!fromDate || !toDate || isRangeInvalid || generateReportsMutation.isPending}
                    >
                        <FormattedMessage id={locales.generatePDF} />
                    </Button>
                </Flex>
            </Modal>
            <Button
                variant="light"
                color="ocean"
                size="md"
                fw="normal"
                onClick={open}
                leftSection={<IconFileTypePdf size={16} />}
            >
                <FormattedMessage id={locales.generatePDF} />
            </Button>
        </Flex>
    )
}
