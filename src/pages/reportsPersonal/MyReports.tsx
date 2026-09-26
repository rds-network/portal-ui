import { Badge, Button, Flex, Pagination, Text, Title } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { PageRequest, ReportFilter } from "@rds-network/portal-api-axios"
import { IconFilterOff, IconPlus, IconUfo } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { CurrentUserHeatmap } from "src/pages/reportsPersonal/heatmap/CurrentUserHeatmap"
import { defaultFilter, defaultPage, defaultPageResponse, locales } from "src/pages/reportsPersonal/lib/constants"
import { ReportsExporter } from "src/pages/reportsPersonal/reportsExporter/ReportsExporter"
import { defaultUser } from "src/pages/reports/lib/defaults"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { ReportCard } from "src/shared/ui/reportCard/ReportCard"
import { ReportStatusSelect } from "src/shared/ui/select/ReportStatusSelect"
import { WeekPicker } from "src/shared/ui/weekPicker/WeekPicker"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./MyReports.module.scss"

export const MyReports = () => {
    setDocumentTitleByLocale(locales.documentTitle)
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const isMobile = useMediaQuery("(max-width: 1360px)")

    const [pageRequest, setPageRequest] = useState<PageRequest>({
        ...defaultPage,
        pageNumber: Math.max(0, parseInt(searchParams.get("page") || "1") - 1),
        pageSize: 5,
    })
    const [filter, setFilter] = useState<ReportFilter>({
        ...defaultFilter,
        status: searchParams.get("status") || null,
        dateFrom: searchParams.get("dateFrom") || null,
        dateTo: searchParams.get("dateTo") || null,
    })

    const { programs, projects } = useProgramProjectFilter(null, null)

    useEffect(() => {
        const savedState = localStorage.getItem("myReportsListState")
        const currentSearch = window.location.search

        const isFromReport = currentSearch === "" || currentSearch === "?"

        if (savedState && isFromReport && savedState !== currentSearch) {
            localStorage.removeItem("myReportsListState")
            window.history.replaceState(null, "", "/reports/personal" + savedState)
            window.location.reload()
        } else if (!isFromReport) {
            localStorage.removeItem("myReportsListState")
        }
    }, [])

    const listStartRef = React.useRef<HTMLDivElement>(null)

    const syncStateFromUrl = () => {
        const urlStatus = searchParams.get("status") || null
        const urlDateFrom = searchParams.get("dateFrom") || null
        const urlDateTo = searchParams.get("dateTo") || null
        const urlPageFromUser = parseInt(searchParams.get("page") || "1")
        const urlPage = urlPageFromUser > 0 ? urlPageFromUser - 1 : 0

        setFilter({
            ...filter,
            status: urlStatus,
            dateFrom: urlDateFrom,
            dateTo: urlDateTo,
        })
        setPageRequest({ ...pageRequest, pageNumber: urlPage })
    }

    useEffect(() => {
        const handlePopState = () => {
            syncStateFromUrl()
        }

        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [searchParams])

    const updateUrlParams = (newFilter: ReportFilter, newPage: number = 0) => {
        const params = new URLSearchParams()

        if (newFilter.status) {
            params.set("status", newFilter.status)
        }

        if (newFilter.dateFrom) {
            params.set("dateFrom", newFilter.dateFrom)
        }

        if (newFilter.dateTo) {
            params.set("dateTo", newFilter.dateTo)
        }

        if (newPage > 0) {
            const userPageNumber = newPage + 1
            params.set("page", userPageNumber.toString())
        }

        setSearchParams(params)
    }

    useEffect(() => {
        setFilter({ ...filter, login: user?.username })
    }, [user])

    useEffect(() => {
        updateUrlParams(filter, pageRequest.pageNumber || 0)
    }, [filter.status, filter.dateFrom, filter.dateTo])

    useEffect(() => {
        const pageNumber = pageRequest.pageNumber || 0
        updateUrlParams(filter, pageNumber)
    }, [pageRequest.pageNumber])

    useEffect(() => {
        if (pageRequest.pageNumber !== undefined) {
            if (listStartRef.current) {
                listStartRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                })
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" })
            }
        }
    }, [pageRequest.pageNumber])

    const { data: response, isFetching } = useQuery({
        enabled: filter.login != null,
        queryKey: ["getReports", pageRequest, filter],
        initialData: { page: defaultPageResponse, content: [] },
        queryFn: () => ReportApiService.getReports(pageRequest, filter).then((response) => response.data),
    })

    const reports = response.content
    const { data: users = {} } = resolveUsers(
        reports.flatMap((report) => [report.user, report.moderator].filter(Boolean) as string[])
    )

    const onWeekChange = (_week: number | null, start: Date | null, end: Date | null) => {
        const startDate = start ? dayjs(start).format(DEFAULT_DATE_FORMAT) : null
        const endDate = end ? dayjs(end).format(DEFAULT_DATE_FORMAT) : null
        const newFilter = { ...filter, dateFrom: startDate, dateTo: endDate }
        const filterChanged = newFilter.dateFrom !== filter.dateFrom || newFilter.dateTo !== filter.dateTo

        setFilter(newFilter)
        if (filterChanged) {
            setPageRequest({ ...pageRequest, pageNumber: 0 })
        }
    }

    const onStatusChange = (status: string | null) => {
        const newFilter = { ...filter, status: status }
        const filterChanged = newFilter.status !== filter.status

        setFilter(newFilter)
        if (filterChanged) {
            setPageRequest({ ...pageRequest, pageNumber: 0 })
        }
    }

    const activeFiltersCount = React.useMemo(() => {
        let count = 0
        if (filter.status) count += 1
        if (filter.dateFrom || filter.dateTo) count += 1
        return count
    }, [filter.status, filter.dateFrom, filter.dateTo])

    const resetFilters = () => {
        const resetFilter = { ...defaultFilter, login: filter.login }
        setFilter(resetFilter)
        setPageRequest({ ...pageRequest, pageNumber: 0 })
        updateUrlParams(resetFilter, 0)
    }

    const cards = reports.map((report) => {
        const creator = (report.user && users[report.user]) || user || defaultUser(report.user || "")
        const program = programs.find((p) => p.code === report.program)
        const project = projects.find((p) => p.code === report.project)
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
                hideVolunteer
                onOpen={() => {
                    localStorage.setItem("myReportsListState", window.location.search)
                    navigate(`/report/${report.id}`)
                }}
            />
        )
    })

    return (
        <Flex direction="column" style={{ height: "100%" }}>
            <Flex className={classes.root} ref={listStartRef}>
                <Flex className={classes.header} align="center">
                    <div>
                        <Text className={classes.eyebrow}>
                            <FormattedMessage id="design.workspace" />
                        </Text>
                        <Title order={1} className={classes.title}>
                            <FormattedMessage id={locales.documentTitle} />
                        </Title>
                        <Text className={classes.subtitle}>
                            <FormattedMessage id="design.reportsSubtitle" />
                        </Text>
                    </div>
                    <Flex className={classes.headerActions} direction="row" gap={8} wrap="wrap" align="flex-end">
                        <Button
                            className={classes.newReportButton}
                            color="ocean.7"
                            variant="filled"
                            size="md"
                            leftSection={<IconPlus size={16} />}
                            onClick={() => navigate("/report/create")}
                        >
                            <Text size="sm">
                                <FormattedMessage id={locales.newReport} />
                            </Text>
                        </Button>
                        <ReportsExporter />
                    </Flex>
                </Flex>
                <Flex className={classes.content}>
                    <Flex className={classes.reports}>
                        <Flex justify="space-between" align="center" className={classes.sectionHeader}>
                            <Title order={2} size="h4">
                                <FormattedMessage id="design.reportHistory" />
                            </Title>
                            <Badge variant="light" color="ocean">
                                {response.page.totalElements}
                            </Badge>
                        </Flex>
                        <Flex className={classes.filterArea}>
                            <Flex direction="row" gap={8} wrap="wrap" align="flex-end">
                                <WeekPicker
                                    onChange={onWeekChange}
                                    className={classes.filterWeek}
                                    initialStartDate={filter.dateFrom}
                                    initialEndDate={filter.dateTo}
                                />
                                <ReportStatusSelect
                                    onChange={onStatusChange}
                                    className={classes.filterStatus}
                                    value={filter.status}
                                />
                                {activeFiltersCount > 0 && (
                                    <Button
                                        className={classes.resetFilters}
                                        variant="transparent"
                                        size="sm"
                                        leftSection={<IconFilterOff size={16} />}
                                        onClick={resetFilters}
                                    >
                                        <Text size="sm">
                                            <FormattedMessage id={locales.resetFilters} />
                                        </Text>
                                    </Button>
                                )}
                            </Flex>
                        </Flex>
                        <Flex className={classes.reportsList}>
                            {cards.length === 0 && (
                                <Flex className={classes.emptyState}>
                                    <IconUfo size={48} />
                                    <Text>
                                        <FormattedMessage id={locales.emptyReports} />
                                    </Text>
                                </Flex>
                            )}
                            {cards}
                        </Flex>
                        <Flex className={classes.paginationContainer}>
                            {response.page.totalElements != 0 && (
                                <Text c="dimmed">
                                    <FormattedMessage
                                        id={locales.total}
                                        values={{ total: response.page.totalElements }}
                                    />
                                </Text>
                            )}
                            <Pagination
                                total={response.page.totalPages}
                                value={pageRequest.pageNumber ? pageRequest.pageNumber + 1 : 1}
                                disabled={isFetching}
                                hideWithOnePage={true}
                                onChange={(newPage) => {
                                    const pageNumber = newPage - 1
                                    setPageRequest({ ...pageRequest, pageNumber })
                                }}
                                siblings={isMobile ? 0 : 1}
                                className={classes.paginationPages}
                            />
                        </Flex>
                    </Flex>
                    <CurrentUserHeatmap className={classes.heatmap} />
                </Flex>
            </Flex>
        </Flex>
    )
}

export default MyReports
