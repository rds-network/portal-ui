import { UserInfoDto } from "@rds-network/portal-api-axios"

export enum UserGroup {
    ADMIN = "ADMIN",
    ADMIN_VOLUNTEER = "ADMIN_VOLUNTEER",
    VOLUNTEER = "VOLUNTEER",
    VOLUNTEER_CLEAN_CITY = "VOLUNTEER_CLEAN_CITY",
    DEVELOPER = "DEVELOPER",
    DEVELOPER_WP = "DEVELOPER_WP",
    LAWYERS = "LAWYERS",
    MEDIA = "MEDIA",
    TEACHER = "TEACHER",
    INTERVIEWER = "INTERVIEWER",
    MEMBER = "MEMBER",
    GUIDES = "GUIDES",
    SEO_MANAGER = "SEO_MANAGER",
    INSIDE_VOLUNTEER = "INSIDE_VOLUNTEER",
    MAIN_VOLUNTEER = "MAIN_VOLUNTEER",
    ADMIN_SSO = "ADMIN_SSO",
    ADMIN_WP = "ADMIN_WP",
}

export const hasPermission = (
    user: UserInfoDto | null,
    allowed: string[] | undefined | null = [],
    disallowed: string[] | undefined | null = []
): boolean => {
    if (isEmpty(allowed) && isEmpty(disallowed)) {
        return true
    } else if (isEmpty(allowed)) {
        if (user) {
            const groups = user.groups
            return !groups.some((group) => disallowed!!.includes(group))
        }
    } else {
        if (user) {
            const groups = user.groups
            return groups.some((group) => allowed!!.includes(group))
        }
    }
    return false
}

const isEmpty = (arr: string[] | undefined | null) => {
    return arr === undefined || arr === null || arr.length === 0
}
