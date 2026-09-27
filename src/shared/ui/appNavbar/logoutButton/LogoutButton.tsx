import { UnstyledButton } from "@mantine/core"
import { IconLogout } from "@tabler/icons-react"
import React from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import classes from "./LogoutButton.module.scss"

export const LogoutButton = () => {
    const navigate = useNavigate()

    return (
        <UnstyledButton className={classes.item} onClick={() => navigate("/logout")}>
            <span className={classes.icon}>
                <IconLogout width={18} height={18} stroke={1.6} />
            </span>
            <span className={classes.label}>
                <FormattedMessage id="common.buttons.logout" />
            </span>
        </UnstyledButton>
    )
}
