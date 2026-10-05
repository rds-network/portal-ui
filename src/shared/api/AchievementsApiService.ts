import { RequestHttp } from "src/shared/http/RequestHttp"

export type AchievementDto = {
    id: string
    category: string
    title: string
    description: string
    points: number
    unlocked: boolean
    progress?: number | null
    target?: number | null
}

export type PointEventDto = {
    code: string
    points: number
    title?: string | null
    refId?: string | null
    createdAt: string
}

export type InboxDeliveryStatsDto = {
    sent: number
    delivered: number
    pending: number
}

export type AchievementsMeDto = {
    balance: number
    unlockedCount: number
    totalCount: number
    achievements: AchievementDto[]
    recent: PointEventDto[]
    inbox: InboxDeliveryStatsDto
    thisWeekVisited: boolean
}

export type PointLeaderDto = {
    rank: number
    username: string
    fullName: string
    points: number
    isMe?: boolean
}

export type AchievementsLeaderboardDto = {
    leaders: PointLeaderDto[]
    me: PointLeaderDto | null
    totalParticipants: number
}

const alive = (status: number) => status === 200 || status === 404 || status >= 500

export const AchievementsApiService = {
    async me(): Promise<AchievementsMeDto | null> {
        const response = await RequestHttp.get<AchievementsMeDto>("/achievements/me", {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data ?? null
    },

    async leaderboard(limit = 100): Promise<AchievementsLeaderboardDto | null> {
        const response = await RequestHttp.get<AchievementsLeaderboardDto>("/achievements/leaderboard", {
            params: { limit },
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data ?? null
    },
}
