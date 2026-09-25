import { Select } from "@mantine/core"
import { UseFormReturnType } from "@mantine/form"
import { useQuery } from "@tanstack/react-query"
import React, { ReactNode, useEffect } from "react"
import { useIntl } from "react-intl"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { getLocalizedName } from "src/shared/utils/getLocalName"

type Props = {
    label?: ReactNode
    description?: ReactNode
    form?: UseFormReturnType<any>
    path?: string
    initialUsername?: string | null
}

export const CuratorSelect: React.FC<Props> = ({ label, description, form, path, initialUsername }) => {
    const intl = useIntl()
    const { data: rows = [] } = useQuery({
        queryKey: ["program-curators"],
        queryFn: () => ProgramCuratorApiService.list(),
    })

    const options = React.useMemo(() => {
        const byUser = new Map<string, { username: string; fullName: string; programs: typeof rows }>()
        rows.forEach((row) => {
            const current = byUser.get(row.username) ?? { username: row.username, fullName: row.fullName, programs: [] }
            current.programs.push(row)
            byUser.set(row.username, current)
        })
        return [...byUser.values()]
            .sort((a, b) => a.fullName.localeCompare(b.fullName, intl.locale))
            .map((item) => ({
                value: item.username,
                label: `${item.fullName} — ${item.programs
                    .map((row) =>
                        getLocalizedName(
                            { nameRu: row.programNameRu, nameEn: row.programNameEn, nameSr: row.programNameSr },
                            intl.locale
                        )
                    )
                    .join(", ")}`,
            }))
    }, [rows, intl.locale])

    useEffect(() => {
        if (form && path && initialUsername && !form.getValues()[path]) {
            form.setFieldValue(path, initialUsername)
        }
    }, [initialUsername])

    const inputProps = form && path ? form.getInputProps(path) : {}

    return (
        <Select
            label={label}
            description={description}
            data={options}
            searchable
            required
            withAsterisk
            clearable={false}
            allowDeselect={false}
            nothingFoundMessage={intl.formatMessage({ id: "pages.curators.none" })}
            key={form && path ? form.key(path) : undefined}
            {...inputProps}
        />
    )
}
