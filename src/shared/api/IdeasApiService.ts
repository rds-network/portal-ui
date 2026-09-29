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
        const response = await RequestHttp.get<TalentPostsPage>("/talent/posts", {
            params: {
                type: params.type,
                q: params.q || undefined,
                city: params.city || undefined,
                programCode: params.programCode || undefined,
                page: params.page ?? 0,
                size: params.size ?? 20,
            },
            validateStatus: alive,
        })
        if (response.status !== 200) {
            return { content: [], totalElements: 0, totalPages: 0, number: 0, size: params.size ?? 20 }
        }
        return response.data
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
}
