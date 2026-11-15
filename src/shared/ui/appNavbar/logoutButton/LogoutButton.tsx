import { UnstyledButton } from "@mantine/core"
import { IconLogout } from "@tabler/icons-react"
import React from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import classes from "./LogoutButton.module.scss"

export const LogoutButton = ({ compact = false }: { compact?: boolean } = {}) => {
    const navigate = useNavigate()

    return (
        <UnstyledButton
            className={compact ? `${classes.item} ${classes.itemCompact}` : classes.item}
            onClick={() => navigate("/logout")}
            title="Logout"
        >
            <span className={classes.icon}>
                <IconLogout width={18} height={18} stroke={1.6} />
            </span>
            {!compact && (
                <span className={classes.label}>
                    <FormattedMessage id="common.buttons.logout" />
                </span>
            )}
        </UnstyledButton>
    )
}
