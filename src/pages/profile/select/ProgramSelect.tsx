import { ActionIcon, Button, Group, Select, Text, useComputedColorScheme } from "@mantine/core"
import { IconPencil, IconPlus } from "@tabler/icons-react"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { ProgramDto } from "@rds-network/portal-api-axios"

export function ProgramSelectInline({
    value,
    canEdit,
    type = "default",
    onChange,
    locale,
    programsOverride,
}: {
    value: string | null | undefined
    canEdit: boolean
    type?: "default" | "button"
    onChange: (program: string) => void
    locale: string
    programsOverride?: ProgramDto[]
}) {
    const allPrograms = usePrograms()
    const programs = programsOverride ?? allPrograms
    const intl = useIntl()
    const [isEditing, setIsEditing] = useState(false)
    const [isDropdownOpened, setDropdownOpened] = useState(false)
    const colorScheme = useComputedColorScheme("light")

    const programOptions = programs.map((program) => ({
        value: program.code,
        label: getLocalizedName(program, locale),
    }))

    const programObj = programs.find((p) => p.code === value)

    return (
        <Group gap={4} align="center" wrap="nowrap">
            {isEditing ? (
                <Select
                    data={programOptions}
                    value={value || null}
                    onChange={(val) => {
                        if (val) {
                            onChange(val)
                            setIsEditing(false)
                        }
                    }}
                    onBlur={() => setIsEditing(false)}
                    autoFocus
                    style={{ width: 180 }}
                    placeholder={intl.formatMessage({ id: "pages.profile.selectProgram" })}
                    dropdownOpened={isDropdownOpened}
                    onDropdownOpen={() => setDropdownOpened(true)}
                    onDropdownClose={() => setDropdownOpened(false)}
                />
            ) : type === "button" ? (
                canEdit ? (
                    <Button
                        variant="transparent"
                        color={programObj ? "blue" : "gray"}
                        rightSection={programObj ? <IconPencil size={14} /> : <IconPlus size={14} />}
                        onClick={() => {
                            setIsEditing(true)
                            setDropdownOpened(true)
                        }}
                        size="sm"
                        fw={programObj ? undefined : 500}
                    >
                        {programObj ? (
                            getLocalizedName(programObj, locale)
                        ) : (
                            <FormattedMessage id="pages.profile.selectProgram" />
                        )}
                    </Button>
                ) : (
                    <Text
                        style={{ whiteSpace: "nowrap" }}
                        size="sm"
                        c={
                            programObj
                                ? undefined
                                : colorScheme === "dark"
                                  ? "var(--mantine-color-gray-light-color)"
                                  : "dimmed"
                        }
                        fw={programObj ? undefined : 500}
                    >
                        {programObj ? (
                            getLocalizedName(programObj, locale)
                        ) : (
                            <FormattedMessage id="pages.profile.selectProgram" />
                        )}
                    </Text>
                )
            ) : (
                <>
                    <Text
                        style={{ whiteSpace: "nowrap" }}
                        size="sm"
                        c={
                            programObj
                                ? undefined
                                : colorScheme === "dark"
                                  ? "var(--mantine-color-gray-light-color)"
                                  : "dimmed"
                        }
                        fw={programObj ? undefined : 500}
                    >
                        {programObj ? (
                            getLocalizedName(programObj, locale)
                        ) : (
                            <FormattedMessage id="pages.profile.selectProgram" />
                        )}
                    </Text>
                    {canEdit && (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => {
                                setIsEditing(true)
                                setDropdownOpened(true)
                            }}
                        >
                            {value ? <IconPencil size={14} /> : <IconPlus size={16} />}
                        </ActionIcon>
                    )}
                </>
            )}
        </Group>
    )
}
