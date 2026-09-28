import { PublicRequestHttp } from "src/shared/http/PublicRequestHttp"
import { RequestHttp } from "src/shared/http/RequestHttp"

export type ApplicationJoinDto = {
    title: string
    body: string
    agree1Label: string
    agree2Label: string
    buttonLabel: string
    updatedAt: string | null
}

export type ApplicationJoinSaveBody = {
    title: string
    body: string
    agree1Label: string
    agree2Label: string
    buttonLabel: string
}

const alive = (status: number) =>
    status === 200 || status === 201 || status === 204 || status === 403 || status === 404 || status >= 500

export const ApplicationJoinApiService = {
    async getPublic(): Promise<ApplicationJoinDto | null> {
        // PublicRequestHttp: never redirect anonymous visitors on /application to OAuth
        const response = await PublicRequestHttp.get<ApplicationJoinDto>("/public/application-join", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async getAdmin(): Promise<ApplicationJoinDto> {
        const response = await RequestHttp.get<ApplicationJoinDto>("/admin/application-join", {
            validateStatus: (status) => status === 200 || status === 404,
        })
        if (response.status === 404) throw new Error("API application-join ещё не на сервере")
        return response.data
    },

    async putAdmin(body: ApplicationJoinSaveBody): Promise<ApplicationJoinDto> {
        const response = await RequestHttp.put<ApplicationJoinDto>("/admin/application-join", body, {
            validateStatus: (status) => status === 200 || status === 404,
        })
        if (response.status === 404) throw new Error("API application-join ещё не на сервере")
        return response.data
    },
}
