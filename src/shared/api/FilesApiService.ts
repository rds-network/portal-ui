import { FilesApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const FilesApiService = new FilesApi(undefined, undefined, RequestHttp)
