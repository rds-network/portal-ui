import { RequestHttp } from "src/shared/http/RequestHttp"

export type OrgLinkDto = {
    id: string
    createTime: string
    createdBy: string
    title: string
    url: string
    description?: string | null
    sortOrder: number
}

export type OrgLinkWriteRequest = {
    title: string
    url: string
    description?: string | null
    sortOrder?: number | null
}

const alive = (status: number) => status === 200 || status === 201 || status === 204 || status === 404 || status >= 500

export const OrgLinkApiService = {
    async list(): Promise<OrgLinkDto[]> {
        const response = await RequestHttp.get<OrgLinkDto[]>("/org-links", { validateStatus: alive })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async create(payload: OrgLinkWriteRequest): Promise<OrgLinkDto> {
        const response = await RequestHttp.post<OrgLinkDto>("/org-links", payload)
        return response.data
    },

    async update(id: string, payload: OrgLinkWriteRequest): Promise<OrgLinkDto> {
        const response = await RequestHttp.patch<OrgLinkDto>(`/org-links/${id}`, payload)
        return response.data
    },

    async remove(id: string): Promise<void> {
        await RequestHttp.delete(`/org-links/${id}`)
    },

    async newCount(since?: string | null): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>("/org-links/new-count", {
            params: since ? { since } : undefined,
            validateStatus: alive,
        })
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },
}

const RESOURCES_LAST_SEEN_KEY = "portal.resources.lastSeen"

export const ResourcesBadge = {
    getLastSeen(): string | null {
        try {
            return localStorage.getItem(RESOURCES_LAST_SEEN_KEY)
        } catch {
            return null
        }
    },
    markSeen(at: string = new Date().toISOString()) {
        try {
            localStorage.setItem(RESOURCES_LAST_SEEN_KEY, at)
        } catch {
            /* ignore */
        }
    },
}
