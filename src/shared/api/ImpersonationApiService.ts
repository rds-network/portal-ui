import { RequestHttp } from "src/shared/http/RequestHttp"

export type ImpersonationStatusDto = {
    active: boolean
    canImpersonate: boolean
    targetUsername?: string | null
    targetFullName?: string | null
    realUsername?: string | null
    realFullName?: string | null
}

const alive = (status: number) =>
    status === 200 ||
    status === 201 ||
    status === 204 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status >= 500

export const ImpersonationApiService = {
    async status(): Promise<ImpersonationStatusDto | null> {
        const response = await RequestHttp.get<ImpersonationStatusDto>("/admin/impersonate/status", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async start(username: string): Promise<ImpersonationStatusDto> {
        const response = await RequestHttp.post<ImpersonationStatusDto>(
            "/admin/impersonate",
            { username },
            { validateStatus: (status) => status === 200 || status === 404 }
        )
        if (response.status === 404) throw new Error("API impersonation ещё не на сервере")
        return response.data
    },

    async stop(): Promise<ImpersonationStatusDto> {
        const response = await RequestHttp.delete<ImpersonationStatusDto>("/admin/impersonate", {
            validateStatus: (status) => status === 200 || status === 404,
        })
        if (response.status === 404) throw new Error("API impersonation ещё не на сервере")
        return response.data
    },
}
