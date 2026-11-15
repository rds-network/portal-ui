import { useQuery } from "@tanstack/react-query"
import { IconBell, IconChecklist, IconHome, IconId, IconMessages } from "@tabler/icons-react"
import React from "react"
import { FormattedMessage } from "react-intl"
import { NavLink, useLocation } from "react-router"
import { ChatApiService } from "src/shared/api/ChatApiService"
import { InboxApiService } from "src/shared/api/InboxApiService"
import classes from "./PortalMobileBottomNav.module.scss"

type Tab = {
    to: string
    labelId: string
    Icon: typeof IconHome
    center?: boolean
    match?: (path: string) => boolean
    badgeKey?: "inbox" | "chat"
}

const tabs: Tab[] = [
    {
        to: "/",
        labelId: "navbar.mobile.home",
        Icon: IconHome,
        match: (p) => p === "/",
    },
    {
        to: "/tasks",
        labelId: "navbar.mobile.tasks",
        Icon: IconChecklist,
        match: (p) => p.startsWith("/tasks"),
    },
    {
        to: "/vol-id?present=1",
        labelId: "navbar.mobile.volId",
        Icon: IconId,
        center: true,
        match: (p) => p.startsWith("/vol-id"),
    },
    {
        to: "/messages",
        labelId: "navbar.mobile.messages",
        Icon: IconBell,
        match: (p) => p.startsWith("/messages"),
        badgeKey: "inbox",
    },
    {
        to: "/chat",
        labelId: "navbar.mobile.chat",
        Icon: IconMessages,
        match: (p) => p.startsWith("/chat"),
        badgeKey: "chat",
    },
]

export const PortalMobileBottomNav: React.FC = () => {
    const { pathname, search } = useLocation()

    const { data: inboxUnread = 0 } = useQuery({
        queryKey: ["inbox-unread-bottom"],
        queryFn: () => InboxApiService.unreadCount(),
        refetchInterval: 60_000,
    })
    const { data: chatUnread = 0 } = useQuery({
        queryKey: ["chat-unread-bottom"],
        queryFn: () => ChatApiService.unreadCount(),
        refetchInterval: 60_000,
    })

    const hideForOpenChat = pathname.startsWith("/chat") && /[?&](peer|user|thread)=/.test(search)

    if (hideForOpenChat) return null

    return (
        <nav className={classes.nav} aria-label="Mobile">
            <ul className={classes.list}>
                {tabs.map(({ to, labelId, Icon, center, match, badgeKey }) => {
                    const active = match ? match(pathname) : pathname === to
                    const badge =
                        badgeKey === "inbox" ? inboxUnread : badgeKey === "chat" ? chatUnread : 0
                    return (
                        <li key={to} className={classes.item}>
                            <NavLink
                                to={to}
                                className={`${classes.link} ${active ? classes.active : ""} ${
                                    center ? classes.center : ""
                                }`}
                                aria-current={active ? "page" : undefined}
                            >
                                <span className={classes.iconWrap}>
                                    <Icon size={center ? 22 : 20} stroke={1.9} />
                                    {badge > 0 && (
                                        <span className={classes.badge}>
                                            {badge > 9 ? "9+" : badge}
                                        </span>
                                    )}
                                </span>
                                <span className={classes.label}>
                                    <FormattedMessage id={labelId} />
                                </span>
                            </NavLink>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
