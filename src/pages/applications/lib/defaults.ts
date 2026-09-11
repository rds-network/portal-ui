import { ApplicationsFilter, PageRequest, PageResponse } from "@rds-network/portal-api-axios"

export const UNASSIGNED_ASSIGNEE = "__unassigned__"

export const defaultPage: PageRequest = {
    pageNumber: 0,
    pageSize: 20,
    sort: ["created;desc"],
}

export const defaultPageResponse: PageResponse = {
    pageNumber: 0,
    pageSize: 20,
    totalPages: 1,
    totalElements: 0,
}

export const defaultFilter: ApplicationsFilter = {
    showCompleted: false,
}
