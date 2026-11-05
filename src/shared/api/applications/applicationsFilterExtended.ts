import { ApplicationsFilter } from "@rds-network/portal-api-axios"

/** OpenAPI 1.46+ fields until portal-api-axios is bumped on CI. */
export type ApplicationsFilterExtended = ApplicationsFilter & {
    statuses?: string[]
    staleDays?: number
}

export type ApplicationDtoExtended = {
    lastUpdate?: string | null
}

export const STALE_APPLICATION_STATUSES = ["PAUSED", "CLARIFICATION"] as const

export const defaultStaleFollowUpFilter = (staleDays: number): ApplicationsFilterExtended => ({
    showCompleted: false,
    statuses: [...STALE_APPLICATION_STATUSES],
    staleDays,
})
