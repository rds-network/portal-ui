import { NoteApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const NoteApiService = new NoteApi(undefined, undefined, RequestHttp)
