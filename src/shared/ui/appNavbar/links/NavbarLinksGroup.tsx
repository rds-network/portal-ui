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
import { InboxApiService } from "src/shared/api/InboxApiService"

export function LinksGroup({ icon: Icon, label, initiallyOpened, items, link, roles, showUnread }: ItemGroupProps) {
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

    const children = (hasChildren ? items : [])
        ?.filter((item) => hasPermission(user, item.roles, item.hideFrom))
        .map((item) => {
            const isExternal = item.link?.startsWith("http://") || item.link?.startsWith("https://")
            return isExternal ? (
                <Anchor className={classes.link} href={item.link} key={item.label}>
                    <FormattedMessage id={item.label} />
                </Anchor>
            ) : (
                <Anchor
                    component={Link}
                    className={classes.link}
                    aria-current={isActive(item.link) ? "page" : undefined}
                    to={item.link}
                    key={item.label}
                >
                    <FormattedMessage id={item.label} />
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
            {hasChildren ? <Collapse in={opened}>{children}</Collapse> : null}
        </>
    )
}
