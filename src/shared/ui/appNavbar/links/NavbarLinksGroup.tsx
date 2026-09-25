import { Anchor, Badge, Box, Collapse, Group, rem, ThemeIcon, UnstyledButton } from "@mantine/core"
import { IconChevronRight } from "@tabler/icons-react"
import React, { useContext, useState } from "react"
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

export function LinksGroup({
    icon: Icon,
    label,
    initiallyOpened,
    items,
    link,
    roles,
    showUnread,
    showIfCurator,
    curatorInbox,
}: ItemGroupProps) {
    const location = useLocation()
    const isActive = (path?: string) =>
        location.pathname === path || (path === "/reports/personal" && location.pathname === "/")
    const hasChildren = Array.isArray(items)
    const { user } = useContext(UserContext)
    const [opened, setOpened] = useState(initiallyOpened || false)
    const isExternal = link?.startsWith("http://") || link?.startsWith("https://")
    const { data: unread = 0 } = useQuery({
        queryKey: ["inbox-unread"],
        queryFn: () => InboxApiService.unreadCount(),
        enabled: !!showUnread,
        refetchInterval: 60_000,
    })
    const needsCuratorInbox =
        !!curatorInbox ||
        !!showIfCurator ||
        (hasChildren ? items : [])?.some((item) => item.curatorInbox || item.showIfCurator)
    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!needsCuratorInbox,
    })
    const { data: pendingReports = 0 } = useQuery({
        queryKey: ["customer-reports-pending"],
        queryFn: () => CustomerReportApiService.pendingCount(),
        enabled: !!needsCuratorInbox,
        refetchInterval: 60_000,
    })
    const canSeeCuratorInbox =
        !!curatorMe?.curator || hasPermission(user, ["ADMIN", "ADMIN_VOLUNTEER", "MAIN_VOLUNTEER"])

    const children = (hasChildren ? items : [])
        ?.filter(
            (item) =>
                hasPermission(user, item.roles, item.hideFrom) || (item.showIfCurator && curatorMe?.curator)
        )
        .filter((item) => !item.curatorInbox || canSeeCuratorInbox)
        .map((item) => {
            const isExternal = item.link?.startsWith("http://") || item.link?.startsWith("https://")
            const label = (
                <Group gap={8} wrap="nowrap">
                    <FormattedMessage id={item.label} />
                    {item.curatorInbox && pendingReports > 0 && (
                        <Badge size="xs" color="blue">
                            {pendingReports > 99 ? "99+" : pendingReports}
                        </Badge>
                    )}
                </Group>
            )
            return isExternal ? (
                <Anchor className={classes.link} href={item.link} key={item.label}>
                    {label}
                </Anchor>
            ) : (
                <Anchor
                    component={Link}
                    className={classes.link}
                    aria-current={isActive(item.link) ? "page" : undefined}
                    to={item.link}
                    key={item.label}
                >
                    {label}
                </Anchor>
            )
        })

    const controlContent = (
        <Group justify="space-between" gap={0}>
            <Box style={{ display: "flex", alignItems: "center" }}>
                <ThemeIcon variant="light" size={30}>
                    <Icon style={{ width: rem(18), height: rem(18) }} />
                </ThemeIcon>
                <Box ml="md">
                    <FormattedMessage id={label} />
                </Box>
                {showUnread && unread > 0 && (
                    <Badge size="xs" color="blue" ml={8}>
                        {unread > 99 ? "99+" : unread}
                    </Badge>
                )}
                {curatorInbox && pendingReports > 0 && (
                    <Badge size="xs" color="blue" ml={8}>
                        {pendingReports > 99 ? "99+" : pendingReports}
                    </Badge>
                )}
            </Box>
            {hasChildren && (
                <IconChevronRight
                    className={classes.chevron}
                    style={{
                        transform: opened ? "rotate(-90deg)" : "none",
                    }}
                />
            )}
        </Group>
    )

    return (
        <>
            {hasChildren || !link ? (
                <UnstyledButton
                    aria-expanded={opened}
                    onClick={() => setOpened((o) => !o)}
                    className={classes.control}
                    component="button"
                >
                    {controlContent}
                </UnstyledButton>
            ) : isExternal ? (
                <UnstyledButton
                    className={classes.control}
                    component="a"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {controlContent}
                </UnstyledButton>
            ) : (
                <UnstyledButton
                    className={classes.control}
                    component={Link}
                    aria-current={isActive(link) ? "page" : undefined}
                    to={link}
                >
                    {controlContent}
                </UnstyledButton>
            )}
            {hasChildren ? (
                <Collapse in={opened}>
                    <div className={classes.children}>{children}</div>
                </Collapse>
            ) : null}
        </>
    )
}
