import { RequestHttp } from "src/shared/http/RequestHttp"

export type ProgramCuratorDto = {
    programCode: string
    programNameRu: string
    programNameEn: string
    programNameSr: string
    username: string
    fullName: string
}

export type ProgramCuratorWriteRequest = {
    programCode: string
    username: string
}

export type ProgramCuratorDelegateDto = {
    programCode: string
    programNameRu: string
    programNameEn: string
    programNameSr: string
    curatorUsername: string
    curatorFullName: string
    delegateUsername: string
    delegateFullName: string
}

export type ProgramCuratorDelegateWriteRequest = {
    programCode: string
    curatorUsername: string
    delegateUsername: string
}

export type ReportApproverDto = {
    username: string
    fullName: string
    programCode: string
    programNameRu: string
    programNameEn: string
    programNameSr: string
    role: "CURATOR" | "DELEGATE" | string
    curatorUsername?: string | null
    curatorFullName?: string | null
}

export type PortalModeratorDto = {
    username: string
    fullName: string
}

const alive = (status: number) => status === 200 || status === 201 || status === 204 || status === 404 || status >= 500

export const ProgramCuratorApiService = {
    async list(): Promise<ProgramCuratorDto[]> {
        const response = await RequestHttp.get<ProgramCuratorDto[]>("/program-curators", { validateStatus: alive })
        return response.data ?? []
    },
    async approvers(): Promise<ReportApproverDto[]> {
        const response = await RequestHttp.get<ReportApproverDto[]>("/program-curators/approvers", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },
    async moderators(): Promise<PortalModeratorDto[]> {
        const response = await RequestHttp.get<PortalModeratorDto[]>("/program-curators/moderators", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },
    async delegates(): Promise<ProgramCuratorDelegateDto[]> {
        const response = await RequestHttp.get<ProgramCuratorDelegateDto[]>("/program-curators/delegates", {
            validateStatus: alive,
        })
        if (response.status !== 200) return []
        return response.data ?? []
    },
    async me(): Promise<{ curator: boolean; programs: string[] }> {
        const response = await RequestHttp.get<{ curator: boolean; programs?: string[] }>("/program-curators/me", {
            validateStatus: alive,
        })
        if (response.status !== 200) return { curator: false, programs: [] }
        return { curator: !!response.data?.curator, programs: response.data?.programs || [] }
    },
    async assign(payload: ProgramCuratorWriteRequest): Promise<ProgramCuratorDto> {
        const response = await RequestHttp.post<ProgramCuratorDto>("/program-curators", payload)
        return response.data
    },
    async remove(programCode: string, username: string): Promise<void> {
        await RequestHttp.delete(`/program-curators/${encodeURIComponent(programCode)}/${encodeURIComponent(username)}`)
    },
    async assignDelegate(payload: ProgramCuratorDelegateWriteRequest): Promise<ProgramCuratorDelegateDto> {
        const response = await RequestHttp.post<ProgramCuratorDelegateDto>("/program-curators/delegates", payload)
        return response.data
    },
    async removeDelegate(programCode: string, curatorUsername: string, delegateUsername: string): Promise<void> {
        await RequestHttp.delete(
            `/program-curators/delegates/${encodeURIComponent(programCode)}/${encodeURIComponent(curatorUsername)}/${encodeURIComponent(delegateUsername)}`
        )
    },
}
