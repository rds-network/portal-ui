import { Box, Button, Flex, Input, Paper, Select, Text } from "@mantine/core"
import { ProgramDto, ProjectDto } from "@rds-network/portal-api-axios"
import { IconCalendarWeek, IconFilter, IconSearch, IconX } from "@tabler/icons-react"
import dayjs from "dayjs"
import React from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { ProgramFilter, ProjectFilter } from "src/shared/ui/filter"
import { locales } from "../lib/locales"
import classes from "./VolunteerReportFilters.module.scss"

interface VolunteerReportFiltersProps {
    search: string
    onSearchChange: (value: string) => void
    selectedProgram: string | null
    onProgramChange: (value: string | null) => void
    selectedProject: string | null
    onProjectChange: (value: string | null) => void
    year: string
    onYearChange: (value: string) => void
    onReset: () => void
    programsOverride?: ProgramDto[]
    projectsOverride?: ProjectDto[]
}

export const VolunteerReportFilters: React.FC<VolunteerReportFiltersProps> = ({
    search,
    onSearchChange,
    selectedProgram,
    onProgramChange,
    selectedProject,
    onProjectChange,
    year,
    onYearChange,
    onReset,
    programsOverride,
    projectsOverride,
}) => {
    const intl = useIntl()
    const hasActiveFilters = search || selectedProgram || selectedProject || year !== dayjs().year().toString()
    const MIN_YEAR = 2024

    return (
        <Paper withBorder p="md" className={classes.filtersContainer}>
            <Flex direction="column" gap="md">
                <Flex align="center" gap="sm">
                    <IconFilter size={20} />
                    <Text fw={500}>
                        <FormattedMessage id={locales.filters} />
                    </Text>
                    {hasActiveFilters && (
                        <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconX size={14} />}
                            onClick={onReset}
                            color="gray"
                        >
                            <FormattedMessage id={locales.reset} />
                        </Button>
                    )}
                </Flex>
                <Flex gap="md" wrap="wrap" align="flex-end">
                    <Box className={classes.filterItem}>
                        <Input
                            placeholder={intl.formatMessage({ id: locales.search })}
                            value={search}
                            onChange={(event) => onSearchChange(event.currentTarget.value)}
                            leftSection={<IconSearch size={16} />}
                            className={classes.searchInput}
                        />
                    </Box>
                    <Box className={classes.filterItem}>
                        <ProgramFilter
                            value={selectedProgram}
                            onChange={onProgramChange}
                            placeholder={intl.formatMessage({ id: locales.program })}
                            programsOverride={programsOverride}
                        />
                    </Box>
                    <Box className={classes.filterItem}>
                        <ProjectFilter
                            value={selectedProject}
                            onChange={onProjectChange}
                            placeholder={intl.formatMessage({ id: locales.project })}
                            projectsOverride={projectsOverride}
                        />
                    </Box>
                    <Box className={classes.filterItem}>
                        <Select
                            placeholder={dayjs().year().toString()}
                            value={year}
                            onChange={(value) => onYearChange(value || dayjs().year().toString())}
                            data={[...Array(dayjs().year() - MIN_YEAR + 1).keys()].map((i) => ({
                                value: (MIN_YEAR + i).toString(),
                                label: (MIN_YEAR + i).toString(),
                            }))}
                            leftSection={<IconCalendarWeek size={16} />}
                            className={classes.yearSelect}
                        />
                    </Box>
                </Flex>
            </Flex>
        </Paper>
    )
}
