import { Anchor, Avatar, Badge, Button, Collapse, Flex, Pagination, Text } from "@mantine/core"
import { PageRequest, ReportDto, ReportFilter, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconArrowLeft, IconCalendar, IconClock, IconFilterEdit, IconFilterOff, IconUfo, IconUserStar } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import type { IntlShape } from "react-intl"
import { useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { getSpentTime, getSpentTimeFromReport } from "src/shared/report/timeSpent"
import { ReportStatusSelect } from "src/shared/ui/select/ReportStatusSelect"
import { NO_PROGRAM_CODE, NO_PROJECT_CODE } from "src/shared/constants/Shared"
import { useMediaQuery } from "@mantine/hooks"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { ProgramFilter, ProjectFilter } from "src/shared/ui/filter"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { WeekPicker } from "src/shared/ui/weekPicker/WeekPicker"
import { getReportStatusColor } from "src/shared/report/status"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { defaultFilter, defaultPage, defaultPageResponse, defaultUser } from "./lib/defaults"
import { locales } from "./lib/locales"
import { allowedRoles } from "./lib/roles"
import { heatmapReturnPath } from "src/pages/heatmap/lib/openWeekReports"
import { WeekDigest } from "./WeekDigest"
import { getTaskDisplayDescription, getTaskDisplayName } from "src/shared/taskTranslation/lib/taskTranslation"
import classes from "./ReportList.module.scss"

const getReportFilesCount = (report: ReportDto): number =>
    (report.tasks || []).reduce((count, task) => count + (task.files?.length || 0), 0)

const ReportCard = ({
    report,
    creator,
    moderator,
    programName,
    projectName,
    currentUser,
    intl,
    onOpen,
}: {
    report: ReportDto
    creator: UserInfoDto
    moderator?: UserInfoDto | null
    programName: string
    projectName: string
    currentUser: UserInfoDto | null
    intl: IntlShape
    onOpen: () => void
}) => {
    const createTime = dayjs(report.createTime).format("DD MMM YYYY - HH:mm")
    const timeSpent = getSpentTimeFromReport(report, intl)
    const filesCount = getReportFilesCount(report)
    const weekLabel = intl.formatMessage({ id: locales.weekShort }, { week: report.week })
    const tasksLabel = intl.formatMessage({ id: locales.taskCount }, { count: report.tasks?.length || 0 })
    const filesLabel =
        filesCount > 0 ? intl.formatMessage({ id: locales.filesCount }, { count: filesCount }) : null
    const showModerator = hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && !!report.moderator && !!moderator

    return (
        <button type="button" className={classes.reportCard} onClick={onOpen}>
            <Flex className={classes.cardTop}>
                <Badge color={getReportStatusColor(report.status)} radius="md" variant="light">
                    <FormattedMessage id={`common.report-status.${report.status}`} />
                </Badge>
                <Text size="sm" c="dimmed">
                    {weekLabel}
                </Text>
                <Text size="sm" c="dimmed">
                    {tasksLabel}
                    {filesLabel ? ` · ${filesLabel}` : ""}
                </Text>
            </Flex>
            <Flex className={classes.cardHeader}>
                <TextPropertyBox
                    name={locales.volunteer}
                    value={creator.fullName}
                    icon={
                        <Avatar
                            src={creator.avatar?.link}
                            name={creator.fullName}
                            color="initials"
                            size={20}
                        />
                    }
                />
                <TextPropertyBox
                    name={locales.creationDate}
                    value={createTime}
                    icon={<IconCalendar size={16} />}
                />
                <TextPropertyBox
                    name={locales.timeSpent}
                    value={timeSpent}
                    icon={<IconClock size={16} />}
                />
                <TextPropertyBox name={locales.program} value={programName} />
                <TextPropertyBox name={locales.project} value={projectName} />
                {showModerator && (
                    <TextPropertyBox
                        name={locales.moderatorShort}
                        value={moderator.fullName}
                        icon={<IconUserStar size={16} />}
                    />
                )}
            </Flex>
            <div className={classes.taskPreview}>
                {(report.tasks || []).map((task, i) => {
                    const name = getTaskDisplayName(task, false) || "—"
                    const hours = getSpentTime(task.timeSpent, intl)
                    const description = getTaskDisplayDescription(task, false)
                    return (
                        <Text key={task.id || i} className={classes.taskLine}>
                            {name} — {hours}
                            {description ? ` · ${description}` : ""}
                        </Text>
                    )
                })}
            </div>
        </button>
    )
}

export const ReportList = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const fromHeatmap = searchParams.get("from") === "heatmap"
    setDocumentTitleByLocale(fromHeatmap ? locales.titleWeek : locales.title)
    const loginParam = searchParams.get("login")
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const intl = useIntl()

    const isMobile = useMediaQuery("(max-width: 1360px)")

    const [resetKey, setResetKey] = useState(0)
    const [filtersOpened, setFiltersOpened] = useState(false)
    const [pageRequest, setPageRequest] = useState<PageRequest>({
        ...defaultPage,
        pageNumber: Math.max(0, parseInt(searchParams.get("page") || "1") - 1),
        pageSize: isMobile ? 10 : 25,
    })
    const [filter, setFilter] = useState<ReportFilter>({
        ...defaultFilter(loginParam),
        status: searchParams.get("status") || null,
        dateFrom: searchParams.get("dateFrom") || null,
        dateTo: searchParams.get("dateTo") || null,
    })
    const [selectedProgram, setSelectedProgram] = useState<string | null>(searchParams.get("program") || null)
    const [selectedProject, setSelectedProject] = useState<string | null>(searchParams.get("project") || null)

    const { programs, projects, visiblePrograms, visibleProjects } = useProgramProjectFilter(
        selectedProgram,
        selectedProject
    )

    // Ref для скролла к началу списка
    const listStartRef = React.useRef<HTMLDivElement>(null)

    const syncStateFromUrl = () => {
        const urlLogin = searchParams.get("login") || null
        const urlStatus = searchParams.get("status") || null
        const urlDateFrom = searchParams.get("dateFrom") || null
        const urlDateTo = searchParams.get("dateTo") || null

        const urlProgram = searchParams.get("program") || null
        const urlProject = searchParams.get("project") || null

        const urlPageFromUser = parseInt(searchParams.get("page") || "1")
        const urlPage = urlPageFromUser > 0 ? urlPageFromUser - 1 : 0

        setFilter((prevFilter) => ({
            ...prevFilter,
            login: urlLogin,
            status: urlStatus,
            dateFrom: urlDateFrom,
            dateTo: urlDateTo,
        }))

        setSelectedProgram(urlProgram)
        setSelectedProject(urlProject)

        setPageRequest((prevPageRequest) => ({ ...prevPageRequest, pageNumber: urlPage }))
        setResetKey((prev) => prev + 1)
    }

    useEffect(() => {
        const savedState = localStorage.getItem("reportListState")
        const currentSearch = window.location.search

        const isFromReport = currentSearch === "" || currentSearch === "?"

        if (savedState && isFromReport && savedState !== currentSearch) {
            localStorage.removeItem("reportListState")
            window.history.replaceState(null, "", "/reports" + savedState)
            window.location.reload()
        } else if (!isFromReport) {
            localStorage.removeItem("reportListState")
        }
    }, [])

    const updateUrlParams = (
        newFilter: ReportFilter,
        newProgram: string | null,
        newProject: string | null,
        newPage: number = 0
    ) => {
        const params = new URLSearchParams()

        if (newFilter.login) {
            params.set("login", newFilter.login)
        }

        if (newFilter.status) {
            params.set("status", newFilter.status)
        }

        if (newFilter.dateFrom) {
            params.set("dateFrom", newFilter.dateFrom)
        }

        if (newFilter.dateTo) {
            params.set("dateTo", newFilter.dateTo)
        }

        if (newProgram !== null) {
            params.set("program", newProgram)
        }

        if (newProject) {
            params.set("project", newProject)
        }

        // Добавляем параметр page только если это не первая страница
        if (newPage > 0) {
            const userPageNumber = newPage + 1
            params.set("page", userPageNumber.toString())
        }

        if (searchParams.get("from") === "heatmap") {
            params.set("from", "heatmap")
        }

        setSearchParams(params)
    }

    const handleProjectChange = (newProject: string | null) => {
        const projectChanged = newProject !== selectedProject
        let nextProgram = selectedProgram

        if (newProject && newProject !== NO_PROJECT_CODE) {
            const project =
                visibleProjects.find((p) => p.code === newProject) ?? projects.find((p) => p.code === newProject)

            if (project) {
                const owningProgramCode =
                    project.programCode ?? programs.find((pr) => (pr.projectCodes ?? []).includes(project.code))?.code

                if (owningProgramCode) {
                    nextProgram = owningProgramCode.toUpperCase()
                }
            }
        }

        setSelectedProject(newProject)
        setSelectedProgram(nextProgram)

        if (projectChanged) {
            setPageRequest((prev) => ({ ...prev, pageNumber: 0 }))
            updateUrlParams(filter, nextProgram, newProject, 0)
        } else {
            updateUrlParams(filter, nextProgram, newProject, pageRequest.pageNumber || 0)
        }
    }

    // Эффект для обновления размера страницы при изменении типа устройства
    useEffect(() => {
        const newPageSize = isMobile ? 10 : 25
        if (pageRequest.pageSize !== newPageSize) {
            // Сохраняем текущую страницу при изменении размера
            setPageRequest((prev) => ({ ...prev, pageSize: newPageSize }))
        }
    }, [isMobile])

    // Эффект для скролла при смене страницы в мобильной версии
    useEffect(() => {
        if (isMobile && pageRequest.pageNumber !== undefined) {
            if (listStartRef.current) {
                listStartRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                })
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" })
            }
        }
    }, [pageRequest.pageNumber, isMobile])

    if (!hasPermission(user, allowedRoles)) {
        navigate("/unauthorized")
    }

    const {
        data: { content: reports, page },
        isFetching: isFetchingReports,
    } = useQuery({
        initialData: { content: [], page: defaultPageResponse },
        queryKey: ["searchReports", filter, pageRequest, selectedProgram, selectedProject],
        queryFn: () => {
            let project: string | null = null
            if (selectedProject) {
                project = selectedProject === NO_PROJECT_CODE ? "" : selectedProject
            }

            const filterWithProgram = {
                ...filter,
                program: selectedProgram === NO_PROGRAM_CODE ? "" : selectedProgram,
                project,
            }

            return ReportApiService.getReports(pageRequest, filterWithProgram).then((r) => r.data)
        },
    })

    const logins = React.useMemo(() => {
        const set = new Set<string>()
        for (const r of reports) {
            if (r.user) set.add(r.user)
            if (r.moderator) set.add(r.moderator)
        }
        return Array.from(set).sort()
    }, [reports])

    const { data: users = {} } = resolveUsers(logins)

    const weekSelected = Boolean(filter.dateFrom && filter.dateTo)
    const { data: digestReports = [] } = useQuery({
        queryKey: ["weekDigest", filter, selectedProgram, selectedProject],
        enabled: weekSelected,
        queryFn: () => {
            let project: string | null = null
            if (selectedProject) {
                project = selectedProject === NO_PROJECT_CODE ? "" : selectedProject
            }
            return ReportApiService.getReports(
                { pageNumber: 0, pageSize: 300, sort: ["createTime;desc"] },
                {
                    ...filter,
                    program: selectedProgram === NO_PROGRAM_CODE ? "" : selectedProgram,
                    project,
                }
            ).then((r) => r.data.content || [])
        },
    })

    const onUserSelected = (selectedUser: UserInfoDto | null) => {
        const newFilter = { ...filter, login: selectedUser?.username || null }
        const filterChanged = newFilter.login !== filter.login

        setFilter(newFilter)
        if (filterChanged) {
            setPageRequest({ ...pageRequest, pageNumber: 0 })

            updateUrlParams(newFilter, selectedProgram, selectedProject, 0)
        } else {
            updateUrlParams(newFilter, selectedProgram, selectedProject, pageRequest.pageNumber || 0)
        }
    }

    const onStatusChange = (status: string | null) => {
        const newFilter = { ...filter, status: status }
        const filterChanged = newFilter.status !== filter.status

        setFilter(newFilter)
        if (filterChanged) {
            setPageRequest({ ...pageRequest, pageNumber: 0 })

            updateUrlParams(newFilter, selectedProgram, selectedProject, 0)
        } else {
            updateUrlParams(newFilter, selectedProgram, selectedProject, pageRequest.pageNumber || 0)
        }
    }

    const onWeekChange = (_: any, start: Date | null, end: Date | null) => {
        const startDate = start ? dayjs(start).format(DEFAULT_DATE_FORMAT) : null
        const endDate = end ? dayjs(end).format(DEFAULT_DATE_FORMAT) : null
        const newFilter = { ...filter, dateFrom: startDate, dateTo: endDate }
        const filterChanged = newFilter.dateFrom !== filter.dateFrom || newFilter.dateTo !== filter.dateTo

        setFilter(newFilter)
        if (filterChanged) {
            setPageRequest({ ...pageRequest, pageNumber: 0 })

            updateUrlParams(newFilter, selectedProgram, selectedProject, 0)
        } else {
            updateUrlParams(newFilter, selectedProgram, selectedProject, pageRequest.pageNumber || 0)
        }
    }

    const activeFiltersCount = React.useMemo(() => {
        let count = 0
        if (filter.login) count += 1
        if (filter.status) count += 1
        if (filter.dateFrom || filter.dateTo) count += 1
        if (selectedProgram !== null) count += 1
        if (selectedProject !== null) count += 1
        return count
    }, [filter.login, filter.status, filter.dateFrom, filter.dateTo, selectedProgram, selectedProject])

    const resetFilters = () => {
        const resetFilter = defaultFilter(null)
        setFilter(resetFilter)
        setSelectedProgram(null)
        setSelectedProject(null)
        setPageRequest({ ...pageRequest, pageNumber: 0 })
        setResetKey((prev) => prev + 1)
        updateUrlParams(resetFilter, null, null, 0)
    }

    const cards = reports.map((report) => {
        const creator = users[report.user!!] || defaultUser(report.user!!)
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
                        : intl.formatMessage({ id: locales.noProgram })
                }
                projectName={
                    project
                        ? getLocalizedName(project, intl.locale)
                        : intl.formatMessage({ id: locales.noProject })
                }
                currentUser={user}
                intl={intl}
                onOpen={() => {
                    localStorage.setItem("reportListState", window.location.search)
                    navigate(`/report/${report.id}`)
                }}
            />
        )
    })

    return (
        <Flex className={classes.root}>
            <Flex direction="column" gap={24} miw={0}>
                {fromHeatmap && (
                    <Anchor
                        component="button"
                        type="button"
                        className={classes.backLink}
                        onClick={() => navigate(heatmapReturnPath())}
                    >
                        <IconArrowLeft size={16} />
                        <FormattedMessage id={locales.backHeatmap} />
                    </Anchor>
                )}
                <Text className={classes.title}>
                    <FormattedMessage id={fromHeatmap ? locales.titleWeek : locales.title} />
                </Text>
                <div ref={listStartRef} />
                {isMobile ? (
                    <Flex direction="column">
                        <Button
                            variant="light"
                            size="sm"
                            color="green"
                            onClick={() => setFiltersOpened((v) => !v)}
                            leftSection={<IconFilterEdit size={16} />}
                        >
                            <FormattedMessage id="common.filters" defaultMessage="Фильтры" />
                            {activeFiltersCount > 0 && (
                                <Badge ml={8} size="sm" variant="light" color="blue">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                        <Collapse in={filtersOpened} style={{ marginTop: 8 }}>
                            <Flex direction="column" gap={8}>
                                <Flex className={classes.filters}>
                                    <UserSearch
                                        key={`user-search-${resetKey}`}
                                        className={classes.userSearch}
                                        description={<FormattedMessage id={locales.volunteer} />}
                                        onUserChange={onUserSelected}
                                        initialSearch={filter.login || ""}
                                    />
                                    <WeekPicker
                                        key={`week-picker-${resetKey}`}
                                        onChange={onWeekChange}
                                        initialStartDate={filter.dateFrom}
                                        initialEndDate={filter.dateTo}
                                    />
                                    <ReportStatusSelect
                                        key={`status-select-${resetKey}`}
                                        onChange={onStatusChange}
                                        value={filter.status}
                                    />
                                    <Flex direction="column">
                                        <Text size="xs" c="dimmed" mb={4}>
                                            <FormattedMessage id={locales.programFilter} />
                                        </Text>
                                        <ProgramFilter
                                            className={classes.programFilter}
                                            value={selectedProgram}
                                            onChange={(newProgram) => {
                                                const programChanged = newProgram !== selectedProgram

                                                setSelectedProgram(newProgram)

                                                if (programChanged) {
                                                    setSelectedProject(null)
                                                    setPageRequest({ ...pageRequest, pageNumber: 0 })

                                                    updateUrlParams(filter, newProgram, null, 0)
                                                } else {
                                                    updateUrlParams(
                                                        filter,
                                                        newProgram,
                                                        selectedProject,
                                                        pageRequest.pageNumber || 0
                                                    )
                                                }
                                            }}
                                            placeholder={intl.formatMessage({ id: locales.programFilterNotSelected })}
                                            programsOverride={visiblePrograms}
                                        />
                                    </Flex>
                                    <Flex direction="column">
                                        <Text size="xs" c="dimmed" mb={4}>
                                            <FormattedMessage id={locales.projectFilter} />
                                        </Text>
                                        <ProjectFilter
                                            className={classes.programFilter}
                                            value={selectedProject}
                                            onChange={handleProjectChange}
                                            placeholder={intl.formatMessage({ id: locales.projectFilterNotSelected })}
                                            projectsOverride={visibleProjects}
                                        />
                                    </Flex>
                                    {activeFiltersCount > 0 && (
                                        <Button
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
                        </Collapse>
                    </Flex>
                ) : (
                    <Flex direction="column" gap={8}>
                        <Flex className={classes.filters} wrap="wrap">
                            <UserSearch
                                key={`user-search-${resetKey}`}
                                className={classes.userSearch}
                                description={<FormattedMessage id={locales.volunteer} />}
                                onUserChange={onUserSelected}
                                initialSearch={filter.login || ""}
                            />
                            <WeekPicker
                                key={`week-picker-${resetKey}`}
                                onChange={onWeekChange}
                                initialStartDate={filter.dateFrom}
                                initialEndDate={filter.dateTo}
                            />
                            <ReportStatusSelect
                                key={`status-select-${resetKey}`}
                                onChange={onStatusChange}
                                value={filter.status}
                            />
                            <Flex direction="column">
                                <Text size="xs" c="dimmed" mb={4}>
                                    <FormattedMessage id={locales.programFilter} />
                                </Text>
                                <ProgramFilter
                                    className={classes.programFilter}
                                    value={selectedProgram}
                                    onChange={(newProgram) => {
                                        const programChanged = newProgram !== selectedProgram

                                        setSelectedProgram(newProgram)

                                        if (programChanged) {
                                            setSelectedProject(null)
                                            setPageRequest({ ...pageRequest, pageNumber: 0 })

                                            updateUrlParams(filter, newProgram, null, 0)
                                        } else {
                                            updateUrlParams(
                                                filter,
                                                newProgram,
                                                selectedProject,
                                                pageRequest.pageNumber || 0
                                            )
                                        }
                                    }}
                                    placeholder={intl.formatMessage({ id: locales.programFilterNotSelected })}
                                    programsOverride={visiblePrograms}
                                />
                            </Flex>
                            <Flex direction="column">
                                <Text size="xs" c="dimmed" mb={4}>
                                    <FormattedMessage id={locales.projectFilter} />
                                </Text>
                                <ProjectFilter
                                    className={classes.programFilter}
                                    value={selectedProject}
                                    onChange={handleProjectChange}
                                    placeholder={intl.formatMessage({ id: locales.projectFilterNotSelected })}
                                    projectsOverride={visibleProjects}
                                />
                            </Flex>
                            {activeFiltersCount > 0 && (
                                <Button
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
                )}
                {weekSelected && digestReports.length > 0 && (
                    <WeekDigest
                        reports={digestReports}
                        programs={programs}
                        users={users}
                        dateFrom={filter.dateFrom || ""}
                        dateTo={filter.dateTo || ""}
                    />
                )}
                <Flex direction="column" className={classes.cardList}>
                    {cards}
                </Flex>
                {page.totalElements == 0 && (
                    <Flex className={classes.emptyState}>
                        <IconUfo size={48} />
                        <Text>
                            <FormattedMessage id={locales.empty} />
                        </Text>
                    </Flex>
                )}
            </Flex>
            {page.totalPages > 1 && (
                <Flex className={classes.pagination}>
                    <Pagination
                        total={page.totalPages}
                        value={pageRequest.pageNumber ? pageRequest.pageNumber + 1 : 1}
                        disabled={isFetchingReports}
                        onChange={(newPage) => {
                            const pageNumber = newPage - 1
                            setPageRequest({ ...pageRequest, pageNumber })

                            updateUrlParams(filter, selectedProgram, selectedProject, pageNumber)
                        }}
                        siblings={isMobile ? 0 : 1}
                    />
                    <Text c="dimmed">
                        <FormattedMessage id={locales.total} values={{ count: page.totalElements }} />
                    </Text>
                </Flex>
            )}
        </Flex>
    )
}

export default ReportList
