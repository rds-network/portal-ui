import { Avatar, Button, Flex, Select, Text } from "@mantine/core"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { cacheApplication } from "src/shared/api/applications/useApplicationUpdate"
import { resolveUsers } from "src/shared/api/user/UserApiService"

export const ApplicationAssigneeSelect = ({
    application,
    disabled,
}: {
    application: ApplicationDto
    disabled?: boolean
}) => {
    const intl = useIntl()
    const { user } = useContext(UserContext)
    const queryClient = useQueryClient()
    const isWriting = useIsMutating({ mutationKey: ["writeApplication"] }) > 0
    const {
        data: employees = [],
        isPending: loading,
        isError,
    } = useQuery({
        queryKey: ["applicationAssignees"],
        queryFn: () => PrivateApplicationApiService.getApplicationAssignees().then((r) => r.data),
    })
    const { data: users = {} } = resolveUsers([application.assignee])
    const { mutate, isPending } = useMutation({
        mutationKey: ["writeApplication"],
        mutationFn: (assignee: string | null) =>
            PrivateApplicationApiService.assignApplication(application.id, { assignee }).then((r) => r.data),
        onSuccess: (updated) => cacheApplication(queryClient, updated),
    })
    const selected =
        employees.find((employee) => employee.username === application.assignee) || users[application.assignee || ""]
    const [search, setSearch] = useState("")
    useEffect(() => {
        setSearch(selected?.fullName || application.assignee || "")
    }, [application.assignee, selected?.fullName, isPending])
    const options = employees.map((employee) => ({ value: employee.username, label: employee.fullName }))
    if (application.assignee && !options.some((option) => option.value === application.assignee)) {
        options.push({ value: application.assignee, label: selected?.fullName || application.assignee })
    }

    const me = user?.username
    const canAssignToMe =
        !!me &&
        !application.assignee &&
        employees.some((employee) => employee.username.toLowerCase() === me.toLowerCase())
    const busy = disabled || isWriting || isPending || loading || isError

    return (
        <Flex direction="column" gap={6} miw={180} maw={260}>
            <Select
                label={intl.formatMessage({ id: "pages.applications.assignee" })}
                placeholder={intl.formatMessage({ id: "pages.applications.unassigned" })}
                searchable
                searchValue={search}
                onSearchChange={setSearch}
                clearable
                value={application.assignee || null}
                data={options}
                disabled={busy}
                error={isError ? intl.formatMessage({ id: "errors.request" }) : undefined}
                nothingFoundMessage={intl.formatMessage({ id: "pages.applications.noEmployees" })}
                clearButtonProps={{
                    "aria-label": intl.formatMessage({ id: "pages.applications.clearAssignee" }),
                    "aria-hidden": false,
                    tabIndex: 0,
                }}
                onChange={(login) => {
                    if (login !== (application.assignee || null)) mutate(login)
                }}
                leftSection={
                    <Avatar
                        size={22}
                        radius="xl"
                        src={selected?.avatar?.link}
                        name={selected?.fullName || application.assignee || undefined}
                    />
                }
                renderOption={({ option }) => {
                    const employee = employees.find((item) => item.username === option.value) || selected
                    return (
                        <Flex gap="sm" align="center">
                            <Avatar size={26} radius="xl" src={employee?.avatar?.link} name={option.label} />
                            <Text size="sm">
                                {option.label}
                            </Text>
                        </Flex>
                    )
                }}
            />
            {canAssignToMe && (
                <Button
                    size="compact-xs"
                    variant="light"
                    disabled={busy}
                    loading={isPending}
                    onClick={() => mutate(me)}
                >
                    <FormattedMessage id="pages.applications.assignToMe" />
                </Button>
            )}
        </Flex>
    )
}
