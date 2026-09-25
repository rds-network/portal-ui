import { Button, Card, Flex, Pagination, Select, Text } from "@mantine/core"
import { IconBell, IconMail } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ReportHeatMapApiService } from "src/shared/api/ReportHeatMapApiService"
import { NO_PROGRAM_CODE, NO_PROJECT_CODE } from "src/shared/constants/Shared"
import { heatmapTemplates } from "src/shared/email/templates"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { InboxNotifyModal } from "src/shared/ui/inbox/InboxNotifyModal"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { VolunteerReportFilters } from "./components/VolunteerReportFilters"
import { VolunteerReportHeatmap } from "./components/VolunteerReportHeatmap"
import { defaultPageResponse } from "./lib/defaults"
import { locales } from "./lib/locales"
import { hasAccess } from "./lib/roles"
import classes from "./VolunteerHeatmapPage.module.scss"

const FILTER_KEY = "heatmapFilterState"

type SavedHeatmapFilter = {
    search?: string
    program?: string | null
    project?: string | null
    year?: string
    page?: string
    pageSize?: string
}

function readSavedFilters(): SavedHeatmapFilter | null {
    try {
        const raw = localStorage.getItem(FILTER_KEY)
        return raw ? (JSON.parse(raw) as SavedHeatmapFilter) : null
    } catch {
        return null
    }
}

export const VolunteerHeatmapPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const savedFilters = !searchParams.toString() ? readSavedFilters() : null

    setDocumentTitleByLocale(locales.title)

    useEffect(() => {
        if (!hasAccess(user)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    // --- фильтры / состояние ---

    const [search, setSearch] = useState(searchParams.get("search") || savedFilters?.search || "")
    const [debouncedSearch, setDebouncedSearch] = useState(search)

    const [selectedProgram, setSelectedProgram] = useState<string | null>(
        searchParams.get("program") || savedFilters?.program || null
    )
    const [selectedProject, setSelectedProject] = useState<string | null>(
        searchParams.get("project") || savedFilters?.project || null
    )
    const { programs, projects, visiblePrograms, visibleProjects } = useProgramProjectFilter(
        selectedProgram,
        selectedProject
    )
    const [filterYear, setFilterYear] = useState<string>(
        searchParams.get("year") || savedFilters?.year || dayjs().year().toString()
    )

    const [selectedVolunteers, setSelectedVolunteers] = useState<Set<number>>(() => new Set())
    const [emailDrawerOpen, setEmailDrawerOpen] = useState(false)
    const [notifyOpen, setNotifyOpen] = useState(false)
    const [notifyRecipients, setNotifyRecipients] = useState<{ username: string; name: string }[]>([])

    const [pageRequest, setPageRequest] = useState({
        pageNumber: Math.max(0, parseInt(searchParams.get("page") || savedFilters?.page || "1") - 1),
        pageSize: Number(savedFilters?.pageSize || 10),
    })

    const handleProgramChange = (newProgram: string | null) => {
        const programChanged = newProgram !== selectedProgram

        setSelectedProgram(newProgram)

        if (programChanged) {
            setSelectedProject(null)
            setPageRequest((prev) => ({ ...prev, pageNumber: 0 }))
        }
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
        }
    }

    // --- дебаунс поиска ---

    useEffect(() => {
        const trimmed = search.trim()
        const id = window.setTimeout(() => {
            setDebouncedSearch((prev) => {
                // если строка реально изменилась — сбросить страницу
                if (prev !== trimmed) {
                    setPageRequest((prevPage) => ({ ...prevPage, pageNumber: 0 }))
                }
                return trimmed
            })
        }, 400)

        return () => {
            window.clearTimeout(id)
        }
    }, [search])

    // --- синхронизация URL-параметров с состоянием ---
    useEffect(() => {
        const params = new URLSearchParams()

        if (debouncedSearch) params.set("search", debouncedSearch)
        if (selectedProgram) params.set("program", selectedProgram)
        if (selectedProject) params.set("project", selectedProject)
        if (filterYear) params.set("year", filterYear)
        if (pageRequest.pageNumber > 0) {
            params.set("page", String(pageRequest.pageNumber + 1))
        }

        setSearchParams(params, { replace: true })
        localStorage.setItem(
            FILTER_KEY,
            JSON.stringify({
                search: debouncedSearch,
                program: selectedProgram,
                project: selectedProject,
                year: filterYear,
                page: params.get("page") || "1",
                pageSize: String(pageRequest.pageSize),
            })
        )
        // при смене фильтров / страницы сбрасываем выбранных волонтёров
        setSelectedVolunteers(new Set())
    }, [debouncedSearch, selectedProgram, selectedProject, filterYear, pageRequest.pageNumber, pageRequest.pageSize, setSearchParams])

    // --- запрос данных ---

    const { data: volunteerData } = useQuery({
        queryKey: [
            "volunteerReports",
            debouncedSearch,
            pageRequest.pageNumber,
            pageRequest.pageSize,
            selectedProgram,
            selectedProject,
            filterYear,
        ],
        queryFn: () =>
            ReportHeatMapApiService.getVolunteerHeatMap(debouncedSearch, pageRequest, {
                program: selectedProgram === NO_PROGRAM_CODE ? "" : selectedProgram || undefined,
                project: selectedProject === NO_PROJECT_CODE ? "" : selectedProject || undefined,
                year: Number(filterYear),
            }).then((response) => response.data),
        placeholderData: { content: [], page: defaultPageResponse },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })

    // --- обработчики, мемоизированные чтобы не триггерить лишние рендеры ---

    const handleVolunteerSelect = useCallback((volunteerId: number) => {
        setSelectedVolunteers((prev) => {
            const next = new Set(prev)
            if (next.has(volunteerId)) {
                next.delete(volunteerId)
            } else {
                next.add(volunteerId)
            }
            return next
        })
    }, [])

    const handleResetFilters = useCallback(() => {
        localStorage.removeItem(FILTER_KEY)
        setSearch("")
        setSelectedProgram(null)
        setSelectedProject(null)
        setFilterYear(dayjs().year().toString())
        setPageRequest((prev) => ({ ...prev, pageNumber: 0 }))
    }, [])

    const handlePageSizeChange = useCallback((value: string | null) => {
        if (!value) return
        setPageRequest((pr) => ({
            ...pr,
            pageNumber: 0,
            pageSize: Number(value),
        }))
    }, [])

    const handlePageChange = useCallback((page: number) => {
        setPageRequest((pr) => ({ ...pr, pageNumber: page - 1 }))
    }, [])

    const selectedPeople = useMemo(
        () =>
            (volunteerData?.content ?? [])
                .filter((v) => selectedVolunteers.has(v.volunteerInfo.id))
                .map((v) => ({
                    username: v.volunteerInfo.username,
                    name: v.volunteerInfo.fullName,
                    email: v.volunteerInfo.email,
                })),
        [volunteerData?.content, selectedVolunteers]
    )

    const openNotify = (people: { username: string; name: string }[]) => {
        setNotifyRecipients(people)
        setNotifyOpen(true)
    }

    const emailRecipients = useMemo(
        () =>
            selectedPeople.map((v) => ({
                name: v.name,
                email: v.email,
            })),
        [selectedPeople]
    )

    const totalVolunteers = volunteerData?.page.totalElements ?? 0
    const totalPages = volunteerData?.page.totalPages ?? 1
    const currentPage = (pageRequest.pageNumber ?? 0) + 1

    return (
        <Flex className={classes.root}>
            <Flex direction="column" gap="lg">
                <Text size="xl" fw={700}>
                    <FormattedMessage id={locales.title} />
                </Text>

                <VolunteerReportFilters
                    search={search}
                    onSearchChange={setSearch}
                    selectedProgram={selectedProgram}
                    onProgramChange={handleProgramChange}
                    selectedProject={selectedProject}
                    onProjectChange={handleProjectChange}
                    year={filterYear}
                    onYearChange={setFilterYear}
                    onReset={handleResetFilters}
                    programsOverride={visiblePrograms}
                    projectsOverride={visibleProjects}
                />

                <Card withBorder p="lg">
                    <VolunteerReportHeatmap
                        volunteers={volunteerData?.content ?? []}
                        year={Number(filterYear)}
                        onVolunteerSelect={handleVolunteerSelect}
                        selectedVolunteers={selectedVolunteers}
                        totalVolunteers={totalVolunteers}
                        onNotifyVolunteer={(username, name) => openNotify([{ username, name }])}
                    />

                    <Flex justify="space-between" align="center" mt="md" gap="md" wrap="wrap">
                        <Flex justify="space-between" align="center" wrap="wrap" gap="md" mb="sm">
                            <Button
                                leftSection={<IconMail size={16} />}
                                disabled={selectedVolunteers.size === 0}
                                onClick={() => setEmailDrawerOpen(true)}
                            >
                                <FormattedMessage id={locales.sendMessage} />
                            </Button>
                            <Button
                                variant="light"
                                leftSection={<IconBell size={16} />}
                                disabled={selectedVolunteers.size === 0}
                                onClick={() => openNotify(selectedPeople)}
                            >
                                <FormattedMessage id={locales.sendNotice} />
                            </Button>
                        </Flex>

                        <Flex gap="md" align="center">
                            <Select
                                size="sm"
                                aria-label="Per page"
                                value={String(pageRequest.pageSize)}
                                data={[
                                    { value: "10", label: "10" },
                                    { value: "25", label: "25" },
                                    {
                                        value: "50",
                                        label: "50",
                                    },
                                ]}
                                onChange={handlePageSizeChange}
                                w={100}
                            />
                            <Pagination total={totalPages} value={currentPage} onChange={handlePageChange} />
                        </Flex>
                    </Flex>

                    <EmailDrawer
                        opened={emailDrawerOpen}
                        close={() => setEmailDrawerOpen(false)}
                        templates={heatmapTemplates}
                        recipients={emailRecipients}
                    />
                    <InboxNotifyModal
                        opened={notifyOpen}
                        close={() => setNotifyOpen(false)}
                        recipients={notifyRecipients}
                    />
                </Card>
            </Flex>
        </Flex>
    )
}

export default VolunteerHeatmapPage
