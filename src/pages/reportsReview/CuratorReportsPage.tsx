import { Badge, Flex, Pagination, Text, Title } from "@mantine/core"
import { useQuery } from "@tanstack/react-query"
import React, { useContext, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { defaultUser } from "src/pages/reports/lib/defaults"
import { CustomerReportApiService } from "src/shared/api/CustomerReportApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { ReportCard } from "src/shared/ui/reportCard/ReportCard"
import { ReportStatusSelect } from "src/shared/ui/select/ReportStatusSelect"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "../reportsPersonal/MyReports.module.scss"

export const CuratorReportsPage: React.FC = () => {
    const intl = useIntl()
    const navigate = useNavigate()
    const { user } = useContext(UserContext)
    const [status, setStatus] = useState<string | null>("CREATED")
    const [page, setPage] = useState(0)
    const { programs, projects } = useProgramProjectFilter(null, null)

    setDocumentTitleByLocale("pages.review-reports.title")

    const { data } = useQuery({
        queryKey: ["customer-reports", status, page],
        queryFn: () => CustomerReportApiService.list(status, page, 20),
    })
    const reports = data?.content ?? []
    const total = data?.total ?? 0
    const { data: users = {} } = resolveUsers([
        ...reports.map((report) => report.user),
        ...reports.map((report) => report.moderator),
    ])

    const cards = reports.map((report) => {
        const creator = users[report.user || ""] || defaultUser(report.user || "")
        const program = programs.find((item) => item.code === report.program)
        const project = projects.find((item) => item.code === report.project)
        return (
            <ReportCard
                key={report.id}
                report={report}
                creator={creator}
                moderator={report.moderator ? users[report.moderator] || defaultUser(report.moderator) : null}
                programName={
                    program
                        ? getLocalizedName(program, intl.locale)
                        : intl.formatMessage({ id: "pages.user-list.no-program" })
                }
                projectName={
                    project
                        ? getLocalizedName(project, intl.locale)
                        : intl.formatMessage({ id: "pages.user-list.no-project" })
                }
                currentUser={user}
                onOpen={() => navigate(`/report/${report.id}`)}
            />
        )
    })

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
                            <FormattedMessage
                                id={
                                    status
                                        ? "pages.review-reports.emptyFiltered"
                                        : "pages.review-reports.empty"
                                }
                                defaultMessage={
                                    status
                                        ? "Нет отчётов с этим статусом. Сбросьте фильтр статуса — возможно, отчёт уже принят или отклонён."
                                        : "Нет отчётов на приёмку"
                                }
                            />
                        </Text>
                    ) : (
                        <Flex className={classes.reportsList} direction="column">
                            {cards}
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
