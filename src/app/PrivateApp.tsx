import { AppShell, ScrollArea } from "@mantine/core"
import { NavbarContextProvider } from "src/app/providers/NavbarProvider"
import { OfficialGroupProvider } from "src/app/providers/OfficialGroupProvider"
import { ProgramsProvider } from "src/app/providers/ProgramsProvider"
import { ProjectsProvider } from "src/app/providers/ProjectsProvider"
import { ProfileValidationProvider } from "src/app/providers/ProfileValidationProvider"
import PrivateRouter from "src/app/router/PrivateRouter"
import classes from "src/app/styles/private.module.scss"
import AppHeader from "src/shared/ui/appHeader/AppHeader"
import { AppNavbar } from "src/shared/ui/appNavbar/AppNavbar"
import { InboxAckGuard } from "src/shared/ui/inbox/InboxAckGuard"
import { ProfileValidationGuard } from "src/shared/ui/profileValidation/ProfileValidationGuard"
import { ProfileValidationModal } from "src/shared/ui/profileValidation/ProfileValidationModal"

const PrivateApp = () => {
    return (
        <>
            <NavbarContextProvider>
                <ProgramsProvider>
                    <ProjectsProvider>
                        <OfficialGroupProvider>
                            <ProfileValidationProvider>
                                <ProfileValidationGuard>
                                    <InboxAckGuard>
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
                                    </InboxAckGuard>
                                </ProfileValidationGuard>
                            </ProfileValidationProvider>
                        </OfficialGroupProvider>
                    </ProjectsProvider>
                </ProgramsProvider>
            </NavbarContextProvider>
        </>
    )
}

export default PrivateApp
