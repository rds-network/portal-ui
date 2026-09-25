import { Select } from "@mantine/core"
import { ProgramDto } from "@rds-network/portal-api-axios"
import { ReactNode, useRef, useState } from "react"
import { useIntl } from "react-intl"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { locales } from "./lib/locales"

interface ProgramFilterProps {
    value: string | null
    onChange: (program: string | null) => void
    className?: string
    placeholder?: string
    label?: ReactNode
    programsOverride?: ProgramDto[]
}

export function ProgramFilter({
    value,
    onChange,
    className,
    placeholder,
    label,
    programsOverride,
}: ProgramFilterProps) {
    const allPrograms = usePrograms()
    const programs = programsOverride ?? allPrograms
    const intl = useIntl()
    const [search, setSearch] = useState("")
    const selectRef = useRef<HTMLInputElement>(null)

    const programOptions = [
        { value: "NO_PROGRAM", label: intl.formatMessage({ id: locales.noProgram }) },
        ...programs.map((program) => ({
            value: program.code.toUpperCase(),
            label: getLocalizedName(program, intl.locale),
        })),
    ]

    const handleChange = (newValue: string | null) => {
        onChange(newValue)
    }

    return (
        <Select
            ref={selectRef}
            label={label}
            data={programOptions}
            value={value}
            onChange={handleChange}
            placeholder={placeholder || intl.formatMessage({ id: locales.filterByProgram })}
            clearable
            searchable
            maxDropdownHeight={400}
            searchValue={search}
            onSearchChange={setSearch}
            className={className}
        />
    )
}
