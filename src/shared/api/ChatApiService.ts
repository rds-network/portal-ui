import { RequestHttp } from "src/shared/http/RequestHttp"

export type ChatRoomDto = {
    id: string
    type: "GENERAL" | "PROGRAM" | string
    title: string
    programCode?: string | null
    programNameRu?: string | null
    programNameEn?: string | null
    programNameSr?: string | null
    createdAt: string
}

export type ChatRoomsResponse = {
    rooms: ChatRoomDto[]
    canSeeAll: boolean
    canCreateProgramRoom: boolean
}

export type ChatMessageDto = {
    id: string
    roomId: string
    authorUsername: string
    authorFullName?: string | null
    body: string
    imageUrl?: string | null
    createdAt: string
    mine: boolean
}

export type ChatMemberDto = {
    username: string
    fullName: string
    programCode?: string | null
    lastSeenAt?: string | null
    online?: boolean
    seenLabel?: string | null
}

const alive = (status: number) =>
    status === 200 || status === 201 || status === 204 || status === 404 || status >= 500

export const ChatApiService = {
    async listRooms(): Promise<ChatRoomsResponse> {
        const response = await RequestHttp.get<ChatRoomsResponse>("/chat/rooms", { validateStatus: alive })
        if (response.status !== 200) return { rooms: [], canSeeAll: false, canCreateProgramRoom: false }
        return response.data ?? { rooms: [], canSeeAll: false, canCreateProgramRoom: false }
    },

    async createProgramRoom(payload: { programCode: string; title?: string }): Promise<ChatRoomDto> {
        const response = await RequestHttp.post<ChatRoomDto>("/chat/rooms", payload)
        return response.data
    },

    async listMessages(roomId: string, afterId?: string | null, limit = 80): Promise<ChatMessageDto[]> {
        const response = await RequestHttp.get<ChatMessageDto[]>(`/chat/rooms/${roomId}/messages`, {
            params: { afterId: afterId || undefined, limit },
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async sendMessage(
        roomId: string,
        payload: { body?: string; imageUrl?: string | null }
    ): Promise<ChatMessageDto> {
        const response = await RequestHttp.post<ChatMessageDto>(`/chat/rooms/${roomId}/messages`, {
            body: payload.body ?? "",
            imageUrl: payload.imageUrl || undefined,
        })
        return response.data
    },

    async listMembers(roomId: string): Promise<ChatMemberDto[]> {
        const response = await RequestHttp.get<ChatMemberDto[]>(`/chat/rooms/${roomId}/members`, {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async presence(): Promise<void> {
        await RequestHttp.post("/chat/presence", null, { validateStatus: alive })
    },

    async unreadCount(): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>("/chat/unread", { validateStatus: alive })
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },

    async markRead(roomId: string): Promise<void> {
        await RequestHttp.post(`/chat/rooms/${roomId}/read`, null, { validateStatus: alive })
    },
}
