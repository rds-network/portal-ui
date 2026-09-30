import { AppShell, ScrollArea } from "@mantine/core"
import { useContext } from "react"
import { NavbarContext, NavbarContextProvider } from "src/app/providers/NavbarProvider"
import { OfficialGroupProvider } from "src/app/providers/OfficialGroupProvider"
import { ProgramsProvider } from "src/app/providers/ProgramsProvider"
import { ProjectsProvider } from "src/app/providers/ProjectsProvider"
import { ProfileValidationProvider, useProfileValidation } from "src/app/providers/ProfileValidationProvider"
import PrivateRouter from "src/app/router/PrivateRouter"
import classes from "src/app/styles/private.module.scss"
import AppHeader from "src/shared/ui/appHeader/AppHeader"
import { AppNavbar } from "src/shared/ui/appNavbar/AppNavbar"
import { ChatNotifyWatcher } from "src/shared/ui/chat/ChatNotifyWatcher"
import { InboxAckGuard } from "src/shared/ui/inbox/InboxAckGuard"
import { ProfileValidationGuard } from "src/shared/ui/profileValidation/ProfileValidationGuard"
import { ProfileValidationModal } from "src/shared/ui/profileValidation/ProfileValidationModal"
import { WhatsNewTour } from "src/shared/ui/whatsNew/WhatsNewTour"

const PrivateAppShell = () => {
    const { showProfileModal } = useProfileValidation()
    const { setMenuOpened } = useContext(NavbarContext)

    return (
        <>
            <ChatNotifyWatcher />
            <AppShell className={classes.appShell}>
                <AppHeader />
                <AppNavbar />
                <AppShell.Main className={classes.appShellMain}>
                    <ScrollArea className={classes.appShellMainScroll}>
                        <PrivateRouter />
                    </ScrollArea>
                </AppShell.Main>
            </AppShell>
            <ProfileValidationModal />
            <WhatsNewTour
                blocked={showProfileModal}
                onOpenNav={() => setMenuOpened(true)}
            />
        </>
    )
}

const PrivateApp = () => {
    return (
        <NavbarContextProvider>
            <ProgramsProvider>
                <ProjectsProvider>
                    <OfficialGroupProvider>
                        <ProfileValidationProvider>
                            <ProfileValidationGuard>
                                <InboxAckGuard>
                                    <PrivateAppShell />
                                </InboxAckGuard>
                            </ProfileValidationGuard>
                        </ProfileValidationProvider>
                    </OfficialGroupProvider>
                </ProjectsProvider>
            </ProgramsProvider>
        </NavbarContextProvider>
    )
}

export default PrivateApp
