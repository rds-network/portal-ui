import { Badge, Flex, Pagination, Text, Title } from "@mantine/core"
import { IconCalendarWeek, IconChevronRight, IconClockCheck, IconListCheck } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import { CustomerReportApiService } from "src/shared/api/CustomerReportApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { getReportStatusColor } from "src/shared/report/status"
import { getSpentTimeFromReport } from "src/shared/report/timeSpent"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { ReportStatusSelect } from "src/shared/ui/select/ReportStatusSelect"
import classes from "../reportsPersonal/MyReports.module.scss"

export const CuratorReportsPage: React.FC = () => {
    const intl = useIntl()
    const [status, setStatus] = useState<string | null>("CREATED")
    const [page, setPage] = useState(0)

    setDocumentTitleByLocale("pages.review-reports.title")

    const { data } = useQuery({
        queryKey: ["customer-reports", status, page],
        queryFn: () => CustomerReportApiService.list(status, page, 20),
    })
    const reports = data?.content ?? []
    const total = data?.total ?? 0
    const users = resolveUsers(reports.map((report) => report.user))

    return (
        <Flex direction="column" style={{ height: "100%" }}>
            <Flex className={classes.root}>
                <Flex className={classes.header} align="center">
                    <div>
                        <Text className={classes.eyebrow}>
                            <FormattedMessage id="design.workspace" />
                        </Text>
                        <Title order={1} className={classes.title}>
                            <FormattedMessage id="pages.review-reports.title" />
                        </Title>
                        <Text className={classes.subtitle}>
                            <FormattedMessage id="pages.review-reports.description" />
                        </Text>
                    </div>
                </Flex>
                <Flex className={classes.reports} direction="column">
                    <Flex justify="space-between" align="center" className={classes.sectionHeader} wrap="wrap" gap="sm">
                        <Title order={2} size="h4">
                            <FormattedMessage id="pages.review-reports.list" />
                        </Title>
                        <Badge variant="light" color="ocean">
                            {total}
                        </Badge>
                    </Flex>
                    <Flex className={classes.filterArea}>
                        <ReportStatusSelect
                            onChange={(value) => {
                                setStatus(value)
                                setPage(0)
                            }}
                            className={classes.filterStatus}
                            value={status}
                        />
                    </Flex>
                    {reports.length === 0 ? (
                        <Text c="dimmed">
                            <FormattedMessage id="pages.review-reports.empty" />
                        </Text>
                    ) : (
                        <Flex className={classes.reportsList} direction="column">
                            {reports.map((report, index) => (
                                <Link
                                    key={report.id}
                                    className={classes.report}
                                    style={{ animationDelay: `${index * 45}ms` }}
                                    to={`/report/${report.id}`}
                                >
                                    <div className={classes.weekIcon}>
                                        <IconCalendarWeek size={23} stroke={1.5} />
                                    </div>
                                    <div className={classes.reportHeading}>
                                        <Text fw={550}>
                                            {users.data?.[report.user || ""]?.fullName || report.user}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {dayjs(report.createTime).format("DD MMM YYYY")}
                                            {report.week != null && (
                                                <>
                                                    {" · "}
                                                    <FormattedMessage
                                                        id="design.reportWeek"
                                                        values={{ week: report.week }}
                                                    />
                                                </>
                                            )}
                                        </Text>
                                    </div>
                                    <Badge
                                        color={getReportStatusColor(report.status)}
                                        radius="md"
                                        variant="light"
                                        className={classes.status}
                                    >
                                        <FormattedMessage id={`common.report-status.${report.status}`} />
                                    </Badge>
                                    <div className={classes.reportDetails}>
                                        <TextPropertyBox
                                            name="pages.my-reports.report.task-count"
                                            value={String(report.tasks?.length ?? 0)}
                                            icon={<IconListCheck size={16} />}
                                        />
                                        <TextPropertyBox
                                            name="pages.my-reports.report.time-spent"
                                            value={getSpentTimeFromReport(report, intl)}
                                            icon={<IconClockCheck size={16} />}
                                        />
                                    </div>
                                    <IconChevronRight className={classes.arrow} size={18} />
                                </Link>
                            ))}
                        </Flex>
                    )}
                    {total > 20 && (
                        <Pagination
                            mt="md"
                            value={page + 1}
                            onChange={(value) => setPage(value - 1)}
                            total={Math.ceil(total / 20)}
                        />
                    )}
                </Flex>
            </Flex>
        </Flex>
    )
}

export default CuratorReportsPage
