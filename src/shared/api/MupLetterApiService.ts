import { RequestHttp } from "src/shared/http/RequestHttp"

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
    async draft(username: string): Promise<MupLetterDraft | null> {
        const response = await RequestHttp.get<MupLetterDraft>(`/mup-letters/draft/${encodeURIComponent(username)}`, {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async send(payload: { username: string; to?: string; subject: string; body: string }): Promise<MupLetterDto> {
        const response = await RequestHttp.post<MupLetterDto>("/mup-letters", payload)
        return response.data
    },

    async list(): Promise<MupLetterDto[]> {
        const response = await RequestHttp.get<MupLetterDto[]>("/mup-letters", { validateStatus: alive })
        if (response.status !== 200) return []
        return response.data ?? []
    },
}
