import { AppShell, Drawer, Group, ScrollArea } from "@mantine/core"
import React, { useContext, useEffect, useMemo } from "react"
import { NavbarContext } from "src/app/providers/NavbarProvider"
import { UserContext } from "src/app/providers/UserContext"
import { useDesktop } from "src/shared/hooks/useDesktop"
import classes from "src/shared/ui/appNavbar/AppNavbar.module.scss"
import { Content } from "src/shared/ui/appNavbar/Content"
import { LogoutButton } from "src/shared/ui/appNavbar/logoutButton/LogoutButton"
import { UserButton } from "src/shared/ui/appNavbar/userButton/UserButton"
import { FormattedMessage } from "react-intl"
import { hasPermission } from "src/shared/user/roles"
import { LinksGroup } from "./links/NavbarLinksGroup"
import { useLocation } from "react-router"

export interface ItemProps {
    label: string
    link: string
    roles?: string[]
    hideFrom?: string[]
}

export interface ItemGroupProps {
    icon: React.FC<any>
    label: string
    initiallyOpened?: boolean
    items?: ItemProps[]
    link?: string
    roles?: string[]
}

export const AppNavbar = React.memo(function AppNavbar() {
    const isDesktop = useDesktop()
    const { user } = useContext(UserContext)

    const { menuOpened, setMenuOpened } = useContext(NavbarContext)
    const location = useLocation()

    // Reset the mobile drawer after navigation or switching between mobile and desktop.
    useEffect(() => {
        setMenuOpened(false)
    }, [location.pathname, isDesktop, setMenuOpened])

    const items = useMemo(() => {
        return Content.filter((item) => hasPermission(user, item.roles)).map((item) => (
            <LinksGroup {...item} key={item.label} />
        ))
    }, [user])

    const navigation = (
        <nav id="portal-navigation" className={classes.navbar}>
            <div className={classes.header}>
                <UserButton />
            </div>

            <ScrollArea className={classes.links}>
                <div className={classes.linksInner}>{items}</div>
            </ScrollArea>

            <Group className={classes.footer} justify="space-between">
                <LogoutButton />
            </Group>
        </nav>
    )

    if (!isDesktop) {
        return (
            <Drawer
                opened={menuOpened}
                onClose={() => setMenuOpened(false)}
                title={<FormattedMessage id="design.navigation" />}
                size={310}
                classNames={{
                    body: classes.mobileBody,
                    content: classes.mobileContent,
                    header: classes.mobileHeader,
                    close: classes.mobileClose,
                }}
            >
                {navigation}
            </Drawer>
        )
    }

    return <AppShell.Navbar className={classes.appShellNavbar}>{navigation}</AppShell.Navbar>
})
