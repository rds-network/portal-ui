import { Popover, Text, UnstyledButton } from "@mantine/core"
import { IconHelpCircle } from "@tabler/icons-react"
import { useEffect, useRef, useState } from "react"
import classes from "./ApplicationRow.module.scss"

export const ApplicationStatusReason = ({ label, reason }: { label: string; reason: string }) => {
    const [opened, setOpened] = useState(false)
    const closeTimer = useRef<ReturnType<typeof setTimeout>>()

    const open = () => {
        clearTimeout(closeTimer.current)
        setOpened(true)
    }
    const close = () => {
        clearTimeout(closeTimer.current)
        setOpened(false)
    }
    const closeAfterDelay = () => {
        clearTimeout(closeTimer.current)
        closeTimer.current = setTimeout(close, 180)
    }

    useEffect(() => () => clearTimeout(closeTimer.current), [])
    useEffect(() => {
        if (!opened) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                clearTimeout(closeTimer.current)
                setOpened(false)
            }
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [opened])

    return (
        <Popover
            opened={opened}
            onChange={(next) => (next ? open() : close())}
            position="bottom-end"
            width={320}
            withArrow
            shadow="md"
            withinPortal
        >
            <Popover.Target>
                <UnstyledButton
                    className={classes.reasonIndicator}
                    aria-label={label}
                    onMouseEnter={open}
                    onMouseLeave={closeAfterDelay}
                    onFocus={open}
                    onBlur={closeAfterDelay}
                    onClick={open}
                >
                    <IconHelpCircle size={19} stroke={1.6} aria-hidden="true" />
                </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown
                className={classes.reasonPopover}
                onMouseEnter={open}
                onMouseLeave={closeAfterDelay}
                onFocusCapture={open}
                onBlurCapture={closeAfterDelay}
                onClick={(event) => event.stopPropagation()}
            >
                <Text size="sm" fw={600} mb={8}>
                    {label}
                </Text>
                <Text size="sm" className={classes.reasonText} tabIndex={0}>
                    {reason}
                </Text>
            </Popover.Dropdown>
        </Popover>
    )
}
