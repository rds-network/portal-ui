import { RequestHttp } from "src/shared/http/RequestHttp"

export type WorkAssignmentStatus = "TODO" | "DOING" | "REVIEW" | "REDO" | "DONE"

export type WorkAssignmentDto = {
    id: string
    createTime: string
    createdBy: string
    title: string
    body?: string | null
    assignee?: string | null
    assigneeName?: string | null
    status: WorkAssignmentStatus | string
    dueDate?: string | null
    reportId?: string | null
}

export type WorkAssignmentCreateRequest = {
    title: string
    body?: string | null
    assignee?: string | null
    dueDate?: string | null
}

export type WorkAssignmentPatchRequest = {
    title?: string | null
    body?: string | null
    assignee?: string | null
    status?: string | null
    dueDate?: string | null
}

const alive = (status: number) => status === 200 || status === 201 || status === 404 || status >= 500

export const WorkAssignmentApiService = {
    async list(): Promise<WorkAssignmentDto[]> {
        const response = await RequestHttp.get<WorkAssignmentDto[]>("/work-assignments", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },

    async create(payload: WorkAssignmentCreateRequest): Promise<WorkAssignmentDto> {
        const response = await RequestHttp.post<WorkAssignmentDto>("/work-assignments", payload, {
            validateStatus: (status) => status === 200 || status === 201 || status === 404,
        })
        if (response.status === 404) throw new Error("API задач ещё не на сервере")
        return response.data
    },

    async patch(id: string, payload: WorkAssignmentPatchRequest): Promise<WorkAssignmentDto> {
        const response = await RequestHttp.patch<WorkAssignmentDto>(`/work-assignments/${id}`, payload, {
            validateStatus: (status) => status === 200 || status === 404,
        })
        if (response.status === 404) throw new Error("API задач ещё не на сервере")
        return response.data
    },
}
