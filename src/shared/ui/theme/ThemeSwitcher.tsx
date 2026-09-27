import { ActionIcon, MantineColor, useComputedColorScheme, useMantineColorScheme } from "@mantine/core"
import { IconMoon, IconSun } from "@tabler/icons-react"

export const ThemeSwitcher = () => {
    const computedColorScheme = useComputedColorScheme("light")
    const { setColorScheme } = useMantineColorScheme({
        keepTransitions: true,
    })

    const switchColorScheme = () => {
        if (computedColorScheme === "light") {
            setColorScheme("dark")
        } else {
            setColorScheme("light")
        }
    }

    const getIcon = (currentTheme: "light" | "dark") => {
        if (currentTheme === "light") {
            return <IconMoon style={{ width: "50%", height: "50%" }} stroke={1.5} />
        } else {
            return <IconSun style={{ width: "60%", height: "60%" }} stroke={1.5} />
        }
    }

    const getColor = (currentTheme: "light" | "dark"): MantineColor => {
        if (currentTheme === "light") {
            return "blue"
        } else {
            return "green"
        }
    }

    return (
        <>
            <ActionIcon
                variant="light"
                color={getColor(computedColorScheme)}
                size="lg"
                radius="md"
                aria-label="Switch color scheme"
                onClick={switchColorScheme}
            >
                {getIcon(computedColorScheme)}
            </ActionIcon>
        </>
    )
}
