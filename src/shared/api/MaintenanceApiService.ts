import { RequestHttp } from "src/shared/http/RequestHttp"

export type PublicMaintenanceDto = {
    enabled: boolean
    headline: string
    body: string
    launchAt: string | null
}

export type AdminMaintenanceDto = PublicMaintenanceDto & {
    bypassToken: string | null
}

export type MaintenanceAdminSaveBody = {
    enabled: boolean
    headline: string
    body: string
    launchAt?: string | null
    regenerateBypassToken?: boolean
}

const alive = (status: number) =>
    status === 200 || status === 201 || status === 204 || status === 403 || status === 404 || status >= 500

export const MaintenanceApiService = {
    async getPublic(): Promise<PublicMaintenanceDto | null> {
        const response = await RequestHttp.get<PublicMaintenanceDto>("/public/maintenance", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async unlock(token: string): Promise<boolean> {
        const response = await RequestHttp.post("/public/maintenance/unlock", { token }, { validateStatus: alive })
        return response.status === 200
    },

    async getAdmin(): Promise<AdminMaintenanceDto> {
        const response = await RequestHttp.get<AdminMaintenanceDto>("/admin/maintenance", {
            validateStatus: (status) => status === 200 || status === 404,
        })
        if (response.status === 404) throw new Error("API maintenance ещё не на сервере")
        return response.data
    },

    async putAdmin(body: MaintenanceAdminSaveBody): Promise<AdminMaintenanceDto> {
        const response = await RequestHttp.put<AdminMaintenanceDto>("/admin/maintenance", body, {
            validateStatus: (status) => status === 200 || status === 404,
        })
        if (response.status === 404) throw new Error("API maintenance ещё не на сервере")
        return response.data
    },
}
