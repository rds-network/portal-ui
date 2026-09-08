import { Box, Button, Card, Switch, CloseButton, Flex, Input, Pagination, Skeleton, Table, Text } from "@mantine/core"
import { ApplicationsFilter, PageRequest } from "@rds-network/portal-api-axios"
import { IconFilterOff, IconSearch, IconUfo } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ApplicationAssigneeFilter } from "src/pages/applications/assignee/ApplicationAssigneeFilter"
import { allowedRoles } from "src/pages/applications/lib/roles"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { ApplicationRow } from "src/pages/applications/row/ApplicationRow"
import { CreateUser } from "src/pages/users/createUser/CreateUser"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { useScreenSize } from "src/shared/hooks/useDesktop"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { hasPermission } from "src/shared/user/roles"
import classes from "./Applications.module.scss"
import { defaultPage, defaultPageResponse, UNASSIGNED_ASSIGNEE } from "./lib/defaults"
import { locales } from "./lib/locales"

const SkeletonCard = () => (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={classes.mobileCard}>
        <Flex direction="column" gap="md">
            <Flex justify="space-between" align="center">
                <Flex columnGap="sm" align="center">
                    <Skeleton height={40} circle />
                    <Box>
                        <Skeleton height={14} width={120} mb={4} />
                        <Skeleton height={10} width={80} />
                    </Box>
                </Flex>
                <Skeleton height={24} width={24} />
            </Flex>

            <Box style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--mantine-color-gray-2)" }}>
                {[1, 2, 3, 4].map((i) => (
                    <Flex key={i} justify="space-between" align="center" mb="sm">
                        <Skeleton height={10} width={60} />
                        <Skeleton height={10} width={100} />
                    </Flex>
                ))}
            </Box>
        </Flex>
    </Card>
)

export const Applications = () => {
    setDocumentTitleByLocale(locales.title)

    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const intl = useIntl()

    const debouncedSearch = searchParams.get("search") || ""
    const [searchQuery, setSearchQuery] = useState(debouncedSearch)
    const { shouldShowTable, isLargeDesktop, isMobile } = useScreenSize()
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

    // URL is the source of truth for filters and pagination, including back/forward navigation.
    const updateUrlParams = (newSearch: string, newFilter: ApplicationsFilter, newPage = 0) => {
        const params = new URLSearchParams()
        if (newSearch.trim()) params.set("search", newSearch.trim())
        if (newFilter.showCompleted) params.set("showCompleted", "true")
        if (newFilter.unassigned) params.set("unassigned", "true")
        else if (newFilter.assignee) params.set("assignee", newFilter.assignee)
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
        data: { content, page },
        isFetching,
    } = useQuery({
        initialData: { content: [], page: defaultPageResponse },
        queryKey: ["getApplications", debouncedSearch, pageRequest, filter],
        queryFn: () =>
            PrivateApplicationApiService.getApplications(pageRequest, debouncedSearch, filter).then(
                (response) => response.data
            ),
    })

    const activeFiltersCount = React.useMemo(() => {
        let count = 0
        if (debouncedSearch.trim()) count += 1
        if (filter.showCompleted) count += 1
        if (filter.assignee || filter.unassigned) count += 1
        return count
    }, [debouncedSearch, filter.showCompleted, filter.assignee, filter.unassigned])

    const resetFilters = () => {
        setSearchQuery("")
        updateUrlParams("", { showCompleted: false })
    }

    const { data: assigneeUsers = {} } = resolveUsers(content.map((application) => application.assignee))

    const rows = content.map((application) => (
        <ApplicationRow
            key={application.id}
            applicationDto={application}
            assigneeUser={assigneeUsers[application.assignee || ""]}
        />
    ))

    return (
        <Flex className={classes.root}>
            <Flex direction="column" gap={24} miw={0}>
                <Text className={classes.title} variant="gradient">
                    <FormattedMessage id={locales.title} />
                </Text>
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
                                updateUrlParams(debouncedSearch, {
                                    ...filter,
                                    assignee: assignee === UNASSIGNED_ASSIGNEE ? undefined : assignee || undefined,
                                    unassigned: assignee === UNASSIGNED_ASSIGNEE || undefined,
                                })
                            }
                            size="sm"
                            className={classes.assigneeFilter}
                        />
                        <CreateUser withLabel size="sm" className={classes.addUserButton} />
                    </div>
                    <Flex className={classes.secondaryControls}>
                        <Switch
                            label={<FormattedMessage id={locales.showCompleted} />}
                            checked={filter.showCompleted}
                            onChange={() =>
                                updateUrlParams(debouncedSearch, { ...filter, showCompleted: !filter.showCompleted })
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
                {shouldShowTable ? (
                    <Table stickyHeader highlightOnHover className={classes.table}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>
                                    <FormattedMessage
                                        id={isLargeDesktop ? locales.createdAndType : locales.createdShortAndTypeShort}
                                    />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage
                                        id={isLargeDesktop ? locales.nameAndEmail : locales.nameAndEmailShort}
                                    />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage
                                        id={isLargeDesktop ? locales.contractStart : locales.contractStartShort}
                                    />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id={isLargeDesktop ? locales.status : locales.statusShort} />
                                </Table.Th>
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                ) : (
                    <Flex direction="column" className={classes.mobileList}>
                        {isFetching && content.length === 0 ? (
                            <>
                                {[1, 2, 3].map((i) => (
                                    <SkeletonCard key={i} />
                                ))}
                            </>
                        ) : (
                            content.map((application) => (
                                <ApplicationRow
                                    key={application.id}
                                    applicationDto={application}
                                    assigneeUser={assigneeUsers[application.assignee || ""]}
                                    isMobile={true}
                                />
                            ))
                        )}
                    </Flex>
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
                        disabled={isFetching}
                        onChange={(newPage) => {
                            const pageNumber = newPage - 1
                            updateUrlParams(debouncedSearch, filter, pageNumber)
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

export default Applications
