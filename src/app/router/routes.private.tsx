import { lazy } from "react"
import { RouteProps } from "react-router"

const Logout = lazy(() => import("src/pages/logout/Logout"))
const Profile = lazy(() => import("src/pages/profile/Profile"))
const Report = lazy(() => import("src/pages/report/ReportPage"))
const EditReport = lazy(() => import("src/pages/reportEdit/EditReport"))
const MyReports = lazy(() => import("src/pages/reportsPersonal/MyReports"))
const ReportList = lazy(() => import("src/pages/reports/ReportList"))
const UserList = lazy(() => import("src/pages/users/UserList"))
const Application = lazy(() => import("src/pages/application/Application"))
const ApplicationForm = lazy(() => import("src/pages/application/form/Form"))
const ApplicationStatusView = lazy(() => import("src/pages/application/view/ViewStatus"))
const ApplicationList = lazy(() => import("src/pages/applications/Applications"))
const ApplicationView = lazy(() => import("src/pages/applications/view/ApplicationView"))
const CleaningHowTo = lazy(() => import("src/pages/cleaning/CleaningHowTo"))
const ReportingGuide = lazy(() => import("src/pages/reporting/ReportingGuide"))
const VolunteerReports = lazy(() => import("src/pages/volunteers/reports/VolunteerReports"))
const VolunteerHeatmapPage = lazy(() => import("src/pages/heatmap/VolunteerHeatmapPage"))
const SupportPage = lazy(() => import("src/pages/support/SupportPage"))
const AnnouncementsAdminPage = lazy(() => import("src/pages/announcements/AnnouncementsAdminPage"))
const WorkTasksPage = lazy(() => import("src/pages/tasks/WorkTasksPage"))

export const routes: RouteProps[] = [
    {
        path: "/logout",
        element: <Logout />,
    },
    {
        path: "/profile/:login",
        element: <Profile />,
    },
    {
        path: "/report/create",
        element: <EditReport />,
    },
    {
        path: "/report/:id/edit",
        element: <EditReport />,
    },
    {
        path: "/report/:id",
        element: <Report />,
    },
    {
        path: "/reports/personal",
        element: <MyReports />,
    },
    {
        path: "/reports",
        element: <ReportList />,
    },
    {
        path: "/volunteers",
        element: <UserList />,
    },
    {
        path: "/volunteers/reports",
        element: <VolunteerReports />,
    },
    {
        path: "/application/:id",
        element: <ApplicationView />,
    },
    {
        path: "/applications",
        element: <ApplicationList />,
    },
    {
        path: "/application",
        element: <Application />,
    },
    {
        path: "/application/form",
        element: <ApplicationForm />,
    },
    {
        path: "/application-status/:id",
        element: <ApplicationStatusView />,
    },
    {
        path: "/cleaning-how-to",
        element: <CleaningHowTo />,
    },
    {
        path: "/reporting-guide",
        element: <ReportingGuide />,
    },
    {
        path: "/volunteers/heatmap",
        element: <VolunteerHeatmapPage />,
    },
    {
        path: "/support",
        element: <SupportPage />,
    },
    {
        path: "/announcements/admin",
        element: <AnnouncementsAdminPage />,
    },
    {
        path: "/tasks",
        element: <WorkTasksPage />,
    },
    {
        path: "/",
        element: <MyReports />,
    },
]
