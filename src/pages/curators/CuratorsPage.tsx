import { Avatar, Button, Card, Flex, Select, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconTrash, IconUserPlus } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./CuratorsPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.ADMIN_SSO, UserGroup.MAIN_VOLUNTEER]

export const CuratorsPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const isManager = hasPermission(user, MANAGERS)
    const [program, setProgram] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [delegateFor, setDelegateFor] = useState<{ programCode: string; curatorUsername: string } | null>(null)
    const [delegateUsername, setDelegateUsername] = useState<string | null>(null)

    setDocumentTitleByLocale("pages.curators.title")

    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })

    useEffect(() => {
        if (!user) return
        if (!isManager && !curatorMe?.curator) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate, isManager, curatorMe?.curator])

    const { data: rows = [] } = useQuery({
        queryKey: ["program-curators"],
        queryFn: () => ProgramCuratorApiService.list(),
    })
    const { data: delegates = [] } = useQuery({
        queryKey: ["program-curators", "delegates"],
        queryFn: () => ProgramCuratorApiService.delegates(),
    })

    const { data: programs = [] } = useQuery({
        queryKey: ["programs"],
        queryFn: () => ProgramsApiService.getPrograms().then((response) => response.data),
    })

    const visibleRows = useMemo(() => {
        if (isManager) return rows
        const mine = new Set((curatorMe?.programs || []).map((code) => code.toUpperCase()))
        return rows.filter(
            (row) =>
                mine.has(row.programCode.toUpperCase()) &&
                row.username.toLowerCase() === (user?.username || "").toLowerCase()
        )
    }, [rows, isManager, curatorMe?.programs, user?.username])

    const avatarLogins = useMemo(
        () => [...visibleRows.map((row) => row.username), ...delegates.map((row) => row.delegateUsername)],
        [visibleRows, delegates]
    )

    const { data: users = {} } = resolveUsers(avatarLogins)

    const userOf = (login: string) =>
        users[login] || users[Object.keys(users).find((key) => key.toLowerCase() === login.toLowerCase()) || ""]

    const grouped = useMemo(() => {
        const map = new Map<string, typeof visibleRows>()
        visibleRows.forEach((row) => {
            const list = map.get(row.programCode) ?? []
            list.push(row)
            map.set(row.programCode, list)
        })
        return programs
            .map((item) => ({
                program: item,
                curators: map.get(item.code) ?? [],
            }))
            .filter((item) => item.curators.length > 0 || (isManager && item.program.code))
    }, [programs, visibleRows, isManager])

    const delegatesOf = (programCode: string, curatorUsername: string) =>
        delegates.filter(
            (item) =>
                item.programCode === programCode &&
                item.curatorUsername.toLowerCase() === curatorUsername.toLowerCase()
        )

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["program-curators"] })
        queryClient.invalidateQueries({ queryKey: ["program-curators", "approvers"] })
    }

    const { mutate: assign, isPending } = useMutation({
        mutationFn: () =>
            ProgramCuratorApiService.assign({
                programCode: program!,
                username: username!,
            }),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.curators.saved" />
                    </Text>,
                    null
                )
            )
            setUsername(null)
            refresh()
        },
    })

    const { mutate: remove } = useMutation({
        mutationFn: ({ programCode, login }: { programCode: string; login: string }) =>
            ProgramCuratorApiService.remove(programCode, login),
        onSuccess: refresh,
    })

    const { mutate: assignDelegate, isPending: assigningDelegate } = useMutation({
        mutationFn: () =>
            ProgramCuratorApiService.assignDelegate({
                programCode: delegateFor!.programCode,
                curatorUsername: delegateFor!.curatorUsername,
                delegateUsername: delegateUsername!,
            }),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.curators.delegateSaved" />
                    </Text>,
                    null
                )
            )
            setDelegateFor(null)
            setDelegateUsername(null)
            refresh()
        },
    })

    const { mutate: removeDelegate } = useMutation({
        mutationFn: (payload: { programCode: string; curatorUsername: string; delegateUsername: string }) =>
            ProgramCuratorApiService.removeDelegate(
                payload.programCode,
                payload.curatorUsername,
                payload.delegateUsername
            ),
        onSuccess: refresh,
    })

    const canDelegate = (curatorUsername: string) =>
        isManager || curatorUsername.toLowerCase() === (user?.username || "").toLowerCase()

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.curators.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.curators.description" />
                </Text>
            </div>

            {isManager && (
                <Card withBorder radius="lg" p="md" className={classes.card}>
                    <Select
                        label={<FormattedMessage id="pages.curators.program" />}
                        data={programs.map((item) => ({
                            value: item.code,
                            label: getLocalizedName(item, intl.locale),
                        }))}
                        value={program}
                        onChange={setProgram}
                        searchable
                        clearable
                    />
                    <UserSearch
                        key={program ?? "curator"}
                        label={<FormattedMessage id="pages.curators.person" />}
                        onUserChange={(picked) => setUsername(picked?.username ?? null)}
                    />
                    <Button
                        w="fit-content"
                        disabled={!program || !username}
                        loading={isPending}
                        onClick={() => assign()}
                    >
                        <FormattedMessage id="pages.curators.assign" />
                    </Button>
                </Card>
            )}

            <div className={classes.grid}>
                {grouped.map((item) => (
                    <Card key={item.program.code} withBorder radius="lg" p="md" className={classes.card}>
                        <Text fw={650}>{getLocalizedName(item.program, intl.locale)}</Text>
                        {item.curators.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id="pages.curators.empty" />
                            </Text>
                        ) : (
                            item.curators.map((curator) => {
                                const mine = delegatesOf(curator.programCode, curator.username)
                                const open =
                                    delegateFor?.programCode === curator.programCode &&
                                    delegateFor?.curatorUsername === curator.username
                                return (
                                    <div
                                        key={`${curator.programCode}-${curator.username}`}
                                        className={classes.curatorBlock}
                                    >
                                        <div className={classes.person}>
                                            <div className={classes.personMain}>
                                                <Avatar
                                                    src={userOf(curator.username)?.avatar?.link}
                                                    name={curator.fullName || curator.username}
                                                    size={36}
                                                    radius="xl"
                                                    color="initials"
                                                />
                                                <div>
                                                    <Text fw={600}>{curator.fullName}</Text>
                                                    <Text size="xs" c="dimmed">
                                                        {curator.username}
                                                    </Text>
                                                </div>
                                            </div>
                                            {isManager && (
                                                <Button
                                                    size="compact-sm"
                                                    variant="subtle"
                                                    color="red"
                                                    leftSection={<IconTrash size={14} />}
                                                    onClick={() =>
                                                        remove({
                                                            programCode: curator.programCode,
                                                            login: curator.username,
                                                        })
                                                    }
                                                >
                                                    <FormattedMessage id="pages.curators.remove" />
                                                </Button>
                                            )}
                                        </div>
                                        <Text size="xs" c="dimmed" mt={4}>
                                            <FormattedMessage id="pages.curators.delegates" />
                                        </Text>
                                        {mine.length === 0 ? (
                                            <Text size="xs" c="dimmed">
                                                <FormattedMessage id="pages.curators.noDelegates" />
                                            </Text>
                                        ) : (
                                            mine.map((row) => (
                                                <div
                                                    key={`${row.programCode}-${row.delegateUsername}`}
                                                    className={classes.delegate}
                                                >
                                                    <div className={classes.personMain}>
                                                        <Avatar
                                                            src={userOf(row.delegateUsername)?.avatar?.link}
                                                            name={row.delegateFullName || row.delegateUsername}
                                                            size={28}
                                                            radius="xl"
                                                            color="initials"
                                                        />
                                                        <div>
                                                            <Text size="sm">{row.delegateFullName}</Text>
                                                            <Text size="xs" c="dimmed">
                                                                {row.delegateUsername}
                                                            </Text>
                                                        </div>
                                                    </div>
                                                    {canDelegate(curator.username) && (
                                                        <Button
                                                            size="compact-xs"
                                                            variant="subtle"
                                                            color="red"
                                                            onClick={() =>
                                                                removeDelegate({
                                                                    programCode: row.programCode,
                                                                    curatorUsername: row.curatorUsername,
                                                                    delegateUsername: row.delegateUsername,
                                                                })
                                                            }
                                                        >
                                                            <FormattedMessage id="pages.curators.delegateRemove" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        {canDelegate(curator.username) && (
                                            open ? (
                                                <div className={classes.delegateForm}>
                                                    <UserSearch
                                                        key={`${curator.programCode}-${curator.username}-delegate`}
                                                        label={<FormattedMessage id="pages.curators.delegateTo" />}
                                                        onUserChange={(picked) =>
                                                            setDelegateUsername(picked?.username ?? null)
                                                        }
                                                    />
                                                    <Flex gap="xs">
                                                        <Button
                                                            size="xs"
                                                            disabled={!delegateUsername}
                                                            loading={assigningDelegate}
                                                            onClick={() => assignDelegate()}
                                                        >
                                                            <FormattedMessage id="pages.curators.delegateAssign" />
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="subtle"
                                                            onClick={() => {
                                                                setDelegateFor(null)
                                                                setDelegateUsername(null)
                                                            }}
                                                        >
                                                            ×
                                                        </Button>
                                                    </Flex>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="compact-xs"
                                                    variant="light"
                                                    leftSection={<IconUserPlus size={14} />}
                                                    onClick={() =>
                                                        setDelegateFor({
                                                            programCode: curator.programCode,
                                                            curatorUsername: curator.username,
                                                        })
                                                    }
                                                >
                                                    <FormattedMessage id="pages.curators.delegate" />
                                                </Button>
                                            )
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </Card>
                ))}
            </div>
        </Flex>
    )
}

export default CuratorsPage
