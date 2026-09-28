import { UserInfoDto } from "@rds-network/portal-api-axios"
import React, { createContext, ReactNode, useEffect, useState } from "react"
import { LAST_LOGIN, USER } from "src/shared/constants/Storage"
import { defaultFunction } from "src/shared/lib/defaultFunction"
import { SimpleLocalStorageService } from "src/shared/localStorage/SimpleLocalStorageService"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"
import { checkUserForApplication } from "src/shared/api/user/UserApiService"

interface UserContextType {
    user: UserInfoDto | null
    setUser: React.Dispatch<React.SetStateAction<UserInfoDto | null>>
}

const defaultContextValue: UserContextType = {
    user: null,
    setUser: defaultFunction,
}

const SESSION_DURATION: number = 2 * 24 * 60 // 48 hours

export const UserContext = createContext<UserContextType>(defaultContextValue)

export const UserContextProvider = ({ children }: { children?: ReactNode }) => {
    const [user, setUser] = useState<UserInfoDto | null>(null)
    const [loading, setLoading] = useState(true)
    const [hydrated, setHydrated] = useState(false)

    /**
     * Hydrate from localStorage for a fast first paint, then refresh from
     * getCurrentAccount so impersonation/effective groups are never stale.
     * Uses SimpleRequestHttp (no OAuth redirect on 401) so public routes like
     * /application work for anonymous applicants without an Authentik account.
     */
    useEffect(() => {
        let cancelled = false
        let userExpired = true
        const lastLoginRaw = SimpleLocalStorageService.getItem(LAST_LOGIN)
        const lastLogin = lastLoginRaw ? new Date(lastLoginRaw) : null
        if (lastLogin && !Number.isNaN(lastLogin.getTime())) {
            const diffInMinutes = Math.floor(Math.abs(Date.now() - lastLogin.getTime()) / 1000 / 60)
            userExpired = diffInMinutes >= SESSION_DURATION
        }
        if (!userExpired) {
            const localUser = SimpleLocalStorageService.getItem(USER) || null
            if (localUser && !cancelled) {
                setUser(localUser)
            }
        }

        checkUserForApplication()
            .then((res) => {
                if (!cancelled) setUser(res.data)
            })
            .catch(() => {
                // Not authenticated / network — keep local hydrate or null (no SSO redirect)
            })
            .finally(() => {
                if (!cancelled) {
                    setHydrated(true)
                    setLoading(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!hydrated) return
        SimpleLocalStorageService.setItem(USER, user)
        SimpleLocalStorageService.setItem(LAST_LOGIN, new Date())
    }, [user, hydrated])

    if (loading) {
        return <LoadingScreen />
    }

    return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}
