import { Avatar, Badge, Flex, Skeleton, Text, UnstyledButton } from "@mantine/core"
import { ApplicationDto, PageRequest, UserInfoDto } from "@rds-network/portal-api-axios"
import { useQuery } from "@tanstack/react-query"
import React, { useMemo } from "react"
import { FormattedMessage } from "react-intl"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { ApplicationStatus, getApplicationStatusColor } from "src/shared/user/applications"
import { UNASSIGNED_ASSIGNEE } from "./lib/defaults"
import classes from "./ApplicationsDashboard.module.scss"

const statsPage: PageRequest = {
    pageNumber: 0,
    pageSize: 500,
    sort: ["created;desc"],
}

const OPEN_STATUSES = [
    ApplicationStatus.CREATED,
    ApplicationStatus.IN_PROGRESS,
    ApplicationStatus.CLARIFICATION,
    ApplicationStatus.PAUSED,
    ApplicationStatus.READY_TO_SEND,
    ApplicationStatus.DOCS_SENT,
    ApplicationStatus.DOCS_RECEIVED,
]

/** Statuses hidden by the "showCompleted" filter on the backend. */
const TERMINAL_STATUSES = [ApplicationStatus.DONE, ApplicationStatus.DENY]

type AssigneeBucket = {
    key: string
    login: string | null
    total: number
    created: number
    paused: number
}

type DashboardStats = {
    open: number
    byStatus: Record<string, number>
    byAssignee: AssigneeBucket[]
}

const buildStats = (items: ApplicationDto[]): DashboardStats => {
    const map = new Map<string, AssigneeBucket>()
    const byStatus: Record<string, number> = {}

    for (const item of items) {
        const status = item.status || ""
        byStatus[status] = (byStatus[status] || 0) + 1

        const login = item.assignee?.trim() || null
        const key = login || UNASSIGNED_ASSIGNEE
        const bucket = map.get(key) || { key, login, total: 0, created: 0, paused: 0 }
        bucket.total += 1
        if (item.status === ApplicationStatus.CREATED) bucket.created += 1
        if (item.status === ApplicationStatus.PAUSED) bucket.paused += 1
        map.set(key, bucket)
    }

    const byAssignee = [...map.values()].sort((a, b) => {
        if (!a.login && b.login) return 1
        if (a.login && !b.login) return -1
        return b.total - a.total || (a.login || "").localeCompare(b.login || "")
    })

    return { open: items.length, byStatus, byAssignee }
}

const countTerminal = (items: ApplicationDto[]): Record<string, number> => {
    const counts: Record<string, number> = {}
    for (const item of items) {
        const status = item.status || ""
        if (TERMINAL_STATUSES.some((terminal) => terminal === status)) {
            counts[status] = (counts[status] || 0) + 1
        }
    }
    return counts
}

type Props = {
    activeAssignee: string | null
    activeStatus: string | null
    onSelectAssignee: (assignee: string | null) => void
    onSelectStatus: (status: string | null) => void
}

export const ApplicationsDashboard: React.FC<Props> = ({
    activeAssignee,
    activeStatus,
    onSelectAssignee,
    onSelectStatus,
}) => {
    const { data: items = [], isFetching } = useQuery({
        queryKey: ["applications-dashboard"],
        queryFn: async () => {
            const response = await PrivateApplicationApiService.getApplications(statsPage, "", {
                showCompleted: false,
            })
            return response.data.content || []
        },
        staleTime: 30_000,
    })

    // Terminal statuses are filtered out of the query above, so they need their own fetch.
    const { data: terminalCounts = {} } = useQuery({
        queryKey: ["applications-dashboard", "terminal"],
        queryFn: async () => {
            const response = await PrivateApplicationApiService.getApplications(statsPage, "", {
                showCompleted: true,
            })
            return countTerminal(response.data.content || [])
        },
        staleTime: 30_000,
    })

    const stats = useMemo(() => buildStats(items), [items])
    const { data: users = {} } = resolveUsers(stats.byAssignee.map((b) => b.login))

    if (isFetching && items.length === 0) {
        return (
            <div className={classes.root}>
                <Skeleton height={18} width={180} mb={12} />
                <Flex gap={8} wrap="wrap">
                    <Skeleton height={32} width={110} radius="xl" />
                    <Skeleton height={32} width={110} radius="xl" />
                    <Skeleton height={32} width={140} radius="xl" />
                </Flex>
            </div>
        )
    }

    return (
        <div className={classes.root}>
            <Text fw={700} size="sm" mb={4}>
                <FormattedMessage id="pages.applications.dashboard.title" />
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
                <FormattedMessage id="pages.applications.dashboard.subtitle" values={{ count: stats.open }} />
            </Text>

            <Flex gap={8} wrap="wrap" mb="md">
                {OPEN_STATUSES.map((status) => (
                    <StatusChip
                        key={status}
                        status={status}
                        count={stats.byStatus[status] || 0}
                        active={activeStatus === status}
                        onClick={() => onSelectStatus(activeStatus === status ? null : status)}
                    />
                ))}
                {TERMINAL_STATUSES.filter((status) => (terminalCounts[status] || 0) > 0).map((status) => (
                    <StatusChip
                        key={status}
                        status={status}
                        count={terminalCounts[status] || 0}
                        active={activeStatus === status}
                        onClick={() => onSelectStatus(activeStatus === status ? null : status)}
                    />
                ))}
            </Flex>

            <Flex gap={8} wrap="wrap">
                {stats.byAssignee.map((bucket) => {
                    const user = bucket.login ? users[bucket.login] : undefined
                    const label = bucket.login
                        ? user?.fullName || bucket.login
                        : undefined
                    return (
                        <AssigneeChip
                            key={bucket.key}
                            bucket={bucket}
                            user={user}
                            label={label}
                            active={
                                bucket.login
                                    ? activeAssignee === bucket.login
                                    : activeAssignee === UNASSIGNED_ASSIGNEE
                            }
                            onClick={() => {
                                if (bucket.login) {
                                    onSelectAssignee(activeAssignee === bucket.login ? null : bucket.login)
                                } else {
                                    onSelectAssignee(
                                        activeAssignee === UNASSIGNED_ASSIGNEE ? null : UNASSIGNED_ASSIGNEE
                                    )
                                }
                            }}
                        />
                    )
                })}
            </Flex>
        </div>
    )
}

const StatusChip = ({
    status,
    count,
    active,
    onClick,
}: {
    status: ApplicationStatus
    count: number
    active: boolean
    onClick: () => void
}) => (
    <StatChip
        active={active}
        onClick={onClick}
        color={getApplicationStatusColor(status) || "gray"}
        label={
            <>
                <FormattedMessage id={`common.application-status.${status}`} />: {count}
            </>
        }
    />
)

const StatChip = ({
    active,
    onClick,
    label,
    color,
}: {
    active: boolean
    onClick: () => void
    label: React.ReactNode
    color: string
}) => (
    <UnstyledButton className={classes.chipButton} onClick={onClick} data-active={active || undefined}>
        <Badge color={color} variant={active ? "filled" : "light"} size="lg" radius="md" className={classes.chip}>
            {label}
        </Badge>
    </UnstyledButton>
)

const AssigneeChip = ({
    bucket,
    user,
    label,
    active,
    onClick,
}: {
    bucket: AssigneeBucket
    user?: UserInfoDto
    label?: string
    active: boolean
    onClick: () => void
}) => (
    <UnstyledButton className={classes.chipButton} onClick={onClick} data-active={active || undefined}>
        <Badge
            variant={active ? "filled" : "light"}
            color={active ? "teal" : "gray"}
            size="lg"
            radius="md"
            className={classes.chip}
            leftSection={
                bucket.login ? (
                    <Avatar src={user?.avatar?.link} name={label || bucket.login} color="initials" size={18} />
                ) : undefined
            }
        >
            {bucket.login ? (
                <span>
                    {label || bucket.login}: {bucket.total}
                    {(bucket.created > 0 || bucket.paused > 0) && (
                        <>
                            {" · "}
                            <FormattedMessage
                                id="pages.applications.dashboard.assigneeBreakdown"
                                values={{ newCount: bucket.created, pausedCount: bucket.paused }}
                            />
                        </>
                    )}
                </span>
            ) : (
                <FormattedMessage
                    id="pages.applications.dashboard.unassigned"
                    values={{ count: bucket.total }}
                />
            )}
        </Badge>
    </UnstyledButton>
)
