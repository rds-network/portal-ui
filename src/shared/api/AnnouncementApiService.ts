import { AnnouncementsApi } from "@rds-network/portal-api-axios"
import { RequestHttp } from "src/shared/http/RequestHttp"

export const AnnouncementApiService = new AnnouncementsApi(undefined, undefined, RequestHttp)

export type { AnnouncementAudience, AnnouncementCreateRequest, AnnouncementDto } from "@rds-network/portal-api-axios"

export type PortalBannerDto = {
    id: string
    title: string
    body: string
    createdBy?: string | null
    createTime: string
}

export type AnnouncementPublishRequest = {
    title: string
    body: string
    audience: string
    programCode?: string | null
    username?: string | null
    banner?: boolean
}

export type AnnouncementManageDto = {
    id: string
    title: string
    createTime: string
    createdBy?: string | null
    audience: string
    programCode?: string | null
    targetUsername?: string | null
    banner: boolean
}

const alive = (status: number) => status === 200 || status === 204

export const AnnouncementExtraApi = {
    async getBanner(): Promise<PortalBannerDto | null> {
        const response = await RequestHttp.get<PortalBannerDto>("/announcements/banner", { validateStatus: alive })
        if (response.status === 204 || !response.data?.id) return null
        return response.data
    },
    async publish(payload: AnnouncementPublishRequest) {
        const response = await RequestHttp.post("/announcements/publish", payload)
        return response.data
    },
    async listManage(): Promise<AnnouncementManageDto[]> {
        const response = await RequestHttp.get<AnnouncementManageDto[]>("/announcements/manage")
        return response.data || []
    },
    async remove(id: string): Promise<void> {
        await RequestHttp.delete(`/announcements/${id}`)
    },
}
