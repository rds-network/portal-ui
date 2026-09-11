import { UserApi, UserInfoDto } from "@rds-network/portal-api-axios"
import { useQuery } from "@tanstack/react-query"
import { AxiosResponse } from "axios"
import { RequestHttp } from "src/shared/http/RequestHttp"
import { SimpleRequestHttp } from "src/shared/http/SimpleRequestHttp"

export const UserApiService = new UserApi(undefined, undefined, RequestHttp)

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
