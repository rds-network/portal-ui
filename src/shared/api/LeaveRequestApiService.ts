import { RequestHttp } from "src/shared/http/RequestHttp"

export type LeaveRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED"

export type LeaveRequestDto = {
    id: string
    username: string
    fullName?: string | null
    programCode?: string | null
    startDate: string
    endDate: string
    status: LeaveRequestStatus
    reason?: string | null
    createdAt: string
    decidedAt?: string | null
    decidedBy?: string | null
}

export type LeaveRequestCreateRequest = {
    startDate: string
    endDate: string
    reason?: string | null
    username?: string | null
}

export type LeaveRequestRejectRequest = {
    reason?: string | null
}

export type LeaveRequestMetaDto = {
    approverUsername: string
    isLeaveApprover: boolean
}

const alive = (status: number) => status === 200 || status === 201 || status === 404 || status >= 500

export const LeaveRequestApiService = {
    async meta(): Promise<LeaveRequestMetaDto | null> {
        const response = await RequestHttp.get<LeaveRequestMetaDto>("/leave-requests/meta", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data ?? null
    },

    async create(payload: LeaveRequestCreateRequest): Promise<LeaveRequestDto> {
        const response = await RequestHttp.post<LeaveRequestDto>("/leave-requests", payload, {
            validateStatus: (status) => status === 200 || status === 201 || status === 404,
        })
        if (response.status === 404) throw new Error("API отпуска ещё не на сервере")
        return response.data
    },

    async mine(): Promise<LeaveRequestDto[]> {
        const response = await RequestHttp.get<LeaveRequestDto[]>("/leave-requests/mine", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async pending(): Promise<LeaveRequestDto[]> {
        const response = await RequestHttp.get<LeaveRequestDto[]>("/leave-requests/pending", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    /** Решённые заявки: после согласования отпуск уходит из [pending], но согласующему нужно его помнить. */
    async history(): Promise<LeaveRequestDto[]> {
        const response = await RequestHttp.get<LeaveRequestDto[]>("/leave-requests/history", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async accept(id: string): Promise<LeaveRequestDto> {
        const response = await RequestHttp.post<LeaveRequestDto>(`/leave-requests/${id}/accept`)
        return response.data
    },

    async reject(id: string, payload?: LeaveRequestRejectRequest): Promise<LeaveRequestDto> {
        const response = await RequestHttp.post<LeaveRequestDto>(`/leave-requests/${id}/reject`, payload ?? {})
        return response.data
    },
}
