import { Button, Card, Flex, Select, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconTrash } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"
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
    const [program, setProgram] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)

    setDocumentTitleByLocale("pages.curators.title")

    useEffect(() => {
        if (user && !hasPermission(user, MANAGERS)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    const { data: rows = [] } = useQuery({
        queryKey: ["program-curators"],
        queryFn: () => ProgramCuratorApiService.list(),
    })

    const { data: programs = [] } = useQuery({
        queryKey: ["programs"],
        queryFn: () => ProgramsApiService.getPrograms().then((response) => response.data),
    })

    const grouped = useMemo(() => {
        const map = new Map<string, typeof rows>()
        rows.forEach((row) => {
            const list = map.get(row.programCode) ?? []
            list.push(row)
            map.set(row.programCode, list)
        })
        return programs
            .map((item) => ({
                program: item,
                curators: map.get(item.code) ?? [],
            }))
            .filter((item) => item.curators.length > 0 || item.program.code)
    }, [programs, rows])

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["program-curators"] })

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

            <div className={classes.grid}>
                {grouped.map((item) => (
                    <Card key={item.program.code} withBorder radius="lg" p="md" className={classes.card}>
                        <Text fw={650}>{getLocalizedName(item.program, intl.locale)}</Text>
                        {item.curators.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id="pages.curators.empty" />
                            </Text>
                        ) : (
                            item.curators.map((curator) => (
                                <div key={`${curator.programCode}-${curator.username}`} className={classes.person}>
                                    <div>
                                        <Text fw={600}>{curator.fullName}</Text>
                                        <Text size="xs" c="dimmed">
                                            {curator.username}
                                        </Text>
                                    </div>
                                    <Button
                                        size="compact-sm"
                                        variant="subtle"
                                        color="red"
                                        leftSection={<IconTrash size={14} />}
                                        onClick={() =>
                                            remove({ programCode: curator.programCode, login: curator.username })
                                        }
                                    >
                                        <FormattedMessage id="pages.curators.remove" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </Card>
                ))}
            </div>
        </Flex>
    )
}

export default CuratorsPage
