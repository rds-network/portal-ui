import { Badge, Button, Flex, Pagination, Text, Title } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { PageRequest, ReportFilter } from "@rds-network/portal-api-axios"
import {
    IconCalendarWeek,
    IconChevronRight,
    IconClockCheck,
    IconFilterOff,
    IconListCheck,
    IconPlus,
    IconUfo,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { CurrentUserHeatmap } from "src/pages/reportsPersonal/heatmap/CurrentUserHeatmap"
import { defaultFilter, defaultPage, defaultPageResponse, locales } from "src/pages/reportsPersonal/lib/constants"
import { ReportsExporter } from "src/pages/reportsPersonal/reportsExporter/ReportsExporter"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { getReportStatusColor } from "src/shared/report/status"
import { getSpentTimeFromReport } from "src/shared/report/timeSpent"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { ReportStatusSelect } from "src/shared/ui/select/ReportStatusSelect"
import { WeekPicker } from "src/shared/ui/weekPicker/WeekPicker"
import classes from "./MyReports.module.scss"

export const MyReports = () => {
    setDocumentTitleByLocale(locales.documentTitle)
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const isMobile = useMediaQuery("(max-width: 1360px)")

    // Инициализация состояния из URL параметров
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

    // Ref для скролла к началу списка
    const listStartRef = React.useRef<HTMLDivElement>(null)

    // Функция для синхронизации состояния с URL параметрами
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

    // Эффект для обработки навигации назад/вперед браузера
    useEffect(() => {
        const handlePopState = () => {
            syncStateFromUrl()
        }

        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [searchParams])

    // Функция для обновления URL параметров
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

    // Эффект для обновления URL при изменении фильтра
    useEffect(() => {
        updateUrlParams(filter, pageRequest.pageNumber || 0)
    }, [filter.status, filter.dateFrom, filter.dateTo])

    // Эффект для обновления URL при изменении страницы
    useEffect(() => {
        const pageNumber = pageRequest.pageNumber || 0
        updateUrlParams(filter, pageNumber)
    }, [pageRequest.pageNumber])

    // Эффект для скролла при смене страницы в мобильной версии
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

    const rows = response.content.map((report, index) => (
        <Link
            key={report.id}
            className={classes.report}
            style={{ animationDelay: `${index * 45}ms` }}
            to={`/report/${report.id}`}
            onClick={() => localStorage.setItem("myReportsListState", window.location.search)}
        >
            <div className={classes.weekIcon}>
                <IconCalendarWeek size={23} stroke={1.5} />
            </div>
            <div className={classes.reportHeading}>
                <Text fw={550}>
                    <FormattedMessage id="design.reportWeek" values={{ week: report.week }} />
                </Text>
                <Text size="xs" c="dimmed">
                    {dayjs(report.createTime).format("DD MMM YYYY")}
                </Text>
            </div>
            <Badge color={getReportStatusColor(report.status)} radius="md" variant="light" className={classes.status}>
                <FormattedMessage id={`common.report-status.${report.status}`} />
            </Badge>
            <div className={classes.reportDetails}>
                <TextPropertyBox
                    name={locales.reportTaskCount}
                    value={String(report.tasks.length)}
                    icon={<IconListCheck size={16} />}
                />
                <TextPropertyBox
                    name={locales.reportTimeSpent}
                    value={getSpentTimeFromReport(report, intl)}
                    icon={<IconClockCheck size={16} />}
                />
            </div>
            <IconChevronRight className={classes.arrow} size={18} />
        </Link>
    ))

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
                            {rows.length == 0 && (
                                <Flex className={classes.emptyState}>
                                    <IconUfo size={48} />
                                    <Text>
                                        <FormattedMessage id={locales.emptyReports} />
                                    </Text>
                                </Flex>
                            )}
                            {rows}
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
