import { RequestHttp } from "src/shared/http/RequestHttp"

export type PointMissionDto = {
    id: string
    title: string
    description?: string | null
    points: number
    link?: string | null
    active: boolean
    oneTime: boolean
    sortOrder: number
    claimed?: boolean
}

export type PointMissionWriteRequest = {
    title: string
    description?: string | null
    points: number
    link?: string | null
    active: boolean
    oneTime: boolean
    sortOrder: number
}

export type PointMissionClaimResult = {
    missionId: string
    points: number
    balance: number
    alreadyClaimed: boolean
}

const alive = (status: number) => status === 200 || status === 204 || status === 404 || status >= 500

export const PointMissionApiService = {
    async listActive(): Promise<PointMissionDto[]> {
        const response = await RequestHttp.get<PointMissionDto[]>("/point-missions", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async claim(id: string): Promise<PointMissionClaimResult> {
        const response = await RequestHttp.post<PointMissionClaimResult>(`/point-missions/${id}/claim`)
        return response.data
    },

    async adminList(): Promise<PointMissionDto[]> {
        const response = await RequestHttp.get<PointMissionDto[]>("/admin/point-missions", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async create(payload: PointMissionWriteRequest): Promise<PointMissionDto> {
        const response = await RequestHttp.post<PointMissionDto>("/admin/point-missions", payload)
        return response.data
    },

    async update(id: string, payload: PointMissionWriteRequest): Promise<PointMissionDto> {
        const response = await RequestHttp.patch<PointMissionDto>(`/admin/point-missions/${id}`, payload)
        return response.data
    },

    async remove(id: string): Promise<void> {
        await RequestHttp.delete(`/admin/point-missions/${id}`)
    },
}
