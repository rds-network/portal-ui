import { ActionIcon, Text } from "@mantine/core"
import { IconX } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import parse from "html-react-parser"
import React, { useEffect, useRef } from "react"
import { useIntl } from "react-intl"
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

    const { mutate: dismiss } = useMutation({
        mutationFn: (id: string) => AnnouncementApiService.markAnnouncementRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["announcements"] })
        },
    })

    if (!banner) return null

    return (
        <div className={classes.banner} role="status" ref={boxRef}>
            <div className={classes.text}>
                <Text fw={700} size="sm">
                    {banner.title}
                </Text>
                <Text size="sm" component="div" className={classes.body}>
                    {parse(sanitizeHtml(banner.body))}
                </Text>
            </div>
            <ActionIcon
                variant="subtle"
                color="yellow"
                aria-label={intl.formatMessage({ id: "common.announcements.dismiss" })}
                onClick={() => dismiss(banner.id)}
            >
                <IconX size={16} />
            </ActionIcon>
        </div>
    )
}
