import { ProjectsApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const ProjectsApiService = new ProjectsApi(undefined, undefined, RequestHttp)
