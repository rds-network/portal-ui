import { Drawer, Group, ScrollArea } from "@mantine/core"
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
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { AccountStatusApiService } from "src/shared/api/AccountStatusApiService"
import { ImpersonationApiService } from "src/shared/api/ImpersonationApiService"
import { useQuery } from "@tanstack/react-query"
import { NavItem } from "./links/NavbarLinksGroup"
import linkClasses from "./links/NavbarLinksGroup.module.scss"
import { useLocation } from "react-router"

export interface ItemProps {
    label: string
    link: string
    roles?: string[]
    hideFrom?: string[]
    curatorInbox?: boolean
    showIfCurator?: boolean
}

export interface ItemGroupProps {
    icon: React.FC<any>
    label: string
    initiallyOpened?: boolean
    items?: ItemProps[]
    link?: string
    roles?: string[]
    showUnread?: boolean
    showApplications?: boolean
    showControlled?: boolean
    showIfCurator?: boolean
    showIfAccountStatusApprover?: boolean
    showIfPrivilegedOps?: boolean
    curatorInbox?: boolean
}

export const AppNavbar = React.memo(function AppNavbar() {
    const isDesktop = useDesktop()
    const { user } = useContext(UserContext)

    const { menuOpened, setMenuOpened } = useContext(NavbarContext)
    const location = useLocation()

    useEffect(() => {
        setMenuOpened(false)
    }, [location.pathname, isDesktop, setMenuOpened])

    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })

    const { data: accountStatusMeta } = useQuery({
        queryKey: ["account-status-meta"],
        queryFn: () => AccountStatusApiService.meta(),
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    })

    const { data: impersonation } = useQuery({
        queryKey: ["impersonation-status"],
        queryFn: () => ImpersonationApiService.status(),
        enabled: !!user,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    })

    // Effective account groups drive nav. Privileged ops stay hidden while impersonating.
    const navUser = user
    const impersonating = !!impersonation?.active
    const canShowPrivilegedOps = !impersonating && !!impersonation?.canImpersonate

    const itemVisible = (item: ItemGroupProps) => {
        if (item.showIfPrivilegedOps && impersonating) return false
        return (
            !!item.curatorInbox ||
            hasPermission(navUser, item.roles) ||
            (!!item.showIfCurator && !!curatorMe?.curator) ||
            (!!item.showIfAccountStatusApprover && !!accountStatusMeta?.isAccountStatusApprover) ||
            (!!item.showIfPrivilegedOps && canShowPrivilegedOps)
        )
    }

    const flatItems = useMemo(() => {
        const items: ItemGroupProps[] = []
        for (const section of Content) {
            for (const item of section.items) {
                if (itemVisible(item)) items.push(item)
            }
        }
        return items
    }, [
        navUser,
        curatorMe?.curator,
        accountStatusMeta?.isAccountStatusApprover,
        canShowPrivilegedOps,
        impersonating,
    ])

    const sections = useMemo(() => {
        return Content.map((section) => {
            const items = section.items.filter(itemVisible)
            if (items.length === 0) return null
            return (
                <div className={linkClasses.section} key={section.label}>
                    <p className={linkClasses.sectionTitle}>
                        <FormattedMessage id={section.label} />
                    </p>
                    {items.map((item) => (
                        <NavItem {...item} key={item.label} />
                    ))}
                </div>
            )
        })
    }, [
        navUser,
        curatorMe?.curator,
        accountStatusMeta?.isAccountStatusApprover,
        canShowPrivilegedOps,
        impersonating,
    ])

    const drawerNavigation = (
        <nav id="portal-navigation" className={classes.navbar}>
            <div className={classes.header}>
                <UserButton />
            </div>

            <ScrollArea className={classes.links} type="hover" offsetScrollbars={false}>
                <div className={classes.linksInner}>{sections}</div>
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
                {drawerNavigation}
            </Drawer>
        )
    }

    return (
        <nav id="portal-navigation" className={classes.topNav} aria-label="portal">
            <div className={classes.topNavInner}>
                <div className={classes.topNavLinks}>
                    {flatItems.map((item) => (
                        <NavItem {...item} key={item.label} flat />
                    ))}
                </div>
                <div className={classes.topNavUser}>
                    <UserButton compact />
                    <LogoutButton compact />
                </div>
            </div>
        </nav>
    )
})
