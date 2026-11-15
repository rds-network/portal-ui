import { RequestHttp } from "src/shared/http/RequestHttp"
import type { MissionVisualType } from "src/shared/missions/missionVisuals"

export type PointMissionDto = {
    id: string
    title: string
    description?: string | null
    points: number
    link?: string | null
    active: boolean
    oneTime: boolean
    sortOrder: number
    visualType?: MissionVisualType | string
    visualKey?: string | null
    imageUrl?: string | null
    requiresReview?: boolean
    proofLabel?: string | null
    claimed?: boolean
    submissionStatus?: string | null
    proofText?: string | null
    rejectReason?: string | null
}

export type PointMissionWriteRequest = {
    title: string
    description?: string | null
    points: number
    link?: string | null
    active: boolean
    oneTime: boolean
    sortOrder: number
    visualType: MissionVisualType
    visualKey?: string | null
    imageUrl?: string | null
    requiresReview: boolean
    proofLabel?: string | null
}

export type PointMissionClaimResult = {
    missionId: string
    points: number
    balance: number
    alreadyClaimed: boolean
    submissionStatus?: string | null
}

export type PointMissionSubmissionDto = {
    id: string
    missionId: string
    missionTitle: string
    points: number
    username: string
    proofText: string
    status: string
    rejectReason?: string | null
    reviewedBy?: string | null
    reviewedAt?: string | null
    createdAt: string
}

export type PointMissionAwardDto = {
    id: string
    username: string
    missionId?: string | null
    missionTitle: string
    points: number
    proofText?: string | null
    reviewedBy?: string | null
    awardedAt: string
    source: string
}

const alive = (status: number) => status === 200 || status === 204 || status === 404 || status >= 500

export const PointMissionApiService = {
    async listActive(): Promise<PointMissionDto[]> {
        const response = await RequestHttp.get<PointMissionDto[]>("/point-missions", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async claim(id: string): Promise<PointMissionClaimResult> {
        const response = await RequestHttp.post<PointMissionClaimResult>(`/point-missions/${id}/claim`)
        return response.data
    },

    async submit(id: string, proofText: string): Promise<PointMissionClaimResult> {
        const response = await RequestHttp.post<PointMissionClaimResult>(`/point-missions/${id}/submit`, {
            proofText,
        })
        return response.data
    },

    async adminList(): Promise<PointMissionDto[]> {
        const response = await RequestHttp.get<PointMissionDto[]>("/admin/point-missions", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async pendingSubmissions(): Promise<PointMissionSubmissionDto[]> {
        const response = await RequestHttp.get<PointMissionSubmissionDto[]>(
            "/admin/point-missions/submissions/pending",
            { validateStatus: alive }
        )
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async awardHistory(): Promise<PointMissionAwardDto[]> {
        const response = await RequestHttp.get<PointMissionAwardDto[]>("/admin/point-missions/awards", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async approveSubmission(id: string): Promise<PointMissionSubmissionDto> {
        const response = await RequestHttp.post<PointMissionSubmissionDto>(
            `/admin/point-missions/submissions/${id}/approve`
        )
        return response.data
    },

    async rejectSubmission(id: string, reason?: string): Promise<PointMissionSubmissionDto> {
        const response = await RequestHttp.post<PointMissionSubmissionDto>(
            `/admin/point-missions/submissions/${id}/reject`,
            { reason: reason || null }
        )
        return response.data
    },

    async create(payload: PointMissionWriteRequest): Promise<PointMissionDto> {
        const response = await RequestHttp.post<PointMissionDto>("/admin/point-missions", payload)
        return response.data
    },

    async update(id: string, payload: PointMissionWriteRequest): Promise<PointMissionDto> {
        const response = await RequestHttp.patch<PointMissionDto>(`/admin/point-missions/${id}`, payload)
        return response.data
    },

    async remove(id: string): Promise<void> {
        await RequestHttp.delete(`/admin/point-missions/${id}`)
    },
}
