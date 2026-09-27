import { useMemo } from "react"
import { ProgramDto, ProjectDto } from "@rds-network/portal-api-axios"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { useProjects } from "src/app/providers/ProjectsProvider"
import { NO_PROGRAM_CODE, NO_PROJECT_CODE } from "src/shared/constants/Shared"

export function useProgramProjectFilter(selectedProgram: string | null, selectedProject: string | null) {
    const programs = usePrograms()
    const projects = useProjects()

    const normalizedProgram = selectedProgram && selectedProgram !== NO_PROGRAM_CODE ? selectedProgram : null
    const normalizedProject = selectedProject && selectedProject !== NO_PROJECT_CODE ? selectedProject : null

    const { visiblePrograms, visibleProjects } = useMemo(() => {
        let visiblePrograms: ProgramDto[] = programs
        let visibleProjects: ProjectDto[] = projects

        if (normalizedProgram) {
            const program = programs.find((p) => p.code.toUpperCase() === normalizedProgram)

            const allowedProjectCodes = program?.projectCodes ?? []

            if (allowedProjectCodes.length > 0) {
                visibleProjects = projects.filter((p) => allowedProjectCodes.includes(p.code))
            } else {
                visibleProjects = []
            }
        }

        return { visiblePrograms, visibleProjects }
    }, [programs, projects, normalizedProgram, normalizedProject])

    return { programs, projects, visiblePrograms, visibleProjects }
}
