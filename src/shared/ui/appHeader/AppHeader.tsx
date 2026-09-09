import image from "/resources/pv_logo.png"
import { Anchor, Burger, Group, Image, Text } from "@mantine/core"
import { useContext } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { NavbarContext } from "src/app/providers/NavbarProvider"
import { useDesktop } from "src/shared/hooks/useDesktop"
import classes from "src/shared/ui/appHeader/AppHeader.module.scss"
import { Link } from "react-router"
import { AnnouncementBell } from "src/shared/ui/announcements/AnnouncementBell"
import { LocaleSwitcher } from "src/shared/ui/locale/LocaleSwitcher"
import { ThemeSwitcher } from "src/shared/ui/theme/ThemeSwitcher"
import { HeaderActivity } from "src/shared/ui/loading/HeaderActivity"

export const AppHeader = () => {
    const { menuOpened, setMenuOpened } = useContext(NavbarContext)
    const isDesktop = useDesktop()
    const intl = useIntl()

    return (
        <>
            <Group className={classes.rootGroup}>
                {!isDesktop && (
                    <Burger
                        opened={menuOpened}
                        onClick={() => setMenuOpened((opened) => !opened)}
                        size="sm"
                        aria-label={intl.formatMessage({ id: "design.navigation" })}
                        aria-expanded={menuOpened}
                        aria-controls={menuOpened ? "portal-navigation" : undefined}
                    />
                )}
                <Group className={classes.identity}>
                    <Anchor component={Link} to="/" className={classes.brand} underline="never">
                        <Image src={image} className={classes.logo} alt="RDS" />
                        <Text className={classes.brandText}>
                            <FormattedMessage id="design.portal" />
                        </Text>
                    </Anchor>
                    <HeaderActivity />
                </Group>
                <Group className={classes.actions}>
                    <LocaleSwitcher />
                    <ThemeSwitcher />
                    <AnnouncementBell />
                </Group>
            </Group>
        </>
    )
}

export default AppHeader
