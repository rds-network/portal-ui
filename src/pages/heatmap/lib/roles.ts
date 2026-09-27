import { UserInfoDto } from "@rds-network/portal-api-axios"
import { hasPermission } from "src/shared/user/roles"

export const HEATMAP_MANAGER_ROLES = ["ADMIN", "ADMIN_VOLUNTEER", "MAIN_VOLUNTEER", "ADMIN_SSO"]

export const hasManagerHeatmapAccess = (user: UserInfoDto | null): boolean => {
    return hasPermission(user, HEATMAP_MANAGER_ROLES)
}

export const hasAccess = (user: UserInfoDto | null, isCurator = false): boolean => {
    return hasManagerHeatmapAccess(user) || isCurator
}
