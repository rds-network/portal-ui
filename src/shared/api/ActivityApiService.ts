import { RequestHttp } from "src/shared/http/RequestHttp"

export type ActivityEventDto = {
    id: number
    createTime: string
    username?: string | null
    ip?: string | null
    method: string
    path: string
    query?: string | null
    action: string
    link?: string | null
}

export type ActivityPageDto = {
    content: ActivityEventDto[]
    total: number
    page: number
    size: number
}

const alive = (status: number) => status === 200 || status === 404 || status >= 500

export const ActivityApiService = {
    async list(params: { q?: string; sort?: string; dir?: string; page?: number; size?: number }): Promise<ActivityPageDto> {
        const response = await RequestHttp.get<ActivityPageDto>("/activity", {
            params,
            validateStatus: alive,
        })
        if (response.status !== 200) return { content: [], total: 0, page: 0, size: 50 }
        return response.data
    },
}
