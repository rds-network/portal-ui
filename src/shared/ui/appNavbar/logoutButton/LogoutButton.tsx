import { Box, Group, ThemeIcon, UnstyledButton } from "@mantine/core"
import { IconLogout } from "@tabler/icons-react"
import React from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import classes from "./LogoutButton.module.scss"

export const LogoutButton = () => {
    const navigate = useNavigate()

    return (
        <>
            <UnstyledButton className={classes.container} onClick={() => navigate("/logout")}>
                <Group justify="space-between">
                    <Box className={classes.button}>
                        <ThemeIcon variant="light" size="lg" color="red" radius="md">
                            <IconLogout width={18} height={18} />
                        </ThemeIcon>
                        <Box ml="md">
                            <FormattedMessage id="common.buttons.logout" />
                        </Box>
                    </Box>
                </Group>
            </UnstyledButton>
        </>
    )
}
