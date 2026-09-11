import React, { createContext, ReactNode, useMemo, useState } from "react"
import { defaultFunction } from "src/shared/lib/defaultFunction"

interface NavbarContextType {
    menuOpened: boolean
    setMenuOpened: React.Dispatch<React.SetStateAction<boolean>>
}

const defaultContextValue: NavbarContextType = {
    menuOpened: false,
    setMenuOpened: defaultFunction,
}

export const NavbarContext = createContext<NavbarContextType>(defaultContextValue)

export const NavbarContextProvider = ({ children }: { children?: ReactNode }) => {
    const [opened, setOpened] = useState(false)

    const value = useMemo(() => {
        const v: NavbarContextType = {
            menuOpened: opened,
            setMenuOpened: setOpened,
        }
        return v
    }, [opened])

    return <NavbarContext.Provider value={value}>{children}</NavbarContext.Provider>
}
