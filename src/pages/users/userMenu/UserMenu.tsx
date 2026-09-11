import { Loader, Menu } from "@mantine/core"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import {
    IconCheckupList,
    IconDotsVertical,
    IconEye,
    IconLock,
    IconLockOpen2,
    IconMessageCircle,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { locales } from "../lib/locales"
import classes from "./UserMenu.module.scss"

interface UserMenuProps {
    type?: "default" | "profile"
    user: UserInfoDto
}

export const UserMenu = ({ user, type = "default" }: UserMenuProps) => {
    const navigate = useNavigate()

    const [userDto, setUserDto] = useState(user)
    const [menuOpened, setMenuOpened] = useState<boolean>(false)
    const [emailDrawerOpen, setEmailDrawerOpen] = useState<boolean>(false)

    const { isFetching: isActivating, refetch: activate } = useQuery({
        enabled: false,
        queryKey: ["activate"],
        queryFn: () =>
            UserApiService.activateAccount(userDto.id).then(() => {
                window.location.reload()
            }),
    })

    const { isFetching: isDectivating, refetch: deactivate } = useQuery({
        enabled: false,
        queryKey: ["deactivate"],
        queryFn: () =>
            UserApiService.deactivateAccount(userDto.id).then(() => {
                window.location.reload()
            }),
    })

    return (
        <Menu
            opened={menuOpened}
            onOpen={() => setMenuOpened(true)}
            onClose={() => setMenuOpened(false)}
            shadow="md"
            width={200}
            closeOnItemClick={false}
        >
            <EmailDrawer
                opened={emailDrawerOpen}
                close={() => setEmailDrawerOpen(false)}
                recipients={[{ name: user.fullName, email: user.email }]}
            />
            <Menu.Target>
                <IconDotsVertical size={16} className={classes.dots} />
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>
                    <FormattedMessage id={locales.menuCommon} />
                </Menu.Label>
                {type === "default" && (
                    <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() => navigate(`/profile/${userDto.username}`)}
                    >
                        <FormattedMessage id={locales.menuView} />
                    </Menu.Item>
                )}
                <Menu.Item
                    leftSection={<IconMessageCircle size={14} />}
                    onClick={() => {
                        setMenuOpened(false)
                        setEmailDrawerOpen(true)
                    }}
                >
                    <FormattedMessage id={locales.menuContact} />
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconCheckupList size={14} />}
                    onClick={() => navigate(`/reports?login=${userDto.username}`)}
                >
                    <FormattedMessage id={locales.menuReports} />
                </Menu.Item>
                <Menu.Divider />

                <Menu.Label>
                    <FormattedMessage id={locales.menuControl} />
                </Menu.Label>
                {userDto.active && (
                    <Menu.Item
                        color="red"
                        leftSection={isDectivating ? <Loader size={14} /> : <IconLock size={14} />}
                        disabled={isActivating}
                        onClick={() => deactivate()}
                    >
                        <FormattedMessage id={locales.menuDeactivate} />
                    </Menu.Item>
                )}
                {!userDto.active && (
                    <Menu.Item
                        leftSection={isActivating ? <Loader size={14} /> : <IconLockOpen2 size={14} />}
                        disabled={isDectivating}
                        onClick={() => activate()}
                    >
                        <FormattedMessage id={locales.menuActivate} />
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    )
}
