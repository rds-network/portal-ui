import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { OfficialGroupDto } from "@rds-network/portal-api-axios"
import { OfficialGroupApiService } from "src/shared/api/OfficialGroupApiService"

const OfficialGroupContext = createContext<OfficialGroupDto[]>([])

export function OfficialGroupProvider({ children }: { children: React.ReactNode }) {
    const { data } = useQuery<OfficialGroupDto[]>({
        queryKey: ["officialGroups"],
        queryFn: async () => {
            const response = await OfficialGroupApiService.getOfficialGroup()
            return response.data
        },
        staleTime: Infinity,
    })

    return <OfficialGroupContext.Provider value={data ?? []}>{children}</OfficialGroupContext.Provider>
}

export function useOfficialGroup() {
    return useContext(OfficialGroupContext)
}
