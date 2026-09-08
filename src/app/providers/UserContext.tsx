import { UserInfoDto } from "@rds-network/portal-api-axios"
import React, { createContext, ReactNode, useEffect, useState } from "react"
import { LAST_LOGIN, USER } from "src/shared/constants/Storage"
import { defaultFunction } from "src/shared/lib/defaultFunction"
import { SimpleLocalStorageService } from "src/shared/localStorage/SimpleLocalStorageService"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"

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

    /**
     * Checks if user stored in localStorage was updated recently and retrieves it.
     * Otherwise, not setting user in context
     */
    useEffect(() => {
        let userExpired = true
        let lastLogin = new Date(SimpleLocalStorageService.getItem(LAST_LOGIN))
        if (lastLogin) {
            const current = new Date()
            const diffInMs = Math.abs(current.getTime() - lastLogin.getTime())
            const diffInMinutes = Math.floor(diffInMs / 1000 / 60)
            userExpired = diffInMinutes >= SESSION_DURATION
        }
        if (!userExpired) {
            let localUser = SimpleLocalStorageService.getItem(USER)
            if (localUser) {
                setUser(localUser)
            }
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        SimpleLocalStorageService.setItem(USER, user)
        SimpleLocalStorageService.setItem(LAST_LOGIN, new Date())
    }, [user])

    if (loading) {
        return <LoadingScreen />
    }

    return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}
