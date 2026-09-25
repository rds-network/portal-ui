import { RequestHttp } from "src/shared/http/RequestHttp"

export type InboxThreadDto = {
    id: string
    createTime: string
    subject: string
    kind: string
    createdBy?: string | null
    unread: boolean
    lastBody?: string | null
    counterpart?: string | null
}

export type InboxMessageDto = {
    id: string
    author?: string | null
    body: string
    createTime: string
}

export type InboxThreadDetailDto = {
    id: string
    subject: string
    kind: string
    createdBy?: string | null
    messages: InboxMessageDto[]
}

export type ReportOverdueDto = {
    username: string
    fullName: string
    program?: string | null
    weeksMissed: number
    level: string
    lastReportWeek?: string | null
}

const alive = (status: number) => status === 200 || status === 201 || status === 404 || status >= 500

export const InboxApiService = {
    async list(): Promise<InboxThreadDto[]> {
        const response = await RequestHttp.get<InboxThreadDto[]>("/inbox", { validateStatus: alive })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async unreadCount(): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>("/inbox/unread-count", { validateStatus: alive })
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },

    async get(id: string): Promise<InboxThreadDetailDto | null> {
        const response = await RequestHttp.get<InboxThreadDetailDto>(`/inbox/${id}`, { validateStatus: alive })
        if (response.status !== 200) return null
        return response.data
    },

    async create(payload: { subject: string; body: string; recipients: string[] }): Promise<InboxThreadDto[]> {
        const response = await RequestHttp.post<InboxThreadDto[]>("/inbox", payload)
        return response.data ?? []
    },

    async reply(id: string, body: string): Promise<InboxThreadDetailDto> {
        const response = await RequestHttp.post<InboxThreadDetailDto>(`/inbox/${id}/reply`, { body })
        return response.data
    },

    async overdue(): Promise<ReportOverdueDto[]> {
        const response = await RequestHttp.get<ReportOverdueDto[]>("/report-overdue", { validateStatus: alive })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async notifyOverdue(): Promise<number> {
        const response = await RequestHttp.post<{ sent: number }>("/report-overdue/notify")
        return response.data?.sent ?? 0
    },
}
