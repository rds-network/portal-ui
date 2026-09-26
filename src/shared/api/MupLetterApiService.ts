import { RequestHttp } from "src/shared/http/RequestHttp"

export type MupLetterReason = "NON_COMPLIANCE" | "VOLUNTEER_REQUEST"

export type MupLetterDraft = {
    username: string
    fullName: string
    passport: string
    birthDate: string
    address: string
    phone: string
    email: string
    to: string
    subject: string
    body: string
    reason?: MupLetterReason
}

export type MupLetterDto = {
    id: string
    createTime: string
    status: string
    to: string[]
    subject: string
    body: string
    deactivated?: boolean
}

const alive = (status: number) => status === 200 || status === 404 || status >= 500

export const MupLetterApiService = {
    async draft(username: string, reason: MupLetterReason = "NON_COMPLIANCE"): Promise<MupLetterDraft | null> {
        const response = await RequestHttp.get<MupLetterDraft>(`/mup-letters/draft/${encodeURIComponent(username)}`, {
            params: { reason },
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async send(payload: {
        username: string
        to?: string
        subject: string
        body: string
        reason?: MupLetterReason
    }): Promise<MupLetterDto> {
        const response = await RequestHttp.post<MupLetterDto>("/mup-letters", payload)
        return response.data
    },

    async list(): Promise<MupLetterDto[]> {
        const response = await RequestHttp.get<MupLetterDto[]>("/mup-letters", { validateStatus: alive })
        if (response.status !== 200) return []
        return response.data ?? []
    },
}
