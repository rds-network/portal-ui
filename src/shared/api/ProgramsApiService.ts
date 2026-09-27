import { ProgramsApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const ProgramsApiService = new ProgramsApi(undefined, undefined, RequestHttp)
