import { Box, Button, CloseButton, Flex, Input, Pagination, Skeleton, Switch, Text } from "@mantine/core"
import { ApplicationsFilter, PageRequest } from "@rds-network/portal-api-axios"
import { IconArrowsExchange, IconFilterOff, IconSearch, IconUfo } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ApplicationAssigneeFilter } from "src/pages/applications/assignee/ApplicationAssigneeFilter"
import { ApplicationTransferModal } from "src/pages/applications/assignee/ApplicationTransferModal"
import { ApplicationsDashboard } from "src/pages/applications/ApplicationsDashboard"
import { allowedRoles } from "src/pages/applications/lib/roles"
import { ApplicationRow } from "src/pages/applications/row/ApplicationRow"
import { CreateUser } from "src/pages/users/createUser/CreateUser"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { useScreenSize } from "src/shared/hooks/useDesktop"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { hasPermission } from "src/shared/user/roles"
import classes from "./Applications.module.scss"
import { defaultPage, defaultPageResponse, UNASSIGNED_ASSIGNEE } from "./lib/defaults"
import { locales } from "./lib/locales"

const SkeletonCard = () => (
    <div className={classes.skeletonCard}>
        <Flex direction="column" gap="md">
            <Flex gap="sm" align="center">
                <Skeleton height={22} width={90} radius="md" />
                <Skeleton height={22} width={70} radius="md" />
                <Skeleton height={14} width={80} />
            </Flex>
            <Flex gap="xl" wrap="wrap">
                {[1, 2, 3, 4].map((i) => (
                    <Box key={i}>
                        <Skeleton height={10} width={60} mb={6} />
                        <Skeleton height={14} width={100} />
                    </Box>
                ))}
            </Flex>
        </Flex>
    </div>
)

export const Applications = () => {
    setDocumentTitleByLocale(locales.title)

    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const intl = useIntl()

    const debouncedSearch = searchParams.get("search") || ""
    const [searchQuery, setSearchQuery] = useState(debouncedSearch)
    const { isMobile } = useScreenSize()
    const statusFilter = searchParams.get("status") || null
    const requestedPage = Number(searchParams.get("page") || "1")
    const pageRequest: PageRequest = {
        ...defaultPage,
        pageNumber: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage - 1 : 0,
        pageSize: isMobile ? 10 : 25,
    }
    const filter: ApplicationsFilter = {
        showCompleted: searchParams.get("showCompleted") === "true",
        assignee: searchParams.get("unassigned") === "true" ? undefined : searchParams.get("assignee") || undefined,
        unassigned: searchParams.get("unassigned") === "true" || undefined,
    }
    const listStartRef = React.useRef<HTMLDivElement>(null)
    const previousIsMobile = React.useRef(isMobile)
    const [transferOpen, setTransferOpen] = React.useState(false)

    const updateUrlParams = (
        newSearch: string,
        newFilter: ApplicationsFilter,
        newPage = 0,
        newStatus: string | null = statusFilter
    ) => {
        const params = new URLSearchParams()
        if (newSearch.trim()) params.set("search", newSearch.trim())
        if (newFilter.showCompleted) params.set("showCompleted", "true")
        if (newFilter.unassigned) params.set("unassigned", "true")
        else if (newFilter.assignee) params.set("assignee", newFilter.assignee)
        if (newStatus) params.set("status", newStatus)
        if (newPage > 0) params.set("page", (newPage + 1).toString())
        setSearchParams(params)
    }

    useEffect(() => {
        setSearchQuery(debouncedSearch)
    }, [debouncedSearch])

    useEffect(() => {
        if (searchQuery.trim() === debouncedSearch) return
        const handler = setTimeout(() => {
            setSearchParams((previous) => {
                const params = new URLSearchParams(previous)
                if (searchQuery.trim()) params.set("search", searchQuery.trim())
                else params.delete("search")
                params.delete("page")
                return params
            })
        }, 500)
        return () => clearTimeout(handler)
    }, [searchQuery, debouncedSearch, setSearchParams])

    useEffect(() => {
        if (previousIsMobile.current === isMobile) return
        previousIsMobile.current = isMobile
        setSearchParams(
            (previous) => {
                const params = new URLSearchParams(previous)
                params.delete("page")
                return params
            },
            { replace: true }
        )
    }, [isMobile, setSearchParams])

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

    const listPageRequest: PageRequest = statusFilter
        ? { ...pageRequest, pageNumber: 0, pageSize: 500 }
        : pageRequest

    const {
        data: { content, page },
        isFetching,
    } = useQuery({
        initialData: { content: [], page: defaultPageResponse },
        queryKey: ["getApplications", debouncedSearch, listPageRequest, filter, statusFilter],
        queryFn: () =>
            PrivateApplicationApiService.getApplications(listPageRequest, debouncedSearch, filter).then(
                (response) => response.data
            ),
    })

    const filteredContent = useMemo(() => {
        if (!statusFilter) return content
        return content.filter((item) => item.status === statusFilter)
    }, [content, statusFilter])

    const clientPageSize = isMobile ? 10 : 25
    const clientTotal = filteredContent.length
    const clientTotalPages = Math.max(1, Math.ceil(clientTotal / clientPageSize))
    const clientPageIndex = statusFilter
        ? Math.min(Math.max((requestedPage || 1) - 1, 0), clientTotalPages - 1)
        : pageRequest.pageNumber || 0
    const visibleContent = statusFilter
        ? filteredContent.slice(clientPageIndex * clientPageSize, clientPageIndex * clientPageSize + clientPageSize)
        : content

    const totalElements = statusFilter ? clientTotal : page.totalElements
    const totalPages = statusFilter ? clientTotalPages : page.totalPages
    const currentPage = statusFilter ? clientPageIndex + 1 : pageRequest.pageNumber ? pageRequest.pageNumber + 1 : 1

    const activeFiltersCount = React.useMemo(() => {
        let count = 0
        if (debouncedSearch.trim()) count += 1
        if (filter.showCompleted) count += 1
        if (filter.assignee || filter.unassigned) count += 1
        if (statusFilter) count += 1
        return count
    }, [debouncedSearch, filter.showCompleted, filter.assignee, filter.unassigned, statusFilter])

    const resetFilters = () => {
        setSearchQuery("")
        updateUrlParams("", { showCompleted: false }, 0, null)
    }

    const { data: assigneeUsers = {} } = resolveUsers(visibleContent.map((application) => application.assignee))

    return (
        <Flex className={classes.root}>
            <Flex direction="column" gap={24} miw={0}>
                <Text className={classes.title} variant="gradient">
                    <FormattedMessage id={locales.title} />
                </Text>

                <ApplicationsDashboard
                    activeAssignee={filter.unassigned ? UNASSIGNED_ASSIGNEE : filter.assignee || null}
                    activeStatus={statusFilter}
                    onSelectAssignee={(assignee) =>
                        updateUrlParams(
                            debouncedSearch,
                            {
                                ...filter,
                                assignee: assignee === UNASSIGNED_ASSIGNEE ? undefined : assignee || undefined,
                                unassigned: assignee === UNASSIGNED_ASSIGNEE || undefined,
                            },
                            0,
                            statusFilter
                        )
                    }
                    onSelectStatus={(status) => updateUrlParams(debouncedSearch, filter, 0, status)}
                />

                <div ref={listStartRef} />
                <Box className={classes.filterPanel}>
                    <div className={classes.controls}>
                        <Input
                            aria-label={intl.formatMessage({ id: locales.search })}
                            placeholder={intl.formatMessage({ id: locales.search })}
                            leftSection={<IconSearch size={18} aria-hidden="true" />}
                            leftSectionPointerEvents="none"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            rightSectionPointerEvents="all"
                            size="sm"
                            radius="md"
                            rightSection={
                                <CloseButton
                                    aria-label="Clear input"
                                    onClick={() => setSearchQuery("")}
                                    style={{ display: searchQuery ? undefined : "none" }}
                                />
                            }
                            className={classes.searchInput}
                        />
                        <ApplicationAssigneeFilter
                            value={filter.unassigned ? UNASSIGNED_ASSIGNEE : filter.assignee || null}
                            onChange={(assignee) =>
                                updateUrlParams(
                                    debouncedSearch,
                                    {
                                        ...filter,
                                        assignee: assignee === UNASSIGNED_ASSIGNEE ? undefined : assignee || undefined,
                                        unassigned: assignee === UNASSIGNED_ASSIGNEE || undefined,
                                    },
                                    0,
                                    statusFilter
                                )
                            }
                            size="sm"
                            className={classes.assigneeFilter}
                        />
                        <Button
                            variant="light"
                            size="sm"
                            radius="md"
                            leftSection={<IconArrowsExchange size={16} />}
                            onClick={() => setTransferOpen(true)}
                        >
                            <FormattedMessage
                                id="pages.applications.transfer.action"
                                defaultMessage="Передать полномочия"
                            />
                        </Button>
                        <CreateUser withLabel size="sm" className={classes.addUserButton} />
                    </div>
                    <Flex className={classes.secondaryControls}>
                        <Switch
                            label={<FormattedMessage id={locales.showCompleted} />}
                            checked={filter.showCompleted}
                            onChange={() =>
                                updateUrlParams(
                                    debouncedSearch,
                                    { ...filter, showCompleted: !filter.showCompleted },
                                    0,
                                    statusFilter
                                )
                            }
                            size="sm"
                            className={classes.completedSwitch}
                        />
                        <Button
                            variant="subtle"
                            size="compact-sm"
                            radius="md"
                            leftSection={<IconFilterOff size={16} aria-hidden="true" />}
                            onClick={resetFilters}
                            disabled={activeFiltersCount === 0 && !searchQuery}
                            className={classes.resetButton}
                        >
                            <FormattedMessage id={locales.resetFilters} />
                        </Button>
                    </Flex>
                </Box>

                <Flex direction="column" className={classes.cardList}>
                    {isFetching && visibleContent.length === 0 ? (
                        <>
                            {[1, 2, 3].map((i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </>
                    ) : (
                        visibleContent.map((application) => (
                            <ApplicationRow
                                key={application.id}
                                applicationDto={application}
                                assigneeUser={assigneeUsers[application.assignee || ""]}
                            />
                        ))
                    )}
                </Flex>

                {totalElements === 0 && !isFetching && (
                    <Flex className={classes.emptyState}>
                        <IconUfo size={48} />
                        <Text>
                            <FormattedMessage id={locales.empty} />
                        </Text>
                    </Flex>
                )}
            </Flex>

            {totalPages > 1 && (
                <Flex className={classes.pagination}>
                    <Pagination
                        total={totalPages}
                        value={currentPage}
                        disabled={isFetching}
                        onChange={(newPage) => {
                            updateUrlParams(debouncedSearch, filter, newPage - 1, statusFilter)
                        }}
                        siblings={isMobile ? 0 : 1}
                    />
                    <Text c="dimmed">
                        <FormattedMessage id={locales.total} values={{ count: totalElements }} />
                    </Text>
                </Flex>
            )}

            <ApplicationTransferModal
                opened={transferOpen}
                onClose={() => setTransferOpen(false)}
                initialFrom={filter.assignee || null}
            />
        </Flex>
    )
}

export default Applications
