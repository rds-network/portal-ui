import { Anchor, Button, Flex, Loader, Modal, Text } from "@mantine/core"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import {
    IconClock,
    IconContract,
    IconEye,
    IconListCheck,
    IconMailFilled,
    IconExternalLink,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useEffect, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import { useOfficialGroup } from "src/app/providers/OfficialGroupProvider"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { locales } from "src/pages/profile/applicationDocs/lib/locales"
import { ApplicationLookupApiService } from "src/shared/api/applications/ApplicationLookupApiService"
import { UplatnicaButton } from "src/pages/applications/uplatnica/UplatnicaButton"
import { buildContractPdf } from "src/shared/docs/contract"
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
    const previewUrl = useRef<string | null>(null)
    const [preview, setPreview] = useState<File | null>(null)
    const [previewKind, setPreviewKind] = useState<"contract" | "questionnaire" | null>(null)
    const [frameUrl, setFrameUrl] = useState<string | null>(null)
    const [opening, setOpening] = useState<"contract" | "questionnaire" | null>(null)

    const closePreview = () => {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
        previewUrl.current = null
        setFrameUrl(null)
        setPreview(null)
        setPreviewKind(null)
    }

    useEffect(() => closePreview, [])

    const showPreview = async (kind: "contract" | "questionnaire") => {
        if (!application) return
        setOpening(kind)
        try {
            const file =
                kind === "contract"
                    ? await buildContractPdf(application, officialGroup, {
                          download: false,
                          knownContracts: userInfo.contracts,
                      })
                    : await generateQuestionnairePdf(application, { download: false })
            const typed = file.type ? file : new File([file], file.name, { type: "application/pdf" })
            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
            const url = URL.createObjectURL(typed)
            previewUrl.current = url
            setPreview(typed)
            setPreviewKind(kind)
            setFrameUrl(url)
        } catch {
            // Генератор уже показал, какого поля не хватает.
        } finally {
            setOpening(null)
        }
    }

    const downloadPreview = () => {
        if (!preview) return
        const url = URL.createObjectURL(preview)
        const link = document.createElement("a")
        link.href = url
        link.download = preview.name
        link.click()
        URL.revokeObjectURL(url)
    }

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
                        <Flex className={classes.docRow} gap={8}>
                            <Button
                                variant="default"
                                flex={1}
                                rightSection={<IconEye size={14} />}
                                disabled={!hasContract}
                                loading={opening === "contract"}
                                onClick={() => void showPreview("contract")}
                            >
                                <FormattedMessage id={locales.preview} />
                            </Button>
                            <Button
                                variant="gradient"
                                flex={1}
                                rightSection={<IconContract size={14} />}
                                disabled={!hasContract}
                                onClick={() =>
                                    void buildContractPdf(application, officialGroup, {
                                        knownContracts: userInfo.contracts,
                                    })
                                }
                            >
                                <FormattedMessage id={locales.contractDownload} />
                            </Button>
                        </Flex>
                        <Flex className={classes.docRow} gap={8}>
                            <Button
                                variant="default"
                                flex={1}
                                rightSection={<IconEye size={14} />}
                                disabled={!hasContract}
                                loading={opening === "questionnaire"}
                                onClick={() => void showPreview("questionnaire")}
                            >
                                <FormattedMessage id={locales.preview} />
                            </Button>
                            <Button
                                variant="light"
                                flex={1}
                                rightSection={<IconListCheck size={15} />}
                                disabled={!hasContract}
                                onClick={() => generateQuestionnairePdf(application)}
                            >
                                <FormattedMessage id={locales.questionnaireDownload} />
                            </Button>
                        </Flex>
                        <Button
                            variant="light"
                            rightSection={<IconMailFilled size={15} />}
                            disabled={!hasContract}
                            className={classes.pdfButton}
                            onClick={() => generateEnvelopPdf(application)}
                        >
                            <FormattedMessage id={locales.envelopDownload} />
                        </Button>
                        <UplatnicaButton application={application} className={classes.pdfButton} />
                    </Flex>
                </>
            )}
            <Modal
                opened={frameUrl != null}
                onClose={closePreview}
                title={preview?.name}
                size="xl"
                centered
            >
                {frameUrl && (
                    <Flex direction="column" gap="sm">
                        <iframe className={classes.docPreview} src={frameUrl} title={preview?.name} />
                        <Button onClick={downloadPreview}>
                            <FormattedMessage
                                id={
                                    previewKind === "contract"
                                        ? locales.contractDownload
                                        : locales.questionnaireDownload
                                }
                            />
                        </Button>
                    </Flex>
                )}
            </Modal>
        </Flex>
    )
}
