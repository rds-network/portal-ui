import { AnnouncementsApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const AnnouncementApiService = new AnnouncementsApi(undefined, undefined, RequestHttp)

export type { AnnouncementAudience, AnnouncementCreateRequest, AnnouncementDto } from "@rds-network/portal-api-axios"
