import { Checkbox, Select, Stack } from "@mantine/core"
import { UseFormReturnType } from "@mantine/form"
import { useQuery } from "@tanstack/react-query"
import React, { ReactNode, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
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

    const curatorUsernames = useMemo(() => new Set(rows.map((row) => row.username.toLowerCase())), [rows])

    const options = useMemo(() => {
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

    const currentValue = form && path ? (form.getValues()[path] as string | null) : null
    const [delegate, setDelegate] = useState(() => {
        const login = (initialUsername || currentValue || "").toLowerCase()
        return !!login && curatorUsernames.size > 0 && !curatorUsernames.has(login)
    })

    useEffect(() => {
        if (form && path && initialUsername && !form.getValues()[path]) {
            form.setFieldValue(path, initialUsername)
        }
    }, [initialUsername])

    useEffect(() => {
        const login = (currentValue || "").toLowerCase()
        if (login && curatorUsernames.size > 0 && !curatorUsernames.has(login)) {
            setDelegate(true)
        }
    }, [currentValue, curatorUsernames])

    const inputProps = form && path ? form.getInputProps(path) : {}

    return (
        <Stack gap="xs">
            {!delegate ? (
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
            ) : (
                <UserSearch
                    label={label}
                    description={<FormattedMessage id="pages.edit-report.task-customer-delegate-hint" />}
                    form={form}
                    path={path}
                    initialSearch={initialUsername || currentValue || ""}
                />
            )}
            <Checkbox
                label={<FormattedMessage id="pages.edit-report.task-customer-delegate" />}
                checked={delegate}
                onChange={(event) => {
                    const next = event.currentTarget.checked
                    setDelegate(next)
                    if (form && path) {
                        form.setFieldValue(path, next ? "" : options[0]?.value || "")
                    }
                }}
            />
        </Stack>
    )
}
