import { OfficialGroupApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const OfficialGroupApiService = new OfficialGroupApi(undefined, undefined, RequestHttp)
