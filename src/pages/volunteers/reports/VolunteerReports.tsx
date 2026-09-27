import { locales } from "../lib/locales"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { Flex, Text } from "@mantine/core"
import classes from "./VolunteerReports.module.scss"
import { FormattedMessage } from "react-intl"
import React from "react"
import MintrudReport from "src/pages/volunteers/mintrud/MintrudReport"

export default function VolunteerReports() {
    setDocumentTitleByLocale(locales.titleReports)

    return (
        <Flex direction="column">
            <Flex className={classes.root}>
                <Text className={classes.title}>
                    <FormattedMessage id={locales.titleReports} />
                </Text>
                <Flex className={classes.reportContainer}>
                    <MintrudReport />
                </Flex>
            </Flex>
        </Flex>
    )
}
