import { UserInfoDto } from "@rds-network/portal-api-axios"
import { hasPermission } from "src/shared/user/roles"

const allowed = ["VOLUNTEER_CLEAN_CITY", "MAIN_VOLUNTEER", "ADMIN_VOLUNTEER", "ADMIN"]

export const hasAccess = (user: UserInfoDto | null): boolean => {
    return hasPermission(user, allowed)
}
