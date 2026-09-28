import { RequestHttp } from "src/shared/http/RequestHttp"

export type DissolutionRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED"

export type DissolutionRequestDto = {
    id: string
    username: string
    fullName?: string | null
    programCode?: string | null
    fromDate: string
    status: DissolutionRequestStatus
    reason?: string | null
    createdAt: string
    decidedAt?: string | null
    decidedBy?: string | null
    decisionReason?: string | null
    mupLetterSentAt?: string | null
}

export type DissolutionRequestCreateRequest = {
    fromDate: string
    reason?: string | null
    username?: string | null
}

export type DissolutionRequestRejectRequest = {
    reason?: string | null
}

export type DissolutionRequestMetaDto = {
    approverUsername: string
    isDissolutionApprover: boolean
}

const alive = (status: number) => status === 200 || status === 201 || status === 404 || status >= 500

export const DissolutionRequestApiService = {
    async meta(): Promise<DissolutionRequestMetaDto | null> {
        const response = await RequestHttp.get<DissolutionRequestMetaDto>("/dissolution-requests/meta", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data ?? null
    },

    async create(payload: DissolutionRequestCreateRequest): Promise<DissolutionRequestDto> {
        const response = await RequestHttp.post<DissolutionRequestDto>("/dissolution-requests", payload, {
            validateStatus: (status) => status === 200 || status === 201 || status === 404,
        })
        if (response.status === 404) throw new Error("API заявлений на расторжение ещё не на сервере")
        return response.data
    },

    async mine(): Promise<DissolutionRequestDto[]> {
        const response = await RequestHttp.get<DissolutionRequestDto[]>("/dissolution-requests/mine", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async pending(): Promise<DissolutionRequestDto[]> {
        const response = await RequestHttp.get<DissolutionRequestDto[]>("/dissolution-requests/pending", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async history(): Promise<DissolutionRequestDto[]> {
        const response = await RequestHttp.get<DissolutionRequestDto[]>("/dissolution-requests/history", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async accept(id: string): Promise<DissolutionRequestDto> {
        const response = await RequestHttp.post<DissolutionRequestDto>(`/dissolution-requests/${id}/accept`)
        return response.data
    },

    async reject(id: string, payload?: DissolutionRequestRejectRequest): Promise<DissolutionRequestDto> {
        const response = await RequestHttp.post<DissolutionRequestDto>(
            `/dissolution-requests/${id}/reject`,
            payload ?? {}
        )
        return response.data
    },

    async cancel(id: string): Promise<DissolutionRequestDto> {
        const response = await RequestHttp.post<DissolutionRequestDto>(`/dissolution-requests/${id}/cancel`)
        return response.data
    },
}
