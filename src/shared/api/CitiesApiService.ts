import { CitiesApi } from "@rds-network/portal-api-axios"
import { PublicRequestHttp } from "src/shared/http/PublicRequestHttp"

export const CitiesApiService = new CitiesApi(undefined, undefined, PublicRequestHttp)
