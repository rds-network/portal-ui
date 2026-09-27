import { Badge, Flex, Skeleton, Text, UnstyledButton } from "@mantine/core"
import { PageRequest, UserInfoDto } from "@rds-network/portal-api-axios"
import { useQuery } from "@tanstack/react-query"
import React, { useMemo } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { useProjects } from "src/app/providers/ProjectsProvider"
import { reportBlockOf, UserApiService } from "src/shared/api/user/UserApiService"
import { NO_PROGRAM_CODE, NO_PROJECT_CODE } from "src/shared/constants/Shared"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { locales } from "./lib/locales"
import classes from "./VolunteersDashboard.module.scss"

const statsPage: PageRequest = {
    pageNumber: 0,
    pageSize: 500,
    sort: ["active;desc,fullName;asc"],
}

type Bucket = {
    key: string
    code: string | null
    total: number
}

type DashboardStats = {
    total: number
    active: number
    deactivated: number
    reportBlocked: number
    byProgram: Bucket[]
    byProject: Bucket[]
}

const buildStats = (items: UserInfoDto[]): DashboardStats => {
    const programs = new Map<string, Bucket>()
    const projects = new Map<string, Bucket>()
    let active = 0
    let deactivated = 0
    let reportBlocked = 0

    for (const item of items) {
        if (item.active) active += 1
        else deactivated += 1
        if (reportBlockOf(item).reportBlocked) reportBlocked += 1

        const programCode = item.program?.code?.trim().toUpperCase() || null
        const programKey = programCode || NO_PROGRAM_CODE
        const programBucket = programs.get(programKey) || { key: programKey, code: programCode, total: 0 }
        programBucket.total += 1
        programs.set(programKey, programBucket)

        const projectCode = item.project?.code?.trim() || null
        const projectKey = projectCode || NO_PROJECT_CODE
        const projectBucket = projects.get(projectKey) || { key: projectKey, code: projectCode, total: 0 }
        projectBucket.total += 1
        projects.set(projectKey, projectBucket)
    }

    const sortBuckets = (a: Bucket, b: Bucket) => {
        if (!a.code && b.code) return 1
        if (a.code && !b.code) return -1
        return b.total - a.total || (a.code || "").localeCompare(b.code || "")
    }

    return {
        total: items.length,
        active,
        deactivated,
        reportBlocked,
        byProgram: [...programs.values()].sort(sortBuckets),
        byProject: [...projects.values()].sort(sortBuckets),
    }
}

type Props = {
    showDeactivated: boolean
    activeProgram: string | null
    activeProject: string | null
    onSelectProgram: (program: string | null) => void
    onSelectProject: (project: string | null) => void
    reportBlockedActive: boolean
    onToggleReportBlocked: () => void
}

export const VolunteersDashboard: React.FC<Props> = ({
    showDeactivated,
    activeProgram,
    activeProject,
    onSelectProgram,
    onSelectProject,
    reportBlockedActive,
    onToggleReportBlocked,
}) => {
    const intl = useIntl()
    const programs = usePrograms()
    const projects = useProjects()

    const { data: items = [], isFetching } = useQuery({
        queryKey: ["volunteers-dashboard", showDeactivated],
        queryFn: async () => {
            const filter = showDeactivated ? {} : { onlyActive: true }
            const response = await UserApiService.searchUsers("", statsPage, filter)
            return response.data.content || []
        },
        staleTime: 30_000,
    })

    const stats = useMemo(() => buildStats(items), [items])

    const programLabel = (bucket: Bucket) => {
        if (!bucket.code) return intl.formatMessage({ id: locales.noProgram })
        const program =
            programs.find((p) => p.code.toUpperCase() === bucket.code) ||
            items.find((u) => u.program?.code?.toUpperCase() === bucket.code)?.program
        return program ? getLocalizedName(program, intl.locale) || bucket.code : bucket.code
    }

    const projectLabel = (bucket: Bucket) => {
        if (!bucket.code) return intl.formatMessage({ id: locales.noProject })
        const project =
            projects.find((p) => p.code === bucket.code) || items.find((u) => u.project?.code === bucket.code)?.project
        return project ? getLocalizedName(project, intl.locale) || bucket.code : bucket.code
    }

    if (isFetching && items.length === 0) {
        return (
            <div className={classes.root}>
                <Skeleton height={18} width={200} mb={12} />
                <Flex gap={8} wrap="wrap" mb="md">
                    <Skeleton height={32} width={110} radius="xl" />
                    <Skeleton height={32} width={110} radius="xl" />
                </Flex>
                <Flex gap={8} wrap="wrap">
                    <Skeleton height={32} width={140} radius="xl" />
                    <Skeleton height={32} width={140} radius="xl" />
                    <Skeleton height={32} width={140} radius="xl" />
                </Flex>
            </div>
        )
    }

    return (
        <div className={classes.root}>
            <Text fw={700} size="sm" mb={4}>
                <FormattedMessage id={locales.dashboardTitle} />
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
                <FormattedMessage
                    id={showDeactivated ? locales.dashboardSubtitleAll : locales.dashboardSubtitle}
                    values={{ count: stats.total }}
                />
            </Text>

            <Flex gap={8} wrap="wrap" mb="md">
                <StatChip
                    active={false}
                    onClick={() => undefined}
                    label={<FormattedMessage id={locales.dashboardActive} values={{ count: stats.active }} />}
                    color="teal"
                    interactive={false}
                />
                {showDeactivated && (
                    <StatChip
                        active={false}
                        onClick={() => undefined}
                        label={
                            <FormattedMessage
                                id={locales.dashboardDeactivated}
                                values={{ count: stats.deactivated }}
                            />
                        }
                        color="red"
                        interactive={false}
                    />
                )}
                {(stats.reportBlocked > 0 || reportBlockedActive) && (
                    <StatChip
                        active={reportBlockedActive}
                        onClick={onToggleReportBlocked}
                        label={
                            <FormattedMessage
                                id={locales.dashboardReportBlocked}
                                values={{ count: stats.reportBlocked }}
                            />
                        }
                        color="red"
                    />
                )}
            </Flex>

            <Text size="xs" c="dimmed" mb={6}>
                <FormattedMessage id={locales.dashboardPrograms} />
            </Text>
            <Flex gap={8} wrap="wrap" mb="md">
                {stats.byProgram.map((bucket) => {
                    const value = bucket.code || NO_PROGRAM_CODE
                    const active = activeProgram === value
                    return (
                        <StatChip
                            key={bucket.key}
                            active={active}
                            onClick={() => onSelectProgram(active ? null : value)}
                            label={`${programLabel(bucket)}: ${bucket.total}`}
                            color="gray"
                        />
                    )
                })}
            </Flex>

            <Text size="xs" c="dimmed" mb={6}>
                <FormattedMessage id={locales.dashboardProjects} />
            </Text>
            <Flex gap={8} wrap="wrap">
                {stats.byProject.map((bucket) => {
                    const value = bucket.code || NO_PROJECT_CODE
                    const active = activeProject === value
                    return (
                        <StatChip
                            key={bucket.key}
                            active={active}
                            onClick={() => onSelectProject(active ? null : value)}
                            label={`${projectLabel(bucket)}: ${bucket.total}`}
                            color="gray"
                        />
                    )
                })}
            </Flex>
        </div>
    )
}

const StatChip = ({
    active,
    onClick,
    label,
    color,
    interactive = true,
}: {
    active: boolean
    onClick: () => void
    label: React.ReactNode
    color: string
    interactive?: boolean
}) => {
    const badge = (
        <Badge
            color={color}
            variant={active ? "filled" : "light"}
            size="lg"
            radius="md"
            className={classes.chip}
            style={interactive ? undefined : { cursor: "default" }}
        >
            {label}
        </Badge>
    )

    if (!interactive) {
        return <span className={classes.chipButton}>{badge}</span>
    }

    return (
        <UnstyledButton className={classes.chipButton} onClick={onClick} data-active={active || undefined}>
            {badge}
        </UnstyledButton>
    )
}
