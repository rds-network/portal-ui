import { ApplicationApi } from "@rds-network/portal-api-axios"
import { PublicRequestHttp } from "src/shared/http/PublicRequestHttp"

export const PublicApplicationApiService = new ApplicationApi(undefined, undefined, PublicRequestHttp)
