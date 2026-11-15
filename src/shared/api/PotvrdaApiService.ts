import { RequestHttp } from "src/shared/http/RequestHttp"

export type PotvrdaKind = "OFFICIAL" | "MEMBERSHIP"

export type PotvrdaIssueDto = {
    id: string
    confirmNumber: string
    registryYear: number
    sequenceNumber: number
    kind: PotvrdaKind
    volunteerUsername: string
    volunteerFullName: string
    issueDate: string
    periodFrom?: string | null
    periodTo?: string | null
    totalHours?: number | null
    programCode?: string | null
    servicesDescription?: string | null
    createTime: string
    issuedBy: string
}

export type PotvrdaNextNumberDto = {
    confirmNumber: string
    registryYear: number
    sequenceNumber: number
}

export type PotvrdaIssueCreateRequest = {
    kind: PotvrdaKind
    volunteerUsername: string
    volunteerFullName: string
    issueDate: string
    periodFrom?: string | null
    periodTo?: string | null
    totalHours?: number | null
    programCode?: string | null
    servicesDescription?: string | null
}

export type PotvrdaIssuePageResponse = {
    page: {
        pageNumber?: number
        pageSize?: number
        totalPages?: number
        totalElements?: number
    }
    content: PotvrdaIssueDto[]
}

const alive = (status: number) => status === 200 || status === 201

export const PotvrdaApiService = {
    async nextNumber(year?: number): Promise<PotvrdaNextNumberDto> {
        const response = await RequestHttp.get<PotvrdaNextNumberDto>("/potvrda/next-number", {
            params: year != null ? { year } : undefined,
            validateStatus: alive,
        })
        return response.data
    },

    async list(pageNumber = 0, pageSize = 50, search?: string): Promise<PotvrdaIssuePageResponse> {
        const response = await RequestHttp.get<PotvrdaIssuePageResponse>("/potvrda/issues", {
            params: { pageNumber, pageSize, search: search?.trim() || undefined },
            validateStatus: alive,
        })
        return response.data
    },

    async create(payload: PotvrdaIssueCreateRequest): Promise<PotvrdaIssueDto> {
        const response = await RequestHttp.post<PotvrdaIssueDto>("/potvrda/issues", payload)
        return response.data
    },
}
