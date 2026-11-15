import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router"
import { ImpersonationApiService } from "src/shared/api/ImpersonationApiService"

const STAFF_PREFIXES = [
    "/achievements/missions",
    "/reports/review",
    "/reports/overdue",
    "/reports/dissolution",
    "/reports/account-status",
    "/volunteers",
    "/applications",
    "/curators",
    "/announcements",
    "/zahvalnica",
    "/activity",
    "/settings/maintenance",
    "/settings/application-join",
]

const isStaffPath = (pathname: string) => {
    if (pathname === "/reports") return true
    return STAFF_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** В режиме «смотреть как волонтёр» служебные адреса закрыты, даже если открыть их напрямую. */
export const ImpersonationRouteGuard = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { data: impersonation } = useQuery({
        queryKey: ["impersonation-status"],
        queryFn: () => ImpersonationApiService.status(),
        staleTime: 30_000,
    })

    useEffect(() => {
        if (impersonation?.active && isStaffPath(location.pathname)) {
            navigate("/", { replace: true })
        }
    }, [impersonation?.active, location.pathname, navigate])

    return null
}
