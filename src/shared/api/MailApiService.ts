import { MailApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const MailApiService = new MailApi(undefined, undefined, RequestHttp)
