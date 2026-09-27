import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { ProjectDto, ProjectsApi } from "@rds-network/portal-api-axios"
import { ProjectsApiService } from "src/shared/api/ProjectsApiService"

export const ProjectsContext = createContext<ProjectDto[]>([])

export function ProjectsProvider({
    children,
    apiService = ProjectsApiService,
}: {
    children: React.ReactNode
    apiService?: ProjectsApi
}) {
    const { data } = useQuery<ProjectDto[]>({
        queryKey: ["projects"],
        queryFn: async () => {
            const response = await apiService.getProjects()
            return response.data
        },
        staleTime: Infinity,
    })

    return <ProjectsContext.Provider value={data ?? []}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
    return useContext(ProjectsContext)
}
