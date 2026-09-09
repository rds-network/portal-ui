import { Button, Flex } from "@mantine/core"
import { IconLogin2 } from "@tabler/icons-react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import classes from "./LoginButton.module.scss"

export const LoginButton = () => {
    const navigate = useNavigate()

    return (
        <>
            <Button
                variant="light"
                color="ocean"
                radius="md"
                rightSection={<IconLogin2 size={18} />}
                onClick={() => navigate("/login")}
            >
                <Flex className={classes.text}>
                    <FormattedMessage id="common.buttons.login" />
                </Flex>
            </Button>
        </>
    )
}
