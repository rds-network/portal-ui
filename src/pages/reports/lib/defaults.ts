import { PageRequest, PageResponse, ReportFilter, UserInfoDto } from "@rds-network/portal-api-axios"

export const defaultPage: PageRequest = {
    pageNumber: 0,
    pageSize: 10,
    sort: ["createTime;desc"],
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
