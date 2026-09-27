import { RequestHttp } from "src/shared/http/RequestHttp"

export type ActivityEventDto = {
    id: number
    createTime: string
    username?: string | null
    ip?: string | null
    method: string
    path: string
    query?: string | null
    action: string
    link?: string | null
}

export type ActivityPageDto = {
    content: ActivityEventDto[]
    total: number
    page: number
    size: number
}

export type OnlinePersonDto = {
    username?: string | null
    displayName: string
    ip?: string | null
    path: string
    query?: string | null
    lastSeen: string
    self?: boolean
}

export type OnlinePresenceDto = {
    total: number
    loggedIn: number
    guests: number
    people: OnlinePersonDto[]
}

export type MetaVersionDto = {
    build: string
    sha: string
    builtAt?: string | null
}

export type UiBuildInfo = {
    build: string
    sha: string
}

const alive = (status: number) => status === 200 || status === 404 || status >= 500

export const ActivityApiService = {
    async list(params: { q?: string; sort?: string; dir?: string; page?: number; size?: number }): Promise<ActivityPageDto> {
        const response = await RequestHttp.get<ActivityPageDto>("/activity", {
            params,
            validateStatus: alive,
        })
        if (response.status !== 200) return { content: [], total: 0, page: 0, size: 50 }
        return response.data
    },

    async online(minutes = 10): Promise<OnlinePresenceDto> {
        const response = await RequestHttp.get<OnlinePresenceDto>("/activity/online", {
            params: { minutes },
            validateStatus: alive,
        })
        if (response.status !== 200) {
            return { total: 0, loggedIn: 0, guests: 0, people: [] }
        }
        return response.data
    },

    async apiVersion(): Promise<MetaVersionDto> {
        const response = await RequestHttp.get<MetaVersionDto>("/meta/version", {
            validateStatus: alive,
        })
        if (response.status !== 200) return { build: "—", sha: "—" }
        return response.data
    },

    async uiVersion(): Promise<UiBuildInfo> {
        try {
            const response = await fetch("/build-info.json", { cache: "no-store" })
            if (!response.ok) return { build: "local", sha: "dev" }
            const data = (await response.json()) as Partial<UiBuildInfo>
            return {
                build: data.build || "local",
                sha: (data.sha || "dev").slice(0, 7),
            }
        } catch {
            return { build: "local", sha: "dev" }
        }
    },
}
