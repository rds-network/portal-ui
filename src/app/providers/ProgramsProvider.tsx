import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { ProgramDto, ProgramsApi } from "@rds-network/portal-api-axios"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"

export const ProgramsContext = createContext<ProgramDto[]>([])

export function ProgramsProvider({
    children,
    apiService = ProgramsApiService,
}: {
    children: React.ReactNode
    apiService?: ProgramsApi
}) {
    const { data } = useQuery<ProgramDto[]>({
        queryKey: ["programs"],
        queryFn: async () => {
            const response = await apiService.getPrograms()
            return response.data
        },
        staleTime: Infinity,
    })

    return <ProgramsContext.Provider value={data ?? []}>{children}</ProgramsContext.Provider>
}

export function usePrograms() {
    return useContext(ProgramsContext)
}
