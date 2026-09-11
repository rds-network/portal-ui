import { UserInfoDto } from "@rds-network/portal-api-axios"
import { hasPermission } from "src/shared/user/roles"

const allowed = ["ADMIN", "ADMIN_VOLUNTEER", "MAIN_VOLUNTEER"]

export const hasAccess = (user: UserInfoDto | null): boolean => {
    return hasPermission(user, allowed)
}
