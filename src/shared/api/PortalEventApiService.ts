import { RequestHttp } from "src/shared/http/RequestHttp"

export type PortalEventType = "CALL" | "SUBBOTNIK" | "MEETING" | "LECTURE" | "OTHER"

export type PortalEventDto = {
    id: string
    createTime: string
    createdBy: string
    title: string
    description?: string | null
    startsAt: string
    location?: string | null
    type: PortalEventType
    programCode?: string | null
}

export type PortalEventWriteRequest = {
    title: string
    description?: string | null
    startsAt: string
    location?: string | null
    type: PortalEventType
    programCode?: string | null
}

const alive = (status: number) => status === 200 || status === 201 || status === 204 || status === 404 || status >= 500

export const PortalEventApiService = {
    async list(upcoming = true, limit = 20): Promise<PortalEventDto[]> {
        const response = await RequestHttp.get<PortalEventDto[]>("/events", {
            params: { upcoming, limit },
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async create(payload: PortalEventWriteRequest): Promise<PortalEventDto> {
        const response = await RequestHttp.post<PortalEventDto>("/events", payload)
        return response.data
    },

    async update(id: string, payload: PortalEventWriteRequest): Promise<PortalEventDto> {
        const response = await RequestHttp.put<PortalEventDto>(`/events/${id}`, payload)
        return response.data
    },

    async remove(id: string): Promise<void> {
        await RequestHttp.delete(`/events/${id}`)
    },
}
