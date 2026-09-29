import { RequestHttp } from "src/shared/http/RequestHttp"

export type TalentPostType = "NEED_PEOPLE" | "CAN_HELP" | "PROJECT_IDEA"
export type TalentPostStatus = "OPEN" | "CLOSED"

export type TalentPostDto = {
    id: string
    type: TalentPostType
    status: TalentPostStatus
    title: string
    body: string
    city?: string | null
    programCode?: string | null
    programNameRu?: string | null
    skills: string[]
    authorUsername: string
    authorFullName?: string | null
    createdAt: string
    updatedAt: string
    responseCount: number
    responderUsernames?: string[]
    mine?: boolean
    alreadyResponded?: boolean
}

export type TalentPostCreateRequest = {
    type: TalentPostType
    title: string
    body: string
    city?: string | null
    programCode?: string | null
    skills?: string[]
}

export type TalentResponseDto = {
    id: string
    postId: string
    authorUsername: string
    authorFullName?: string | null
    message: string
    createdAt: string
}

export type TalentResponseCreateRequest = {
    message: string
}

export type TalentSkillsDto = {
    skills: string[]
}

export type TalentPostsPage = {
    content: TalentPostDto[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}

const alive = (status: number) => status === 200 || status === 201 || status === 404 || status >= 500

export const IdeasApiService = {
    async listPosts(params: {
        type?: TalentPostType
        q?: string
        city?: string
        programCode?: string
        page?: number
        size?: number
    }): Promise<TalentPostsPage> {
        const response = await RequestHttp.get<TalentPostsPage & { content?: TalentPostDto[] }>(
            "/talent/posts",
            {
                params: {
                    type: params.type,
                    q: params.q || undefined,
                    city: params.city || undefined,
                    programCode: params.programCode || undefined,
                    page: params.page ?? 0,
                    size: params.size ?? 20,
                },
            }
        )
        const data = response.data
        const content = Array.isArray(data?.content) ? data.content : []
        return {
            content,
            totalElements: data?.totalElements ?? content.length,
            totalPages: data?.totalPages ?? 1,
            number: data?.number ?? 0,
            size: data?.size ?? params.size ?? 20,
        }
    },

    async createPost(payload: TalentPostCreateRequest): Promise<TalentPostDto> {
        const response = await RequestHttp.post<TalentPostDto>("/talent/posts", payload, {
            validateStatus: (status) => status === 200 || status === 201 || status === 404,
        })
        if (response.status === 404) throw new Error("API идей ещё не на сервере")
        return response.data
    },

    async getPost(id: string): Promise<TalentPostDto | null> {
        const response = await RequestHttp.get<TalentPostDto>(`/talent/posts/${id}`, {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data
    },

    async closePost(id: string): Promise<TalentPostDto> {
        const response = await RequestHttp.post<TalentPostDto>(`/talent/posts/${id}/close`)
        return response.data
    },

    async createResponse(id: string, payload: TalentResponseCreateRequest): Promise<TalentResponseDto> {
        const response = await RequestHttp.post<TalentResponseDto>(`/talent/posts/${id}/responses`, payload)
        return response.data
    },

    async listResponses(id: string): Promise<TalentResponseDto[]> {
        const response = await RequestHttp.get<TalentResponseDto[]>(`/talent/posts/${id}/responses`, {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async getMySkills(): Promise<string[]> {
        const response = await RequestHttp.get<TalentSkillsDto>("/talent/me/skills", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data?.skills ?? []
    },

    async putMySkills(skills: string[]): Promise<string[]> {
        const response = await RequestHttp.put<TalentSkillsDto>("/talent/me/skills", { skills })
        return response.data?.skills ?? []
    },

    /** Nav badge: new open posts by others + responses on my posts since last visit. */
    async unreadCount(since?: string | null): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>("/talent/unread-count", {
            params: since ? { since } : undefined,
            validateStatus: alive,
        })
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },
}

const IDEAS_LAST_SEEN_KEY = "portal.ideas.lastSeen"

export const IdeasBadge = {
    getLastSeen(): string | null {
        try {
            return localStorage.getItem(IDEAS_LAST_SEEN_KEY)
        } catch {
            return null
        }
    },
    markSeen(at: string = new Date().toISOString()) {
        try {
            localStorage.setItem(IDEAS_LAST_SEEN_KEY, at)
        } catch {
            /* ignore */
        }
    },
}
