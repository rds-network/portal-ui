import { Badge, rem, UnstyledButton } from "@mantine/core"
import React, { useContext } from "react"
import { FormattedMessage } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { ItemGroupProps } from "src/shared/ui/appNavbar/AppNavbar"
import classes from "src/shared/ui/appNavbar/links/NavbarLinksGroup.module.scss"
import { hasPermission } from "src/shared/user/roles"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router"
import { CustomerReportApiService } from "src/shared/api/CustomerReportApiService"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"

export function NavItem({
    icon: Icon,
    label,
    link,
    showUnread,
    curatorInbox,
}: ItemGroupProps) {
    const location = useLocation()
    const { user } = useContext(UserContext)
    const isActive =
        !!link &&
        (location.pathname === link || (link === "/reports/personal" && location.pathname === "/"))
    const isExternal = link?.startsWith("http://") || link?.startsWith("https://")

    const { data: unread = 0 } = useQuery({
        queryKey: ["inbox-unread"],
        queryFn: () => InboxApiService.unreadCount(),
        enabled: !!showUnread,
        refetchInterval: 60_000,
    })
    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!curatorInbox,
    })
    const { data: pendingReports = 0 } = useQuery({
        queryKey: ["customer-reports-pending"],
        queryFn: () => CustomerReportApiService.pendingCount(),
        enabled: !!curatorInbox,
        refetchInterval: 60_000,
    })

    if (curatorInbox) {
        const ok =
            !!curatorMe?.curator ||
            hasPermission(user, ["ADMIN", "ADMIN_VOLUNTEER", "MAIN_VOLUNTEER"]) ||
            pendingReports > 0
        if (!ok) return null
    }

    if (!link || !Icon) return null

    const badge =
        (showUnread && unread > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {unread > 99 ? "99+" : unread}
            </Badge>
        )) ||
        (curatorInbox && pendingReports > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {pendingReports > 99 ? "99+" : pendingReports}
            </Badge>
        )) ||
        null

    const body = (
        <>
            <span className={classes.icon}>
                <Icon style={{ width: rem(18), height: rem(18) }} stroke={1.6} />
            </span>
            <span className={classes.label}>
                <FormattedMessage id={label} />
            </span>
            {badge}
        </>
    )

    if (isExternal) {
        return (
            <UnstyledButton
                className={classes.item}
                component="a"
                href={link}
                target="_blank"
                rel="noopener noreferrer"
            >
                {body}
            </UnstyledButton>
        )
    }

    return (
        <UnstyledButton
            className={classes.item}
            component={Link}
            to={link}
            aria-current={isActive ? "page" : undefined}
        >
            {body}
        </UnstyledButton>
    )
}

/** @deprecated — use NavItem */
export const LinksGroup = NavItem
