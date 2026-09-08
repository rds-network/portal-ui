import { Avatar, Flex, Select, Text } from "@mantine/core"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useIntl } from "react-intl"
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

    return (
        <Select
            label={intl.formatMessage({ id: "pages.applications.assignee" })}
            placeholder={intl.formatMessage({ id: "pages.applications.unassigned" })}
            searchable
            searchValue={search}
            onSearchChange={setSearch}
            clearable
            value={application.assignee || null}
            data={options}
            disabled={disabled || isWriting || isPending || loading || isError}
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
                        <Text size="sm">{option.label}</Text>
                    </Flex>
                )
            }}
        />
    )
}
