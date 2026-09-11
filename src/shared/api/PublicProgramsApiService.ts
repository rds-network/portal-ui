import { ProgramsApi } from "@rds-network/portal-api-axios"
import { PublicRequestHttp } from "src/shared/http/PublicRequestHttp"

export const PublicProgramsApiService = new ProgramsApi(undefined, undefined, PublicRequestHttp)
