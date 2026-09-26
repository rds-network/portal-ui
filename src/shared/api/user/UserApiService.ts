import { UserApi, UserInfoDto } from "@rds-network/portal-api-axios"
import { useQuery } from "@tanstack/react-query"
import { AxiosResponse } from "axios"
import { RequestHttp } from "src/shared/http/RequestHttp"
import { SimpleRequestHttp } from "src/shared/http/SimpleRequestHttp"

export const UserApiService = new UserApi(undefined, undefined, RequestHttp)

/**
 * Поля стопа на сдачу отчётов приходят с бэкенда раньше, чем их подхватит сгенерированный клиент.
 */
export type ReportBlockInfo = {
    reportBlocked?: boolean
    reportBlockedAt?: string | null
    reportBlockedBy?: string | null
    reportBlockedByFullName?: string | null
    reportBlockedReason?: string | null
}

export const reportBlockOf = (user: unknown): ReportBlockInfo => (user as ReportBlockInfo | null) ?? {}

const alive = (status: number) => status === 200 || status === 404

const unwrap = <T>(response: { status: number; data: T }): T => {
    if (response.status === 404) throw new Error("API ещё не на сервере")
    return response.data
}

export const UserAccountApiService = {
    async clearProgram(id: number): Promise<UserInfoDto> {
        return unwrap(await RequestHttp.delete<UserInfoDto>(`/user/account/${id}/program`, { validateStatus: alive }))
    },

    async clearProject(id: number): Promise<UserInfoDto> {
        return unwrap(await RequestHttp.delete<UserInfoDto>(`/user/account/${id}/project`, { validateStatus: alive }))
    },

    async setReportBlock(id: number, reason?: string | null): Promise<UserInfoDto> {
        return unwrap(
            await RequestHttp.post<UserInfoDto>(
                `/user/account/${id}/report-block`,
                { reason: reason?.trim() || null },
                { validateStatus: alive }
            )
        )
    },

    async clearReportBlock(id: number): Promise<UserInfoDto> {
        return unwrap(
            await RequestHttp.delete<UserInfoDto>(`/user/account/${id}/report-block`, { validateStatus: alive })
        )
    },
}

export const resolveUsers = (logins: (string | null | undefined)[]) => {
    const filtered = Array.from(new Set(logins.filter((x): x is string => !!x))).sort()

    return useQuery({
        enabled: filtered.length > 0,
        queryKey: ["resolveUsers", filtered],
        queryFn: () =>
            UserApiService.resolveUsers(filtered).then((r) =>
                r.data.reduce(
                    (acc, item) => {
                        acc[item.username] = item
                        return acc
                    },
                    {} as Record<string, UserInfoDto>
                )
            ),
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}

export const checkUserForApplication = (): Promise<AxiosResponse<UserInfoDto>> => {
    const userApi = new UserApi(undefined, undefined, SimpleRequestHttp)
    return userApi.getCurrentAccount()
}
