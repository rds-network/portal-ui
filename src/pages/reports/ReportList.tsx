import { Avatar, Button, Collapse, Flex, Pagination, Table, Text } from "@mantine/core"
import { PageRequest, ReportDto, ReportFilter, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconClock, IconFile, IconFilterEdit, IconFilterOff, IconListCheck, IconUfo } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ReportApiService } from "src/shared/api/ReportApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { getSpentTimeFromReport } from "src/shared/report/timeSpent"
import { ReportStatusSelect } from "src/shared/ui/select/ReportStatusSelect"
import { NO_PROGRAM_CODE, NO_PROJECT_CODE } from "src/shared/constants/Shared"
import { Badge, useComputedColorScheme } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { getReportStatusColor } from "src/shared/report/status"
import { ProgramFilter, ProjectFilter } from "src/shared/ui/filter"
import { PropertyBox } from "src/shared/ui/propertyBox/PropertyBox"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { WeekPicker } from "src/shared/ui/weekPicker/WeekPicker"
import { hasPermission } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { defaultFilter, defaultPage, defaultPageResponse, defaultUser } from "./lib/defaults"
import { locales } from "./lib/locales"
import { allowedRoles } from "./lib/roles"
import classes from "./ReportList.module.scss"

export const ReportList = () => {
    setDocumentTitleByLocale(locales.title)

    const [searchParams, setSearchParams] = useSearchParams()
    const loginParam = searchParams.get("login")
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const intl = useIntl()

    const isMobile = useMediaQuery("(max-width: 1360px)")
    const isTablet = useMediaQuery("(min-width: 1024px) and (max-width: 1439px)")
    const colorScheme = useComputedColorScheme("light")

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
        }
        return Array.from(set).sort()
    }, [reports])

    const { data: users = {} } = resolveUsers(logins)

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

    const rows = reports.map((report) => {
        const creator = users[report.user!!] || defaultUser(report.user!!)
        const program = programs.find((p) => p.code === report.program)
        const project = projects.find((p) => p.code === report.project)
        const createTime = dayjs(report.createTime).format("DD MMM YYYY HH:mm")
        const timeSpent = getSpentTimeFromReport(report, intl)
        const filesCount = getReportFilesCount(report)
        return (
            <Table.Tr
                key={report.id}
                className={classes.row}
                onClick={() => {
                    localStorage.setItem("reportListState", window.location.search)
                    navigate(`/report/${report.id}`)
                }}
            >
                <Table.Td>
                    <Text>{createTime}</Text>
                </Table.Td>
                <Table.Td>
                    <Flex columnGap={8} align="center" className={classes.columnVolunteer}>
                        <Avatar size={24} src={creator.avatar?.link} name={creator.fullName} />
                        <Text truncate="end">{creator.fullName}</Text>
                    </Flex>
                </Table.Td>
                <Table.Td>
                    <Text>{report.week}</Text>
                </Table.Td>
                <Table.Td>
                    <Text>{timeSpent}</Text>
                </Table.Td>
                <Table.Td>
                    <Text>
                        <FormattedMessage id={`common.report-status.${report.status}`} />
                    </Text>
                </Table.Td>
                <Table.Td>
                    <Text
                        c={
                            program
                                ? undefined
                                : colorScheme === "dark"
                                  ? "var(--mantine-color-gray-light-color)"
                                  : "dimmed"
                        }
                    >
                        {program ? getLocalizedName(program, intl.locale) : <FormattedMessage id={locales.noProgram} />}
                    </Text>
                </Table.Td>
                <Table.Td>
                    <Text
                        c={
                            project
                                ? undefined
                                : colorScheme === "dark"
                                  ? "var(--mantine-color-gray-light-color)"
                                  : "dimmed"
                        }
                    >
                        {project ? getLocalizedName(project, intl.locale) : <FormattedMessage id={locales.noProject} />}
                    </Text>
                </Table.Td>
                <Table.Td>
                    <Flex direction="column" justify="center">
                        <Flex columnGap={8} align="center">
                            <IconListCheck size={14} />
                            <Text className={classes.stats}>
                                <FormattedMessage id={locales.taskCount} values={{ count: report.tasks.length }} />
                            </Text>
                        </Flex>
                        {filesCount != 0 && (
                            <Flex columnGap={8} align="center">
                                <IconFile size={14} />
                                <Text className={classes.stats}>
                                    <FormattedMessage id={locales.filesCount} values={{ count: filesCount }} />
                                </Text>
                            </Flex>
                        )}
                    </Flex>
                </Table.Td>
            </Table.Tr>
        )
    })

    const cards = reports.map((report) => {
        const creator = users[report.user!!] || defaultUser(report.user!!)
        const program = programs.find((p) => p.code === report.program)
        const project = projects.find((p) => p.code === report.project)
        const createTime = dayjs(report.createTime).format("DD MMM YYYY")
        const timeSpent = getSpentTimeFromReport(report, intl)
        const filesCount = getReportFilesCount(report)
        return (
            <Flex
                key={report.id}
                className={classes.mobileCard}
                onClick={() => {
                    localStorage.setItem("reportListState", window.location.search)
                    navigate(`/report/${report.id}`)
                }}
            >
                {isTablet ? (
                    // Планшетная версия с подписями
                    <>
                        <Flex className={classes.reportBody}>
                            <Flex className={classes.reportLeft}>
                                <TextPropertyBox
                                    name={locales.volunteer}
                                    value={creator.fullName}
                                    icon={<Avatar size={20} src={creator.avatar?.link} name={creator.fullName} />}
                                />
                            </Flex>
                            <Flex className={classes.reportRight}>
                                <TextPropertyBox name={locales.creationDate} value={createTime} />
                            </Flex>
                        </Flex>
                        <Flex className={classes.reportBody}>
                            <Flex className={classes.reportLeft}>
                                <PropertyBox
                                    name={locales.status}
                                    value={
                                        <Badge color={getReportStatusColor(report.status)} radius="md" variant="light">
                                            <FormattedMessage id={`common.report-status.${report.status}`} />
                                        </Badge>
                                    }
                                />
                            </Flex>
                            <Flex className={classes.reportRight}>
                                <TextPropertyBox
                                    name={locales.tasks}
                                    value={report.tasks.length}
                                    icon={<IconListCheck size={16} />}
                                />
                            </Flex>
                        </Flex>
                        <Flex className={classes.reportBody}>
                            <Flex className={classes.reportLeft}>
                                <TextPropertyBox
                                    name={locales.timeSpent}
                                    value={timeSpent}
                                    icon={<IconClock size={16} />}
                                />
                            </Flex>
                            <Flex className={classes.reportRight}>
                                <TextPropertyBox name={locales.weeks} value={report.week} />
                            </Flex>
                        </Flex>
                        <Flex className={classes.reportBody}>
                            <Flex className={classes.reportLeft}>
                                <TextPropertyBox
                                    name={locales.program}
                                    value={
                                        program ? (
                                            getLocalizedName(program, intl.locale)
                                        ) : (
                                            <FormattedMessage id={locales.noProgram} />
                                        )
                                    }
                                    valueColor={
                                        program
                                            ? undefined
                                            : colorScheme === "dark"
                                              ? "var(--mantine-color-gray-light-color)"
                                              : "dimmed"
                                    }
                                />
                            </Flex>
                            <Flex className={classes.reportRight}>
                                <TextPropertyBox
                                    name={locales.project}
                                    value={
                                        project ? (
                                            getLocalizedName(project, intl.locale)
                                        ) : (
                                            <FormattedMessage id={locales.noProject} />
                                        )
                                    }
                                    valueColor={
                                        project
                                            ? undefined
                                            : colorScheme === "dark"
                                              ? "var(--mantine-color-gray-light-color)"
                                              : "dimmed"
                                    }
                                />
                            </Flex>
                        </Flex>
                        {filesCount !== 0 && (
                            <Flex className={classes.reportBody}>
                                <Flex className={classes.reportLeft}>
                                    <TextPropertyBox
                                        name={locales.files}
                                        value={filesCount}
                                        icon={<IconFile size={16} />}
                                    />
                                </Flex>
                                <Flex className={classes.reportRight}>{/* Пустое место для симметрии */}</Flex>
                            </Flex>
                        )}
                    </>
                ) : (
                    // Мобильная версия без подписей
                    <>
                        <Flex className={classes.reportHeader}>
                            <Text size="xs" c="dimmed" className={classes.dateCorner}>
                                {createTime}
                            </Text>
                            <Flex align="center" gap={8} style={{ flex: 1 }}>
                                <Avatar size={24} src={creator.avatar?.link} name={creator.fullName} />
                                <Text fw={500} style={{ flex: 1 }}>
                                    {creator.fullName}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {report.week}
                                </Text>
                            </Flex>
                        </Flex>
                        <Flex className={classes.reportBody}>
                            <Badge color={getReportStatusColor(report.status)} radius="md" variant="light">
                                <FormattedMessage id={`common.report-status.${report.status}`} />
                            </Badge>
                            {filesCount !== 0 && (
                                <Flex align="center" gap={4}>
                                    <IconFile size={14} />
                                    <Text size="sm" c="dimmed">
                                        {filesCount}
                                    </Text>
                                </Flex>
                            )}
                        </Flex>
                        <Flex className={classes.reportBody}>
                            <Text
                                size="sm"
                                c={
                                    program
                                        ? undefined
                                        : colorScheme === "dark"
                                          ? "var(--mantine-color-gray-light-color)"
                                          : "dimmed"
                                }
                            >
                                {program ? (
                                    getLocalizedName(program, intl.locale)
                                ) : (
                                    <FormattedMessage id={locales.noProgram} />
                                )}
                            </Text>
                            <Text
                                size="sm"
                                c={
                                    project
                                        ? undefined
                                        : colorScheme === "dark"
                                          ? "var(--mantine-color-gray-light-color)"
                                          : "dimmed"
                                }
                            >
                                {project ? (
                                    getLocalizedName(project, intl.locale)
                                ) : (
                                    <FormattedMessage id={locales.noProject} />
                                )}
                            </Text>
                        </Flex>
                    </>
                )}
            </Flex>
        )
    })

    return (
        <Flex className={classes.root}>
            <Flex direction="column" gap={24} miw={0}>
                <Text className={classes.title}>
                    <FormattedMessage id={locales.title} />
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
                {isMobile ? (
                    <Flex direction="column" rowGap={8} className={classes.mobileList}>
                        {cards}
                    </Flex>
                ) : (
                    <Table stickyHeader highlightOnHover className={classes.table}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th className={classes.columnDate}>
                                    <FormattedMessage id={locales.creationDate} />
                                </Table.Th>
                                <Table.Th className={classes.columnVolunteer}>
                                    <FormattedMessage id={locales.volunteer} />
                                </Table.Th>
                                <Table.Th className={classes.columnWeeks}>
                                    <FormattedMessage id={locales.weeks} />
                                </Table.Th>
                                <Table.Th className={classes.columnTimeSpent}>
                                    <FormattedMessage id={locales.timeSpent} />
                                </Table.Th>
                                <Table.Th className={classes.columnStatus}>
                                    <FormattedMessage id={locales.status} />
                                </Table.Th>
                                <Table.Th className={classes.columnProgram}>
                                    <FormattedMessage id={locales.program} />
                                </Table.Th>
                                <Table.Th className={classes.columnProject}>
                                    <FormattedMessage id={locales.project} />
                                </Table.Th>
                                <Table.Th className={classes.columnStats}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                )}
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

const getReportFilesCount = (report: ReportDto): number => {
    let count = 0
    report.tasks.forEach((task) => {
        count += task.files?.length || 0
    })
    return count
}

export default ReportList
