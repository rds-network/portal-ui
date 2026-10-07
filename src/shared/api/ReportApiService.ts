import { ReportApi, ReportDto } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const ReportApiService = new ReportApi(undefined, undefined, RequestHttp)

export type ReportAssignmentRequest = {
    programCode: string | null
    projectCode: string | null
}

/**
 * Не входит в сгенерированный клиент. Правка программы и проекта не меняет статус отчёта,
 * поэтому программу можно починить и у уже принятого отчёта.
 */
export const updateReportAssignment = async (id: string, payload: ReportAssignmentRequest): Promise<ReportDto> => {
    const response = await RequestHttp.patch<ReportDto>(`/report/${id}/assignment`, payload)
    return response.data
}

/** Приёмка/отклонение с опциональной благодарностью (поля gratitude / managerGratitude). */
export type ChangeReportStatusPayload = {
    status: string
    note?: string | null
    gratitude?: boolean
    managerGratitude?: boolean
}

export const changeReportStatus = async (id: string, payload: ChangeReportStatusPayload): Promise<void> => {
    await RequestHttp.post(`/report/${id}/status`, payload)
}

export type ReportCustomerAcceptanceDto = {
    customer: string
    customerName?: string | null
    status?: string | null
    decidedBy?: string | null
    decidedAt?: string | null
}

export type ReportCustomerAcceptancesResponse = {
    reportId: string
    multiCustomer: boolean
    pendingForMe: boolean
    acceptances: ReportCustomerAcceptanceDto[]
}

/** Приёмка по заказчикам: несколько кураторов в одном отчёте. */
export const getReportCustomerAcceptances = async (
    id: string
): Promise<ReportCustomerAcceptancesResponse> => {
    const response = await RequestHttp.get<ReportCustomerAcceptancesResponse>(
        `/report/${id}/customer-acceptances`
    )
    return (
        response.data ?? {
            reportId: id,
            multiCustomer: false,
            pendingForMe: false,
            acceptances: [],
        }
    )
}
