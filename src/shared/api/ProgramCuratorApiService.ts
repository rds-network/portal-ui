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

const alive = (status: number) => status === 200 || status === 201 || status === 204 || status === 404 || status >= 500

export const ProgramCuratorApiService = {
    async list(): Promise<ProgramCuratorDto[]> {
        const response = await RequestHttp.get<ProgramCuratorDto[]>("/program-curators", { validateStatus: alive })
        return response.data ?? []
    },
    async me(): Promise<{ curator: boolean }> {
        const response = await RequestHttp.get<{ curator: boolean }>("/program-curators/me", { validateStatus: alive })
        if (response.status !== 200) return { curator: false }
        return { curator: !!response.data?.curator }
    },
    async assign(payload: ProgramCuratorWriteRequest): Promise<ProgramCuratorDto> {
        const response = await RequestHttp.post<ProgramCuratorDto>("/program-curators", payload)
        return response.data
    },
    async remove(programCode: string, username: string): Promise<void> {
        await RequestHttp.delete(`/program-curators/${encodeURIComponent(programCode)}/${encodeURIComponent(username)}`)
    },
}
