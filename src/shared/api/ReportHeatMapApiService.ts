import { ReportHeatMapApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const ReportHeatMapApiService = new ReportHeatMapApi(undefined, undefined, RequestHttp)
