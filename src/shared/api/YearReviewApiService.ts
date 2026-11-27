import { RequestHttp } from "src/shared/http/RequestHttp"

export type YearReviewStatsDto = {
    year: number
    displayName: string
    username: string
    programCode?: string | null
    programNameRu?: string | null
    programNameEn?: string | null
    programNameSr?: string | null
    activeWeeks: number
    longestStreak: number
    earnedPoints: number
    acceptedReports: number
    completedTasks: number
    badgesEarned: number
    currentRank: number | null
    bestRank: number | null
    totalParticipants: number
    curatorGratitudes: number
    managerGratitudes: number
    isPodium: boolean
    isTeamBuilder?: boolean
    directionsCount?: number
    delegatesCount?: number
    reportsReviewed?: number
    peopleHelped?: number
    ideasCreated?: number
    responsesReceived?: number
    responsesSent?: number
    teamsJoined?: number
    missedWeeks?: number
    irregularReporting?: boolean
}

export type YearReviewCriterionProgressDto = {
    id: string
    met: boolean
    current: number
    required: number
}

export type YearReviewEligibilityDto = {
    eligible: boolean
    criteriaMet: number
    criteriaRequired: number
    reasons: string[]
    progress: YearReviewCriterionProgressDto[]
    remainingHint: string | null
}

export type AnnualCertificateDto = {
    id: string
    year: number
    certificateNumber: string
    verificationToken: string
    status: string
    issueSource: string
    qualificationReasons: string[]
    recipientFullName: string | null
    templateVersion: string
    issuedAt: string
    pdfFileId: string | null
}

export type YearReviewDto = {
    year: number
    ready: boolean
    stats: YearReviewStatsDto
    eligibility: YearReviewEligibilityDto
    certificate: AnnualCertificateDto | null
    specialThanks: string[]
}

export type AnnualCertificateVerifyDto = {
    valid: boolean
    status: string
    recipientFullName: string | null
    documentTitle: string
    year: number
    certificateNumber: string
    issuedAt: string
    organization: string
}

const alive = (status: number) => status === 200 || status === 404 || status >= 500

export const YearReviewApiService = {
    async get(year: number): Promise<YearReviewDto | null> {
        const response = await RequestHttp.get<YearReviewDto>(`/me/year-review/${year}`, {
            validateStatus: alive,
        })
        if (response.status !== 200) return null
        return response.data ?? null
    },

    async issueCertificate(year: number): Promise<AnnualCertificateDto> {
        const response = await RequestHttp.post<AnnualCertificateDto>(`/me/year-review/${year}/certificate`)
        return response.data
    },

    async attachPdf(id: string, fileId: string): Promise<AnnualCertificateDto> {
        const response = await RequestHttp.post<AnnualCertificateDto>(`/me/year-review/certificates/${id}/pdf`, {
            fileId,
        })
        return response.data
    },

    async myDocuments(): Promise<AnnualCertificateDto[]> {
        const response = await RequestHttp.get<AnnualCertificateDto[]>("/me/documents", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async verify(token: string): Promise<AnnualCertificateVerifyDto | null> {
        const response = await RequestHttp.get<AnnualCertificateVerifyDto>(
            `/verify/certificate/${encodeURIComponent(token)}`,
            { validateStatus: alive }
        )
        if (response.status !== 200) return null
        return response.data ?? null
    },
}

export const yearReviewDefaultYear = () => {
    const now = new Date()
    return now.getMonth() >= 10 ? now.getFullYear() : now.getFullYear() - 1
}
