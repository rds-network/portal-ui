import { ReportDto } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export type CustomerReportPageDto = {
    total: number
    page: number
    size: number
    content: ReportDto[]
}

const alive = (status: number) => status === 200 || status === 201 || status === 404 || status >= 500

export const CustomerReportApiService = {
    async list(status?: string | null, page = 0, size = 20): Promise<CustomerReportPageDto> {
        const response = await RequestHttp.get<CustomerReportPageDto>("/customer-reports", {
            params: { status: status || undefined, page, size },
            validateStatus: alive,
        })
        if (response.status !== 200) return { total: 0, page, size, content: [] }
        return response.data ?? { total: 0, page, size, content: [] }
    },

    async pendingCount(): Promise<number> {
        const response = await RequestHttp.get<{ count: number }>("/customer-reports/pending-count", {
            validateStatus: alive,
        })
        if (response.status !== 200) return 0
        return response.data?.count ?? 0
    },
}
