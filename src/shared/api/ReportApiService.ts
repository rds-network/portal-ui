import { ReportApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const ReportApiService = new ReportApi(undefined, undefined, RequestHttp)
