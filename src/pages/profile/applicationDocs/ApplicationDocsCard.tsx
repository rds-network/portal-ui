import { Anchor, Button, Flex, Loader, Text } from "@mantine/core"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import {
    IconClock,
    IconContract,
    IconListCheck,
    IconMailFilled,
    IconExternalLink,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import { useOfficialGroup } from "src/app/providers/OfficialGroupProvider"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { locales } from "src/pages/profile/applicationDocs/lib/locales"
import { ApplicationLookupApiService } from "src/shared/api/applications/ApplicationLookupApiService"
import generateContractPdf from "src/shared/docs/contract"
import generateEnvelopPdf from "src/shared/docs/envelop"
import generateQuestionnairePdf from "src/shared/docs/questionnaire"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import classes from "./ApplicationDocsCard.module.scss"

interface ApplicationDocsCardProps {
    userInfo: UserInfoDto
}

export const ApplicationDocsCard = ({ userInfo }: ApplicationDocsCardProps) => {
    const intl = useIntl()
    const programs = usePrograms()
    const officialGroups = useOfficialGroup()
    const username = userInfo.username

    const { data: application, isFetching, isError } = useQuery({
        queryKey: ["applicationForUser", username],
        queryFn: () => ApplicationLookupApiService.getForUser(username!),
        enabled: !!username,
    })

    const program = programs.find((p) => p.code === application?.program)
    const officialGroup = officialGroups.find((p) => p.code === program?.officialGroup)
    const hasContract = application?.contract != null
    const searchHref = `/applications?search=${encodeURIComponent(userInfo.email)}&showCompleted=true`

    return (
        <Flex className={classes.root}>
            <Text fw={600}>
                <FormattedMessage id={locales.title} />
            </Text>

            {isFetching && <Loader size="sm" />}

            {!isFetching && (application == null || isError) && (
                <>
                    <Text className={classes.muted} size="sm">
                        <FormattedMessage id={locales.notFound} />
                    </Text>
                    <Anchor component={Link} to={searchHref} size="sm">
                        <FormattedMessage id={locales.searchLink} />
                    </Anchor>
                </>
            )}

            {!isFetching && application != null && (
                <>
                    <Flex className={classes.props}>
                        {application.status && (
                            <TextPropertyBox
                                name={locales.status}
                                value={
                                    <FormattedMessage id={`common.application-status.${application.status}`} />
                                }
                            />
                        )}
                        {application.created && (
                            <TextPropertyBox
                                name={locales.created}
                                icon={<IconClock size={14} />}
                                value={dayjs(application.created).format("DD MMM YYYY")}
                            />
                        )}
                        {application.type && (
                            <TextPropertyBox
                                name={locales.type}
                                value={
                                    <FormattedMessage id={`common.application-type.${application.type}`} />
                                }
                            />
                        )}
                    </Flex>

                    <Flex className={classes.preview} direction="column" gap={4}>
                        {program && (
                            <Text size="sm" className={classes.previewLine}>
                                <Text span fw={500}>
                                    <FormattedMessage id={locales.program} />
                                    {": "}
                                </Text>
                                {getLocalizedName(program, intl.locale)}
                            </Text>
                        )}
                        {application.skills?.trim() && (
                            <Text size="sm" className={classes.previewLine}>
                                <Text span fw={500}>
                                    <FormattedMessage id={locales.skills} />
                                    {": "}
                                </Text>
                                {application.skills}
                            </Text>
                        )}
                        {application.goal?.trim() && (
                            <Text size="sm" className={classes.previewLine}>
                                <Text span fw={500}>
                                    <FormattedMessage id={locales.goal} />
                                    {": "}
                                </Text>
                                {application.goal}
                            </Text>
                        )}
                    </Flex>

                    <Flex className={classes.actions}>
                        <Button
                            component={Link}
                            to={`/application/${application.id}`}
                            variant="light"
                            rightSection={<IconExternalLink size={14} />}
                        >
                            <FormattedMessage id={locales.open} />
                        </Button>
                        <Button
                            variant="gradient"
                            rightSection={<IconContract size={14} />}
                            disabled={!hasContract}
                            className={classes.pdfButton}
                            onClick={() => generateContractPdf(application, officialGroup)}
                        >
                            <FormattedMessage id={locales.contractDownload} />
                        </Button>
                        <Button
                            variant="light"
                            rightSection={<IconListCheck size={15} />}
                            disabled={!hasContract}
                            className={classes.pdfButton}
                            onClick={() => generateQuestionnairePdf(application)}
                        >
                            <FormattedMessage id={locales.questionnaireDownload} />
                        </Button>
                        <Button
                            variant="light"
                            rightSection={<IconMailFilled size={15} />}
                            disabled={!hasContract}
                            className={classes.pdfButton}
                            onClick={() => generateEnvelopPdf(application)}
                        >
                            <FormattedMessage id={locales.envelopDownload} />
                        </Button>
                    </Flex>
                </>
            )}
        </Flex>
    )
}
