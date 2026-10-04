import { ActionIcon, Button, Text } from "@mantine/core"
import { IconX } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import parse from "html-react-parser"
import React, { useEffect, useRef } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { AnnouncementApiService, AnnouncementExtraApi } from "src/shared/api/AnnouncementApiService"
import { sanitizeHtml } from "src/shared/utils/sanitizeHtml"
import classes from "./AnnouncementBanner.module.scss"

export const AnnouncementBanner: React.FC = () => {
    const intl = useIntl()
    const boxRef = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()
    const { data: banner } = useQuery({
        queryKey: ["announcements", "banner"],
        queryFn: () => AnnouncementExtraApi.getBanner(),
        refetchInterval: 60_000,
    })

    useEffect(() => {
        const height = banner && boxRef.current ? `${boxRef.current.offsetHeight}px` : "0px"
        document.documentElement.style.setProperty("--portal-banner-height", height)
        return () => document.documentElement.style.setProperty("--portal-banner-height", "0px")
    }, [banner])

    // Recalculate height when content layout settles (images/fonts).
    useEffect(() => {
        if (!banner || !boxRef.current) return
        const el = boxRef.current
        const sync = () => {
            document.documentElement.style.setProperty("--portal-banner-height", `${el.offsetHeight}px`)
        }
        sync()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null
        ro?.observe(el)
        return () => ro?.disconnect()
    }, [banner])

    const { mutate: dismiss, isPending } = useMutation({
        mutationFn: (id: string) => AnnouncementApiService.markAnnouncementRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["announcements"] })
        },
    })

    if (!banner) return null

    const close = () => dismiss(banner.id)

    return (
        <div className={classes.banner} role="status" ref={boxRef}>
            <div className={classes.top}>
                <div className={classes.text}>
                    <Text fw={700} size="sm">
                        {banner.title}
                    </Text>
                    <Text size="sm" component="div" className={classes.body}>
                        {parse(sanitizeHtml(banner.body))}
                    </Text>
                    <Text size="xs" className={classes.hint}>
                        <FormattedMessage id="common.announcements.dismissHint" />
                    </Text>
                </div>
                <ActionIcon
                    className={classes.close}
                    variant="filled"
                    size="lg"
                    aria-label={intl.formatMessage({ id: "common.announcements.dismiss" })}
                    onClick={close}
                    disabled={isPending}
                >
                    <IconX size={20} stroke={2.5} />
                </ActionIcon>
            </div>
            <div className={classes.actions}>
                <Button
                    className={classes.dismissBtn}
                    size="compact-sm"
                    radius="md"
                    loading={isPending}
                    onClick={close}
                >
                    <FormattedMessage id="common.announcements.dismiss" />
                </Button>
            </div>
        </div>
    )
}
