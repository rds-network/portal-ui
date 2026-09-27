import { useQuery } from "@tanstack/react-query"
import React, { useContext, useEffect } from "react"
import { useLocation, useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { InboxApiService } from "src/shared/api/InboxApiService"

const ALLOWED = ["/messages", "/logout", "/support", "/login"]

export const InboxAckGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useContext(UserContext)
    const location = useLocation()
    const navigate = useNavigate()
    const { data: pending = 0 } = useQuery({
        queryKey: ["inbox-pending-ack"],
        queryFn: () => InboxApiService.pendingAckCount(),
        enabled: !!user,
        refetchInterval: 30_000,
    })

    useEffect(() => {
        if (!user || pending <= 0) return
        const allowed =
            ALLOWED.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`)) ||
            location.pathname.startsWith("/profile/")
        if (!allowed) {
            navigate("/messages", { replace: true })
        }
    }, [user, pending, location.pathname, navigate])

    return <>{children}</>
}
