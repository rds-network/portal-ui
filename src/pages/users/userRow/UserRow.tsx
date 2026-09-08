import classes from "src/pages/users/UserList.module.scss"
import { Avatar, Badge, Button, Flex, Table, Text } from "@mantine/core"
import { FormattedMessage, IntlShape } from "react-intl"
import { ProgramSelectInline } from "src/pages/profile/select/ProgramSelect"
import { ProjectSelectInline } from "src/pages/profile/select/ProjectSelect"
import { IconPencil, IconPlus } from "@tabler/icons-react"
import dayjs from "dayjs"
import { locales } from "src/pages/users/lib/locales"
import { UserMenu } from "src/pages/users/userMenu/UserMenu"
import React, { useEffect, useState } from "react"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { NavigateFunction } from "react-router"
import { IDBadge } from "src/shared/ui/badges/IDBadge"

type Props = {
    user: UserInfoDto
    canEditProgram: () => boolean
    canEditProject: (targetUserId: number) => boolean
    updateUserProgram: (variables: { userId: string; program: string }) => Promise<any> | void
    updateUserProject: (variables: { userId: string; project: string }) => Promise<any> | void
    intl: IntlShape
    navigate: NavigateFunction
    setDrawerOpened: (open: boolean) => void
    setSelectedUserId: (id: number | null) => void
}

export const UserRow = ({
    user,
    canEditProgram,
    canEditProject,
    updateUserProgram,
    updateUserProject,
    intl,
    navigate,
    setDrawerOpened,
    setSelectedUserId,
}: Props) => {
    const programValue = user?.program?.code ?? null
    const projectValue = user?.project?.code ?? null

    const [isSyncing, setIsSyncing] = useState(false)
    const [selectedProgram, setSelectedProgram] = useState<string | null>(programValue)
    const [selectedProject, setSelectedProject] = useState<string | null>(projectValue)

    useEffect(() => {
        setSelectedProgram(programValue)
        setSelectedProject(projectValue)
    }, [programValue, projectValue])

    const { programs, visiblePrograms, visibleProjects } = useProgramProjectFilter(selectedProgram, selectedProject)

    useEffect(() => {
        if (!selectedProgram || !selectedProject) return

        const program = programs.find((p) => p.code === selectedProgram)
        const allowed = program?.projectCodes ?? []

        if (!allowed.includes(selectedProject)) {
            setIsSyncing(true)
            setSelectedProject(null)
            setIsSyncing(false)
        }
    }, [selectedProgram, selectedProject, programs])

    const handleProgramChange = async (program: string) => {
        if (isSyncing) return

        const prevProgram = selectedProgram
        const prevProject = selectedProject

        setSelectedProgram(program)
        setSelectedProject(null)
        try {
            await updateUserProgram({ userId: String(user.id), program })
        } catch {
            setSelectedProgram(prevProgram)
            setSelectedProject(prevProject)
        }
    }

    const handleProjectChange = async (project: string) => {
        if (isSyncing) return

        const prevProject = selectedProject

        setSelectedProject(project)
        try {
            await updateUserProject({ userId: String(user.id), project })
        } catch {
            setSelectedProject(prevProject)
        }
    }

    const lastContract =
        Array.isArray(user.contracts) && user.contracts.length > 0
            ? user.contracts.reduce(
                  (max, c) => (new Date(c.endDate) > new Date(max.endDate) ? c : max),
                  user.contracts[0]
              )
            : undefined

    return (
        <Table.Tr
            key={user.id}
            className={!user.active ? classes.deactivatedRow : undefined}
            style={{ cursor: "pointer" }}
            onClick={() => {
                localStorage.setItem("userListState", window.location.search)
                navigate(`/profile/${user.username}`)
            }}
        >
            <Table.Td>
                <Flex columnGap={16} align="center" className={classes.columnName}>
                    <Avatar size={36} src={user.avatar?.link} name={user.fullName} className={classes.avatar} />
                    <Flex direction="column" miw={0}>
                        <Text truncate="end">{user.fullName}</Text>
                        <Text size="sm" c="dimmed" truncate="end">
                            {user.email}
                        </Text>
                        <IDBadge id={user.id} />
                    </Flex>
                </Flex>
            </Table.Td>
            <Table.Td>
                <Flex align="start" direction="column">
                    {user.groups.map((group) => (
                        <Text key={group} className={classes.role} truncate="end">
                            <FormattedMessage id={`common.roles.${group}`} />
                        </Text>
                    ))}
                </Flex>
            </Table.Td>
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <ProgramSelectInline
                    type="button"
                    value={selectedProgram}
                    canEdit={canEditProgram()}
                    locale={intl.locale}
                    onChange={handleProgramChange}
                    programsOverride={visiblePrograms}
                />
            </Table.Td>
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <ProjectSelectInline
                    type="button"
                    value={selectedProject}
                    canEdit={canEditProject(user.id)}
                    locale={intl.locale}
                    onChange={handleProjectChange}
                    projectsOverride={visibleProjects}
                />
            </Table.Td>
            <Table.Td>
                <Button
                    variant="transparent"
                    color={lastContract ? "blue" : "gray"}
                    rightSection={lastContract ? <IconPencil size={14} /> : <IconPlus size={14} />}
                    onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUserId(user.id)
                        setDrawerOpened(true)
                    }}
                    size="compact-sm"
                    fw={lastContract ? undefined : 500}
                >
                    {lastContract ? (
                        dayjs(lastContract.endDate).format("DD MMM YYYY")
                    ) : (
                        <FormattedMessage id="pages.profile.contract.button" />
                    )}
                </Button>
            </Table.Td>
            <Table.Td>
                <Flex align="center" justify="end">
                    {!user.active && (
                        <Badge color="red" radius="md" variant="light">
                            <FormattedMessage id={locales.deactivated} />
                        </Badge>
                    )}
                    <div className={classes.menuWrapper} onClick={(e) => e.stopPropagation()}>
                        <UserMenu user={user} />
                    </div>
                </Flex>
            </Table.Td>
        </Table.Tr>
    )
}
