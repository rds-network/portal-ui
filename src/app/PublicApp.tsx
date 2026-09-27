import { AppShell, AppShellHeader, Flex, Group, ScrollArea } from "@mantine/core"
import PublicRouter from "src/app/router/PublicRouter"
import classes from "src/app/styles/public.module.scss"
import { LocaleSwitcher } from "src/shared/ui/locale/LocaleSwitcher"
import { LoginButton } from "src/shared/ui/loginButton/LoginButton"
import { ThemeSwitcher } from "src/shared/ui/theme/ThemeSwitcher"
import { HeaderActivity } from "src/shared/ui/loading/HeaderActivity"

// @ts-ignore
const PublicApp = () => {
    return (
        <>
            <AppShell className={classes.appShell}>
                <AppShellHeader className={classes.appShellHeader}>
                    <Group justify="space-between">
                        <Group className={classes.loginGroup}>
                            <LoginButton />
                            <HeaderActivity />
                        </Group>
                        <Group justify="flex-end">
                            <LocaleSwitcher />
                            <ThemeSwitcher />
                        </Group>
                    </Group>
                </AppShellHeader>
                <ScrollArea className={classes.appShellMainScroll}>
                    <Flex className={classes.appShellMainScroll}>
                        <Flex className={classes.appShellMain} align="center" justify="center">
                            <PublicRouter />
                        </Flex>
                    </Flex>
                </ScrollArea>
            </AppShell>
        </>
    )
}

export default PublicApp
