import { RequestHttp } from "src/shared/http/RequestHttp"
import { ApplicationDto } from "@rds-network/portal-api-axios"

const alive = (status: number) =>
    status === 200 || status === 201 || status === 204 || status === 404 || status >= 500

export const ApplicationLookupApiService = {
    async getForUser(username: string): Promise<ApplicationDto | null> {
        const response = await RequestHttp.get<ApplicationDto>(
            `/application/for-user/${encodeURIComponent(username)}`,
            { validateStatus: alive },
        )
        if (response.status === 204 || response.status === 404) return null
        if (response.status !== 200) return null
        return response.data ?? null
    },
}
