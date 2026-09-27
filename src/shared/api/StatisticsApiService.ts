import { StatisticsApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const StatisticsApiService = new StatisticsApi(undefined, undefined, RequestHttp)

