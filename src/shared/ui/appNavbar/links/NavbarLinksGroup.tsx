import { Badge, rem, UnstyledButton } from "@mantine/core"
import React, { useContext } from "react"
import { FormattedMessage } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { ItemGroupProps } from "src/shared/ui/appNavbar/AppNavbar"
import classes from "src/shared/ui/appNavbar/links/NavbarLinksGroup.module.scss"
import { hasPermission } from "src/shared/user/roles"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router"
import { ApplicationBadgeApi } from "src/shared/api/applications/ApplicationBadgeApi"
import { ChatApiService } from "src/shared/api/ChatApiService"
import { CustomerReportApiService } from "src/shared/api/CustomerReportApiService"
import { DissolutionRequestApiService } from "src/shared/api/DissolutionRequestApiService"
import { IdeasApiService, IdeasBadge } from "src/shared/api/IdeasApiService"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { LeaveRequestApiService } from "src/shared/api/LeaveRequestApiService"
import { OrgLinkApiService, ResourcesBadge } from "src/shared/api/OrgLinkApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { UserAccountApiService } from "src/shared/api/user/UserApiService"
import { WorkAssignmentApiService } from "src/shared/api/WorkAssignmentApiService"

type NavItemProps = ItemGroupProps & { flat?: boolean }

const formatBadge = (count: number) => (count > 99 ? "99+" : count)

export function NavItem({
    icon: Icon,
    label,
    link,
    showUnread,
    showChatUnread,
    showIdeasUnread,
    showTasksOpen,
    showResourcesNew,
    showLeavePending,
    showDissolutionPending,
    showApplications,
    showControlled,
    curatorInbox,
    flat,
}: NavItemProps) {
    const location = useLocation()
    const { user } = useContext(UserContext)
    const isActive = !!link && location.pathname === link
    const isExternal = link?.startsWith("http://") || link?.startsWith("https://")

    const { data: unread = 0 } = useQuery({
        queryKey: ["inbox-unread"],
        queryFn: () => InboxApiService.unreadCount(),
        enabled: !!showUnread,
        refetchInterval: 60_000,
    })
    const { data: chatUnread = 0 } = useQuery({
        queryKey: ["chat-unread"],
        queryFn: () => ChatApiService.unreadCount(),
        enabled: !!showChatUnread,
        refetchInterval: 8_000,
        refetchOnWindowFocus: true,
    })
    const { data: ideasUnread = 0 } = useQuery({
        queryKey: ["ideas-unread"],
        queryFn: () => IdeasApiService.unreadCount(IdeasBadge.getLastSeen()),
        enabled: !!showIdeasUnread,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
    })
    const { data: tasksOpen = 0 } = useQuery({
        queryKey: ["tasks-open-count"],
        queryFn: () => WorkAssignmentApiService.myOpenCount(),
        enabled: !!showTasksOpen,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
    })
    const { data: resourcesNew = 0 } = useQuery({
        queryKey: ["resources-new-count"],
        queryFn: () => OrgLinkApiService.newCount(ResourcesBadge.getLastSeen()),
        enabled: !!showResourcesNew,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
    })
    const { data: leavePending = 0 } = useQuery({
        queryKey: ["leave-pending-count"],
        queryFn: () => LeaveRequestApiService.pendingCount(),
        enabled: !!showLeavePending,
        refetchInterval: 60_000,
    })
    const { data: dissolutionPending = 0 } = useQuery({
        queryKey: ["dissolution-pending-count"],
        queryFn: () => DissolutionRequestApiService.pendingCount(),
        enabled: !!showDissolutionPending,
        refetchInterval: 60_000,
    })
    const { data: openApplications = 0 } = useQuery({
        queryKey: ["applications-open-count"],
        queryFn: () => ApplicationBadgeApi.openCount(),
        enabled: !!showApplications,
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
    const { data: controlled = [] } = useQuery({
        queryKey: ["controlled-by-me"],
        queryFn: () => UserAccountApiService.controlledByMe(),
        enabled: !!showControlled,
        refetchInterval: 60_000,
    })
    const controlledCount = controlled.length

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
                {formatBadge(unread)}
            </Badge>
        )) ||
        (showChatUnread && chatUnread > 0 && (
            <Badge size="xs" color="orange" className={`${classes.badge} ${classes.badgePulse}`}>
                {formatBadge(chatUnread)}
            </Badge>
        )) ||
        (showIdeasUnread && ideasUnread > 0 && (
            <Badge size="xs" color="teal" className={`${classes.badge} ${classes.badgePulse}`}>
                {formatBadge(ideasUnread)}
            </Badge>
        )) ||
        (showTasksOpen && tasksOpen > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {formatBadge(tasksOpen)}
            </Badge>
        )) ||
        (showResourcesNew && resourcesNew > 0 && (
            <Badge size="xs" color="teal" className={`${classes.badge} ${classes.badgePulse}`}>
                {formatBadge(resourcesNew)}
            </Badge>
        )) ||
        (showLeavePending && leavePending > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {formatBadge(leavePending)}
            </Badge>
        )) ||
        (showDissolutionPending && dissolutionPending > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {formatBadge(dissolutionPending)}
            </Badge>
        )) ||
        (showApplications && openApplications > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {formatBadge(openApplications)}
            </Badge>
        )) ||
        (curatorInbox && pendingReports > 0 && (
            <Badge size="xs" color="blue" className={classes.badge}>
                {formatBadge(pendingReports)}
            </Badge>
        )) ||
        (showControlled && controlledCount > 0 && (
            <Badge size="xs" color="teal" className={classes.badge}>
                {formatBadge(controlledCount)}
            </Badge>
        )) ||
        null

    const body = (
        <>
            {!flat && (
                <span className={classes.icon}>
                    <Icon style={{ width: rem(18), height: rem(18) }} stroke={1.6} />
                </span>
            )}
            <span className={classes.label}>
                <FormattedMessage id={label} />
            </span>
            {badge}
        </>
    )

    const className = flat ? `${classes.item} ${classes.itemFlat}` : classes.item

    if (isExternal) {
        return (
            <UnstyledButton
                className={className}
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
            className={className}
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
