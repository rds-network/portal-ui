import { Avatar, Box, Text } from "@mantine/core"
import { UserInfoDto } from "@russian-rs/portal-api-axios"
import { FormattedMessage, useIntl } from "react-intl"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { Locale } from "src/shared/constants/Locales"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { IDBadge } from "src/shared/ui/badges/IDBadge"
import classes from "./VolunteerIDCard.module.scss"

interface VolunteerIDCardProps {
    userInfo: UserInfoDto
}

export const VolunteerIDCard = ({ userInfo }: VolunteerIDCardProps) => {
    const intl = useIntl()
    const locale = intl.locale as Locale
    const programs = usePrograms()
    const programObj = programs.find((p) => p.code === userInfo.program?.code)
    const programName = programObj ? getLocalizedName(programObj, locale) : (userInfo.program?.code ?? "")
    return (
        <Box className={classes.card}>
            <Box className={classes.header}>
                <Text className={classes.orgSubtitle}>
                    <FormattedMessage id="pages.profile.idCard.orgSubtitle" />
                </Text>
                <Text className={classes.orgName}>
                    <FormattedMessage id="pages.profile.idCard.orgName" />
                </Text>
                <Text className={classes.cardTypeLabel}>
                    <FormattedMessage id="pages.profile.idCard.cardType" />
                </Text>
            </Box>

            <Box className={classes.body}>
                <Avatar src={userInfo.avatar?.link} size={80} className={classes.avatar} />
                <Box className={classes.info}>
                    <Text className={classes.fullName}>{userInfo.fullName}</Text>
                    <IDBadge id={userInfo.id} />

                    {programName && (
                        <>
                            <Text className={classes.fieldLabel}>
                                <FormattedMessage id="pages.profile.idCard.program" />
                            </Text>
                            <Text className={classes.fieldValue}>{programName}</Text>
                        </>
                    )}
                </Box>
            </Box>

            <Box className={classes.footer}>
                <Text className={classes.footerOrg}>russka-dijaspora.rs</Text>
            </Box>
        </Box>
    )
}
