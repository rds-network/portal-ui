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
    counterpartName?: string | null
    heatmapUser?: string | null
    reportId?: string | null
    recipient?: string | null
    recipientName?: string | null
    recipientLastSeen?: string | null
    receivedAt?: string | null
    ackRequired?: boolean
    needsAck?: boolean
    messageCount?: number
    lastAuthor?: string | null
    lastAuthorName?: string | null
    lastMessageTime?: string | null
    hasReply?: boolean
}

export type InboxMessageDto = {
    id: string
    author?: string | null
    authorName?: string | null
    body: string
    createTime: string
}

export type InboxThreadDetailDto = {
    id: string
    subject: string
    kind: string
    createdBy?: string | null
    createdByName?: string | null
    heatmapUser?: string | null
    reportId?: string | null
    recipient?: string | null
    recipientName?: string | null
    recipientLastSeen?: string | null
    receivedAt?: string | null
    ackRequired?: boolean
    needsAck?: boolean
    messages: InboxMessageDto[]
}

export type OverdueWeekDto = {
    weekStart: string
    hoursWorked: number
    hoursRequired: number
    leaveDays?: number
}

export type ReportOverdueDto = {
    username: string
    fullName: string
    program?: string | null
    weeksMissed: number
    hoursShort?: number
    hoursWorked?: number
    hoursRequired?: number
    contractEnd?: string | null
    recentWeeks?: OverdueWeekDto[]
    level: string
    lastReportWeek?: string | null
    warningCount?: number
    notified?: boolean
    watchlist?: boolean
    subject?: string | null
    body?: string | null
}

export type OverdueNoticePersonDto = {
    username: string
    fullName: string
    program?: string | null
    warningCount: number
    lastSentAt?: string | null
    notified: boolean
    watchlist: boolean
    mupSent: boolean
}

export type OverdueNotifyResultDto = {
    sent: number
    recipients: OverdueNoticePersonDto[]
}

export type OverduePreviewDto = {
    count: number
    templates: { level: string; subject: string; body: string }[]
    samples: ReportOverdueDto[]
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

    async pendingAckCount(): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>("/inbox/pending-ack", { validateStatus: alive })
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },

    async ack(id: string): Promise<InboxThreadDetailDto> {
        const response = await RequestHttp.post<InboxThreadDetailDto>(`/inbox/${id}/ack`)
        return response.data
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

    async delete(id: string): Promise<void> {
        await RequestHttp.delete(`/inbox/${id}`)
    },

    async overdue(): Promise<ReportOverdueDto[]> {
        const response = await RequestHttp.get<ReportOverdueDto[]>("/report-overdue", { validateStatus: alive })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async overduePreview(): Promise<OverduePreviewDto> {
        const response = await RequestHttp.get<OverduePreviewDto>("/report-overdue/preview", { validateStatus: alive })
        if (response.status !== 200) return { count: 0, templates: [], samples: [] }
        return response.data ?? { count: 0, templates: [], samples: [] }
    },

    async createPersonalAnnouncement(payload: { title: string; body: string; username: string }) {
        const response = await RequestHttp.post("/announcements/personal", payload)
        return response.data
    },

    async overdueWarnings(username: string): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>(
            `/report-overdue/warnings/${encodeURIComponent(username)}`,
            { validateStatus: alive }
        )
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },

    async overdueCounts(usernames: string[] = []): Promise<Record<string, number>> {
        const params = usernames.length ? { usernames } : undefined
        const response = await RequestHttp.get<Record<string, number>>("/report-overdue/counts", {
            params,
            validateStatus: alive,
        })
        if (response.status !== 200) return {}
        return response.data ?? {}
    },

    async notifyOverdue(exclude: string[] = []): Promise<OverdueNotifyResultDto> {
        const response = await RequestHttp.post<OverdueNotifyResultDto>(
            "/report-overdue/notify",
            { exclude },
            { validateStatus: alive }
        )
        if (response.status !== 200) return { sent: 0, recipients: [] }
        return response.data ?? { sent: 0, recipients: [] }
    },

    async overdueNotices(): Promise<OverdueNoticePersonDto[]> {
        const response = await RequestHttp.get<OverdueNoticePersonDto[]>("/report-overdue/notices", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async cancelOverdueWarning(
        username: string,
        payload: { all?: boolean; reason?: string } = {}
    ): Promise<OverdueNoticePersonDto> {
        const response = await RequestHttp.post<OverdueNoticePersonDto>(
            `/report-overdue/warnings/${encodeURIComponent(username)}/cancel`,
            payload
        )
        return response.data
    },
}
