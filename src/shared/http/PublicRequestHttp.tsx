import { Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { ErrorResponse } from "@rds-network/portal-api-axios"
import Axios, { AxiosError } from "axios"
import { FormattedMessage } from "react-intl"
import { history } from "src/shared/constants/History"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

export const PublicRequestHttp = Axios.create({
    baseURL: "/api",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cache: "no-cache",
    },
    withXSRFToken: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
})

PublicRequestHttp.interceptors.response.use(
    (res) => {
        return res
    },
    (error: AxiosError) => {
        const status = error.response?.status
        if (status === 404) {
            history.replace({ pathname: "/not-found" })
            location.reload()
            return
        }
        let message: string = error.message
        if (error.response?.data) {
            const errorResponse = error.response.data as ErrorResponse
            message = errorResponse.message
        }
        notifications.show(
            ErrorNotification(
                <Text fw="bold" size="sm">
                    <FormattedMessage id="errors.request" />
                </Text>,
                <Text size="sm">{message}</Text>
            )
        )
        return Promise.reject(error)
    }
)
