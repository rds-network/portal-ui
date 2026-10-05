import { PageRequest, PageResponse, ReportFilter, UserInfoDto } from "@rds-network/portal-api-axios"

export const SORT_SUBMITTED = "submittedAt;desc"
export const SORT_ACCEPTED = "acceptedAt;desc"

export const defaultPage: PageRequest = {
    pageNumber: 0,
    pageSize: 10,
    sort: [SORT_SUBMITTED],
}

export const defaultPageResponse: PageResponse = {
    pageNumber: 0,
    pageSize: 10,
    totalPages: 1,
    totalElements: 0,
}

export const defaultFilter = (login: string | null = null): ReportFilter => {
    return {
        login: login ? login : null,
        dateFrom: null,
        dateTo: null,
        status: null,
        program: null,
    }
}

export const defaultUser = (username: string): UserInfoDto => {
    return {
        id: 0,
        username: username,
        email: "",
        fullName: "",
        groups: [],
        active: true,
    }
}
