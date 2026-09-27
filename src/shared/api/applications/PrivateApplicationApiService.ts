import { ApplicationApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const PrivateApplicationApiService = new ApplicationApi(undefined, undefined, RequestHttp)
