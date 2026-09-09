import { Select } from "@mantine/core"
import { IconUser } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { useIntl } from "react-intl"
import { UNASSIGNED_ASSIGNEE } from "src/pages/applications/lib/defaults"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"

export const ApplicationAssigneeFilter = ({
    value,
    onChange,
    size,
    className,
}: {
    value: string | null
    onChange: (value: string | null) => void
    size: "sm" | "md"
    className?: string
}) => {
    const intl = useIntl()
    const {
        data: employees = [],
        isPending,
        isError,
    } = useQuery({
        queryKey: ["applicationAssignees"],
        queryFn: () => PrivateApplicationApiService.getApplicationAssignees().then((response) => response.data),
    })
    const { data: users = {} } = resolveUsers([value === UNASSIGNED_ASSIGNEE ? null : value])
    const options = [
        { value: UNASSIGNED_ASSIGNEE, label: intl.formatMessage({ id: "pages.applications.unassignedApplications" }) },
        ...employees.map((employee) => ({ value: employee.username, label: employee.fullName })),
    ]
    if (value && !options.some((option) => option.value === value)) {
        options.push({ value, label: users[value]?.fullName || value })
    }

    return (
        <Select
            aria-label={intl.formatMessage({ id: "pages.applications.assignee" })}
            placeholder={intl.formatMessage({ id: "pages.applications.allAssignees" })}
            leftSection={<IconUser size={18} aria-hidden="true" />}
            leftSectionPointerEvents="none"
            searchable
            clearable
            value={value}
            onChange={onChange}
            data={options}
            disabled={isPending && !value}
            error={isError ? intl.formatMessage({ id: "errors.request" }) : undefined}
            nothingFoundMessage={intl.formatMessage({ id: "pages.applications.noEmployees" })}
            clearButtonProps={{
                "aria-label": intl.formatMessage({ id: "pages.applications.clearAssigneeFilter" }),
                "aria-hidden": false,
                tabIndex: 0,
            }}
            size={size}
            radius="md"
            className={className}
        />
    )
}
