import { Button, Flex, Loader, Menu, Modal, Text, Textarea } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import {
    IconCheckupList,
    IconDotsVertical,
    IconEye,
    IconHandStop,
    IconLock,
    IconLockOpen2,
    IconMap,
    IconMessageCircle,
    IconPlayerPlay,
    IconShieldCheck,
    IconShieldOff,
} from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { AccountStatusApiService } from "src/shared/api/AccountStatusApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import {
    reportBlockOf,
    reportControllerNameOf,
    reportControlOf,
    UserAccountApiService,
    UserApiService,
} from "src/shared/api/user/UserApiService"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { locales } from "../lib/locales"
import classes from "./UserMenu.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

interface UserMenuProps {
    type?: "default" | "profile"
    user: UserInfoDto
    onChanged?: (user: UserInfoDto) => void
}

export const UserMenu = ({ user, type = "default", onChanged }: UserMenuProps) => {
    const navigate = useNavigate()
    const intl = useIntl()
    const queryClient = useQueryClient()
    const { user: currentUser } = useContext(UserContext)

    const [userDto, setUserDto] = useState(user)
    const [menuOpened, setMenuOpened] = useState<boolean>(false)
    const [emailDrawerOpen, setEmailDrawerOpen] = useState<boolean>(false)
    const [blockModalOpen, setBlockModalOpen] = useState<boolean>(false)
    const [blockReason, setBlockReason] = useState("")
    const [controlModalOpen, setControlModalOpen] = useState<boolean>(false)
    const [controllerLogin, setControllerLogin] = useState<string | null>(null)
    const [controlReason, setControlReason] = useState("")

    useEffect(() => setUserDto(user), [user])

    const { data: statusMeta } = useQuery({
        queryKey: ["account-status-meta"],
        queryFn: () => AccountStatusApiService.meta(),
        enabled: !!currentUser,
        staleTime: 5 * 60 * 1000,
    })
    const isStatusApprover = !!statusMeta?.isAccountStatusApprover

    const { mutate: changeActiveState, isPending: isChangingActive } = useMutation({
        mutationFn: async (requestedActive: boolean) => {
            if (isStatusApprover) {
                if (requestedActive) {
                    await UserApiService.activateAccount(userDto.id)
                } else {
                    await UserApiService.deactivateAccount(userDto.id)
                }
                return { pending: false as const }
            }
            const reason = window.prompt(intl.formatMessage({ id: "pages.account-status.reasonPrompt" }))
            if (reason === null) return { pending: false as const, cancelled: true as const }
            const result = await AccountStatusApiService.request({
                accountId: userDto.id,
                requestedActive,
                reason: reason.trim() || null,
            })
            return { pending: result.pending, cancelled: false as const }
        },
        onSuccess: (result) => {
            if (result.cancelled) return
            if (result.pending) {
                notifications.show(
                    SuccessNotification(
                        <Text size="sm">
                            <FormattedMessage id="pages.account-status.sentForApproval" />
                        </Text>,
                        null
                    )
                )
                setMenuOpened(false)
                return
            }
            window.location.reload()
        },
    })

    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!currentUser && !hasPermission(currentUser, MANAGERS),
    })

    // Куратор может ставить стоп только своим программам, но это решает бэкенд — здесь достаточно роли.
    const canManageReportBlock = hasPermission(currentUser, MANAGERS) || !!curatorMe?.curator
    const reportBlock = reportBlockOf(userDto)
    const controllerName = reportControllerNameOf(userDto)
    // Снять контроль может ещё и сам контролёр — остальное проверяет бэкенд.
    const canClearReportController =
        canManageReportBlock ||
        reportControlOf(userDto).reportControllerUsername?.toLowerCase() === currentUser?.username?.toLowerCase()

    const { mutate: changeReportBlock, isPending: isChangingReportBlock } = useMutation({
        mutationFn: (reason: string | null) =>
            reason === null
                ? UserAccountApiService.clearReportBlock(userDto.id)
                : UserAccountApiService.setReportBlock(userDto.id, reason),
        onSuccess: (updated) => {
            setUserDto(updated)
            setBlockModalOpen(false)
            setBlockReason("")
            setMenuOpened(false)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.profileUpdated" />
                    </Text>,
                    null
                )
            )
            queryClient.invalidateQueries({ queryKey: ["searchUsers"] })
            queryClient.invalidateQueries({ queryKey: ["getInfo"] })
            onChanged?.(updated)
        },
    })

    const { mutate: changeReportController, isPending: isChangingReportController } = useMutation({
        mutationFn: (payload: { login: string | null; reason?: string }) =>
            payload.login === null
                ? UserAccountApiService.clearReportController(userDto.id)
                : UserAccountApiService.setReportController(userDto.id, payload.login, payload.reason),
        onSuccess: (updated) => {
            setUserDto(updated)
            setControlModalOpen(false)
            setControllerLogin(null)
            setControlReason("")
            setMenuOpened(false)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.profileUpdated" />
                    </Text>,
                    null
                )
            )
            queryClient.invalidateQueries({ queryKey: ["searchUsers"] })
            queryClient.invalidateQueries({ queryKey: ["getInfo"] })
            queryClient.invalidateQueries({ queryKey: ["controlled-by-me"] })
            onChanged?.(updated)
        },
    })

    return (
        <Menu
            opened={menuOpened}
            onOpen={() => setMenuOpened(true)}
            onClose={() => setMenuOpened(false)}
            shadow="md"
            width={220}
            closeOnItemClick={false}
        >
            <EmailDrawer
                opened={emailDrawerOpen}
                close={() => setEmailDrawerOpen(false)}
                recipients={[{ name: user.fullName, email: user.email }]}
            />
            <Modal
                centered
                opened={blockModalOpen}
                onClose={() => setBlockModalOpen(false)}
                title={<FormattedMessage id={locales.menuReportBlock} />}
            >
                <Text size="sm" c="dimmed">
                    <FormattedMessage id={locales.reportBlockDescription} />
                </Text>
                <Textarea
                    mt="md"
                    minRows={3}
                    maxRows={6}
                    value={blockReason}
                    placeholder={intl.formatMessage({ id: locales.reportBlockReasonPlaceholder })}
                    onChange={(event) => setBlockReason(event.currentTarget.value)}
                />
                <Flex mt="md" gap="sm" justify="flex-end">
                    <Button variant="outline" onClick={() => setBlockModalOpen(false)}>
                        <FormattedMessage id={locales.reportBlockCancel} />
                    </Button>
                    <Button color="red" loading={isChangingReportBlock} onClick={() => changeReportBlock(blockReason)}>
                        <FormattedMessage id={locales.menuReportBlock} />
                    </Button>
                </Flex>
            </Modal>
            <Modal
                centered
                opened={controlModalOpen}
                onClose={() => setControlModalOpen(false)}
                title={<FormattedMessage id={locales.menuReportController} />}
            >
                <Text size="sm" c="dimmed">
                    <FormattedMessage id={locales.reportControllerDescription} />
                </Text>
                <UserSearch
                    label={<FormattedMessage id={locales.reportControllerLabel} />}
                    onUserChange={(picked) => setControllerLogin(picked?.username ?? null)}
                />
                <Textarea
                    mt="md"
                    minRows={3}
                    maxRows={6}
                    value={controlReason}
                    placeholder={intl.formatMessage({ id: locales.reportControllerReasonPlaceholder })}
                    onChange={(event) => setControlReason(event.currentTarget.value)}
                />
                <Flex mt="md" gap="sm" justify="flex-end">
                    <Button variant="outline" onClick={() => setControlModalOpen(false)}>
                        <FormattedMessage id={locales.reportBlockCancel} />
                    </Button>
                    <Button
                        color="teal"
                        disabled={!controllerLogin}
                        loading={isChangingReportController}
                        onClick={() =>
                            controllerLogin &&
                            changeReportController({ login: controllerLogin, reason: controlReason })
                        }
                    >
                        <FormattedMessage id={locales.reportControllerSubmit} />
                    </Button>
                </Flex>
            </Modal>
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
                <Menu.Item
                    leftSection={<IconMap size={14} />}
                    onClick={() =>
                        navigate(`/volunteers/heatmap?search=${encodeURIComponent(userDto.username)}`)
                    }
                >
                    <FormattedMessage id={locales.menuHeatmap} />
                </Menu.Item>
                <Menu.Divider />

                <Menu.Label>
                    <FormattedMessage id={locales.menuControl} />
                </Menu.Label>
                {canManageReportBlock && !reportBlock.reportBlocked && (
                    <Menu.Item
                        color="orange"
                        leftSection={<IconHandStop size={14} />}
                        disabled={isChangingReportBlock}
                        onClick={() => {
                            setMenuOpened(false)
                            setBlockModalOpen(true)
                        }}
                    >
                        <FormattedMessage id={locales.menuReportBlock} />
                    </Menu.Item>
                )}
                {canManageReportBlock && reportBlock.reportBlocked && (
                    <Menu.Item
                        leftSection={isChangingReportBlock ? <Loader size={14} /> : <IconPlayerPlay size={14} />}
                        disabled={isChangingReportBlock}
                        onClick={() => changeReportBlock(null)}
                    >
                        <FormattedMessage id={locales.menuReportUnblock} />
                    </Menu.Item>
                )}
                {canManageReportBlock && (
                    <Menu.Item
                        color="teal"
                        leftSection={<IconShieldCheck size={14} />}
                        disabled={isChangingReportController}
                        onClick={() => {
                            setMenuOpened(false)
                            setControlModalOpen(true)
                        }}
                    >
                        <FormattedMessage id={locales.menuReportController} />
                    </Menu.Item>
                )}
                {canClearReportController && !!controllerName && (
                    <Menu.Item
                        leftSection={
                            isChangingReportController ? <Loader size={14} /> : <IconShieldOff size={14} />
                        }
                        disabled={isChangingReportController}
                        onClick={() => changeReportController({ login: null })}
                    >
                        <FormattedMessage id={locales.menuReportControllerClear} />
                    </Menu.Item>
                )}
                {userDto.active && (
                    <Menu.Item
                        color="red"
                        leftSection={isChangingActive ? <Loader size={14} /> : <IconLock size={14} />}
                        disabled={isChangingActive}
                        onClick={() => changeActiveState(false)}
                    >
                        <FormattedMessage id={locales.menuDeactivate} />
                    </Menu.Item>
                )}
                {!userDto.active && (
                    <Menu.Item
                        leftSection={isChangingActive ? <Loader size={14} /> : <IconLockOpen2 size={14} />}
                        disabled={isChangingActive}
                        onClick={() => changeActiveState(true)}
                    >
                        <FormattedMessage id={locales.menuActivate} />
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    )
}
