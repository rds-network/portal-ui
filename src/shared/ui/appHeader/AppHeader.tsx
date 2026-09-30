import image from "/resources/pv_logo.png"
import { ActionIcon, Anchor, Burger, Group, Image, Text, Tooltip } from "@mantine/core"
import { IconSparkles } from "@tabler/icons-react"
import { useContext } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import { NavbarContext } from "src/app/providers/NavbarProvider"
import { useDesktop } from "src/shared/hooks/useDesktop"
import classes from "src/shared/ui/appHeader/AppHeader.module.scss"
import { AnnouncementBanner } from "src/shared/ui/announcements/AnnouncementBanner"
import { AnnouncementBell } from "src/shared/ui/announcements/AnnouncementBell"
import { LocaleSwitcher } from "src/shared/ui/locale/LocaleSwitcher"
import { HeaderActivity } from "src/shared/ui/loading/HeaderActivity"
import { ThemeSwitcher } from "src/shared/ui/theme/ThemeSwitcher"
import { startWhatsNewTour } from "src/shared/ui/whatsNew/whatsNewConfig"

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
                {!isDesktop && (
                    <Group className={classes.identity}>
                        <Anchor component={Link} to="/" className={classes.brand} underline="never">
                            <Image src={image} className={classes.logo} alt="RDS" />
                            <Text className={classes.brandText}>
                                <FormattedMessage id="design.portal" />
                            </Text>
                        </Anchor>
                        <HeaderActivity />
                    </Group>
                )}
                <Group className={classes.actions}>
                    {isDesktop && <HeaderActivity />}
                    <Tooltip label={intl.formatMessage({ id: "whatsNew.open" })} withArrow>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            aria-label={intl.formatMessage({ id: "whatsNew.open" })}
                            onClick={() => startWhatsNewTour()}
                        >
                            <IconSparkles size={20} stroke={1.6} />
                        </ActionIcon>
                    </Tooltip>
                    <LocaleSwitcher />
                    <ThemeSwitcher />
                    <AnnouncementBell />
                </Group>
            </Group>
            <AnnouncementBanner />
        </>
    )
}

export default AppHeader
