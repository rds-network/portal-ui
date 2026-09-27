import { Flex, Select, Text, Title } from "@mantine/core"
import { useQuery } from "@tanstack/react-query"
import React, { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { ProgramsApiService } from "src/shared/api/ProgramsApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import LocalizedMarkdown from "src/shared/ui/markdown/LocalizedMarkdown"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { CleanCityDocs } from "./CleanCityDocs"
import classes from "./ReportingGuide.module.scss"
import { locales } from "./lib/locales"

const FILTER_KEY = "reportingProgram"
const URBANISM = "URBANISM"

export const ReportingGuide = () => {
    setDocumentTitleByLocale(locales.title)
    const intl = useIntl()

    const { data: programs = [] } = useQuery({
        queryKey: ["programs"],
        queryFn: () => ProgramsApiService.getPrograms().then((r) => r.data),
    })

    const options = useMemo(
        () =>
            programs.map((program) => ({
                value: program.code,
                label:
                    program.code === URBANISM
                        ? intl.formatMessage({ id: "pages.reporting.cleanCity" })
                        : getLocalizedName(program, intl.locale) || program.code,
            })),
        [programs, intl]
    )

    const [program, setProgram] = useState<string | null>(() => {
        try {
            return localStorage.getItem(FILTER_KEY) || URBANISM
        } catch {
            return URBANISM
        }
    })

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2} className={classes.title}>
                    <FormattedMessage id="pages.reporting.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.reporting.description" />
                </Text>
            </div>

            <Select
                label={<FormattedMessage id="pages.reporting.program" />}
                data={options}
                value={program}
                searchable
                onChange={(value) => {
                    setProgram(value)
                    if (value) localStorage.setItem(FILTER_KEY, value)
                }}
            />

            {program === URBANISM ? (
                <CleanCityDocs />
            ) : (
                <LocalizedMarkdown id={locales.text} />
            )}
        </Flex>
    )
}

export default ReportingGuide
