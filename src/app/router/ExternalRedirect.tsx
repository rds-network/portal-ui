import React, { useEffect } from "react"

/** Редирект со старого внутреннего маршрута на внешний адрес. */
export const ExternalRedirect: React.FC<{ to: string }> = ({ to }) => {
    useEffect(() => {
        window.location.replace(to)
    }, [to])

    return null
}
