import { Loader } from "@mantine/core"
import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useIntl } from "react-intl"
import classes from "./HeaderActivity.module.scss"

export const HeaderActivity = () => {
    const fetching = useIsFetching()
    const mutating = useIsMutating()
    const busy = fetching + mutating > 0
    const [visible, setVisible] = useState(false)
    const intl = useIntl()

    useEffect(() => {
        if (!busy) {
            setVisible(false)
            return
        }
        const timer = setTimeout(() => setVisible(true), 200)
        return () => clearTimeout(timer)
    }, [busy])

    if (!busy || !visible) return null

    return (
        <span className={classes.root} role="status" aria-label={intl.formatMessage({ id: "design.loading" })}>
            <Loader size={14} color="var(--portal-accent)" aria-hidden="true" />
        </span>
    )
}
