import { RequestHttp } from "src/shared/http/RequestHttp"

export type AccountStatusRequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export type AccountStatusEventSource = "REQUEST" | "DIRECT" | "SCHEDULER" | "SYNC"

export type AccountStatusMetaDto = {
    approverUsername: string
    isAccountStatusApprover: boolean
}

export type AccountStatusRequestDto = {
    id: string
    targetAccountId: number
    targetUsername: string
    targetFullName?: string | null
    requestedActive: boolean
    status: AccountStatusRequestStatus
    reason?: string | null
    createdBy: string
    createdAt: string
    decidedBy?: string | null
    decidedAt?: string | null
    decisionReason?: string | null
}

export type AccountStatusEventDto = {
    id: string
    accountId: number
    accountUsername: string
    accountFullName?: string | null
    activeTo: boolean
    source: AccountStatusEventSource
    actorUsername?: string | null
    reason?: string | null
    createdAt: string
    requestId?: string | null
}

export type AccountStatusChangeResultDto = {
    pending: boolean
    request?: AccountStatusRequestDto | null
    accountId: number
    username: string
    active: boolean
}

export type AccountStatusCreateRequest = {
    accountId: number
    requestedActive: boolean
    reason?: string | null
}

export type AccountStatusDecisionRequest = {
    reason?: string | null
}

const alive = (status: number) => status === 200 || status === 201 || status === 202 || status === 404 || status >= 500

export const AccountStatusApiService = {
    async meta(): Promise<AccountStatusMetaDto | null> {
        const response = await RequestHttp.get<AccountStatusMetaDto>("/user/account-status/meta", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async request(payload: AccountStatusCreateRequest): Promise<AccountStatusChangeResultDto> {
        const response = await RequestHttp.post<AccountStatusChangeResultDto>("/user/account-status/request", payload, {
            validateStatus: (status) => status === 200 || status === 201 || status === 202 || status === 404,
        })
        if (response.status === 404) throw new Error("API активаций ещё не на сервере")
        return response.data
    },

    async pending(): Promise<AccountStatusRequestDto[]> {
        const response = await RequestHttp.get<AccountStatusRequestDto[]>("/user/account-status/pending", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async events(): Promise<AccountStatusEventDto[]> {
        const response = await RequestHttp.get<AccountStatusEventDto[]>("/user/account-status/events", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async approve(id: string, payload?: AccountStatusDecisionRequest): Promise<AccountStatusRequestDto> {
        const response = await RequestHttp.post<AccountStatusRequestDto>(
            `/user/account-status/${id}/approve`,
            payload ?? {}
        )
        return response.data
    },

    async reject(id: string, payload?: AccountStatusDecisionRequest): Promise<AccountStatusRequestDto> {
        const response = await RequestHttp.post<AccountStatusRequestDto>(
            `/user/account-status/${id}/reject`,
            payload ?? {}
        )
        return response.data
    },
}
