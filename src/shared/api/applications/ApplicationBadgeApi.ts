import { ApplicationsFilter, PageRequest } from "@rds-network/portal-api-axios"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"

const countPage: PageRequest = {
    pageNumber: 0,
    pageSize: 1,
    sort: ["created;desc"],
}

const openFilter: ApplicationsFilter = {
    showCompleted: false,
}

export const ApplicationBadgeApi = {
    /** Open (non-completed) applications — for navbar badge. */
    async openCount(): Promise<number> {
        try {
            const response = await PrivateApplicationApiService.getApplications(countPage, "", openFilter)
            return response.data.page?.totalElements ?? 0
        } catch {
            return 0
        }
    },
}
