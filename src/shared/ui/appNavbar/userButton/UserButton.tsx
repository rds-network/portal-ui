import { Avatar, Flex, Text, UnstyledButton } from "@mantine/core"
import { IconChevronRight } from "@tabler/icons-react"
import { useContext } from "react"
import { UserContext } from "src/app/providers/UserContext"
import classes from "./UserButton.module.scss"

export function UserButton() {
    const { user } = useContext(UserContext)

    return (
        <UnstyledButton className={classes.user} component="a" href={`/profile/${user?.username}`}>
            <Flex justify="center" align="center" columnGap={12}>
                <Avatar src={user?.avatar?.link} radius="md" size={40} color="initials" name={user?.fullName} />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate="end">
                        {user?.fullName}
                    </Text>

                    <Text c="dimmed" size="xs" truncate="end">
                        {user?.email}
                    </Text>
                </div>

                <IconChevronRight className={classes.chevron} />
            </Flex>
        </UnstyledButton>
    )
}
