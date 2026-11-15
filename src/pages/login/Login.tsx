import { AxiosError } from "axios"
import { useContext, useEffect } from "react"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"

export const Login = () => {
    const { setUser } = useContext(UserContext)
    const navigate = useNavigate()

    useEffect(() => {
        UserApiService.getCurrentAccount()
            .then((res) => {
                setUser(res.data)
                navigate("/")
            })
            .catch((error: AxiosError) => {
                if (error.response?.status === 403) {
                    navigate("/unauthorized", { replace: true })
                }
            })
    }, [navigate, setUser])

    return <LoadingScreen />
}

export default Login
