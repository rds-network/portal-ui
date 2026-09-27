import { Select } from "@mantine/core"
import { useIntl } from "react-intl"
import { useProjects } from "src/app/providers/ProjectsProvider"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { locales } from "./lib/locales"
import { ProjectDto } from "@rds-network/portal-api-axios"

interface ProjectFilterProps {
    value: string | null
    onChange: (project: string | null) => void
    className?: string
    placeholder?: string
    projectsOverride?: ProjectDto[]
}

export function ProjectFilter({ value, onChange, className, placeholder, projectsOverride }: ProjectFilterProps) {
    const allProjects = useProjects()
    const projects = projectsOverride ?? allProjects
    const intl = useIntl()

    const projectOptions = [
        { value: "NO_PROJECT", label: intl.formatMessage({ id: locales.noProject }) },
        ...projects.map((project) => ({
            value: project.code,
            label: getLocalizedName(project, intl.locale),
        })),
    ]

    return (
        <Select
            data={projectOptions}
            value={value}
            onChange={onChange}
            placeholder={placeholder || intl.formatMessage({ id: locales.filterByProject })}
            clearable
            searchable
            className={className}
        />
    )
}
