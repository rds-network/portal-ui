import { lazy, Suspense, useContext } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"

const PrivateApp = lazy(() => import("src/app/PrivateApp"))
const PublicApp = lazy(() => import("src/app/PublicApp"))
const Login = lazy(() => import("src/pages/login/Login"))
const NotFound = lazy(() => import("src/pages/notFound/NotFound"))
const Unauthorized = lazy(() => import("src/pages/unauthorized/UnauthorizedPage"))
const ZahvalnicaVerifyPage = lazy(() => import("src/pages/zahvalnica/ZahvalnicaVerifyPage"))

const RootRouter = () => {
    const { user } = useContext(UserContext)
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/not-found" element={<NotFound />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/zahvalnica/verify" element={<ZahvalnicaVerifyPage />} />
                    {user && <Route path="*" element={<PrivateApp />} />}
                    <Route path="*" element={<PublicApp />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}

export default RootRouter
