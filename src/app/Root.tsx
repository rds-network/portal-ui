import { MantineProvider } from "@mantine/core"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import "@mantine/dropzone/styles.css"
import { Notifications } from "@mantine/notifications"
import "@mantine/tiptap/styles.css"
import { QueryClientProvider } from "@tanstack/react-query"
import dayjs from "dayjs"
import isBetween from "dayjs/plugin/isBetween"
import isoWeek from "dayjs/plugin/isoWeek"
import isoWeekInYear from "dayjs/plugin/isoWeeksInYear"
import weekOfYear from "dayjs/plugin/weekOfYear"
import "react-day-picker/style.css"
import { ErrorBoundary } from "src/app/ErrorBoundary"
import { CsrfContextProvider } from "src/app/providers/CsrfContext"
import { LanguageContextProvider } from "src/app/providers/LocaleContext"
import { UserContextProvider } from "src/app/providers/UserContext"
import RootRouter from "src/app/router/RootRouter"
import { queryClient } from "src/shared/constants/Query"
import { AppShell } from "src/shared/ui/appShell/AppShell"
import { theme } from "src/shared/ui/theme/CustomMantineTheme"
import classes from "./styles/root.module.scss"
import "./styles/design.scss"

/**
 * Root component
 *
 * @returns The root JSX element of the application
 */
export const Root = () => {
    dayjs.extend(weekOfYear)
    dayjs.extend(isoWeek)
    dayjs.extend(isoWeekInYear)
    dayjs.extend(isBetween)

    return (
        <MantineProvider defaultColorScheme="auto" theme={theme}>
            <QueryClientProvider client={queryClient}>
                <CsrfContextProvider>
                    <LanguageContextProvider>
                        <UserContextProvider>
                            <AppShell>
                                <ErrorBoundary>
                                    <Notifications className={classes.notifications} />
                                    <RootRouter />
                                </ErrorBoundary>
                            </AppShell>
                        </UserContextProvider>
                    </LanguageContextProvider>
                </CsrfContextProvider>
            </QueryClientProvider>
        </MantineProvider>
    )
}
