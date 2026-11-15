import { Button, Flex, NumberInput, Text } from "@mantine/core"
import { ApplicationDto, OfficialGroupDto } from "@rds-network/portal-api-axios"
import { useState } from "react"
import { FormattedMessage } from "react-intl"
import { useOfficialGroup } from "src/app/providers/OfficialGroupProvider"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { buildContractPdf } from "src/shared/docs/contract"
import generateQuestionnairePdf from "src/shared/docs/questionnaire"
import {
    generateUplatnicaPdf,
    MEMBERSHIP_FEE,
    MEMBERSHIP_FEE_TWO_YEARS,
    suggestedMembershipFee,
} from "src/shared/docs/uplatnica"
import { applicationTemplates } from "src/shared/email/templates"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { ApplicationStatus } from "src/shared/user/applications"

interface ApplicationMailDrawerProps {
    opened: boolean
    close: () => void
    application: ApplicationDto
    /** Письмо открыто кнопкой «Уплатница»: взнос прикладывается и до статуса «готово к отправке». */
    slip?: boolean
}

export const ApplicationMailDrawer = ({ opened, close, application, slip = false }: ApplicationMailDrawerProps) => {
    const programs = usePrograms()
    const officialGroups = useOfficialGroup()
    const suggested = suggestedMembershipFee(application)
    const [fee, setFee] = useState(suggested)
    const [draft, setDraft] = useState(suggested)
    const [seenOpen, setSeenOpen] = useState(opened)
    if (opened !== seenOpen) {
        setSeenOpen(opened)
        if (opened) {
            const next = suggestedMembershipFee(application)
            setFee(next)
            setDraft(next)
        }
    }

    const ready = application.status === ApplicationStatus.READY_TO_SEND
    const showFee = slip || (ready && !!application.contract)
    const program = programs.find((item) => item.code === application.program)
    const officialGroup: OfficialGroupDto | undefined = officialGroups.find(
        (item) => item.code === program?.officialGroup
    )

    return (
        <EmailDrawer
            opened={opened}
            from={"Русская Диаспора <apply@russian.rs>"}
            close={close}
            recipients={[{ name: application.name || application.email || "", email: application.email || "" }]}
            templates={applicationTemplates}
            datesHref={ready ? `/application/${application.id}?editContract=${application.id}` : undefined}
            attachedMessageId={
                ready && application.contract
                    ? "common.email-drawer.autoDocs"
                    : "pages.applications.view.uplatnicaAttached"
            }
            attachmentRevision={showFee ? fee : 0}
            attachmentTools={
                showFee ? (
                    <Flex direction="column" gap={6}>
                        <Text size="sm" c="dimmed">
                            <FormattedMessage id="pages.applications.view.uplatnicaMailHint" />
                        </Text>
                        <Flex gap="xs" align="flex-end" wrap="wrap">
                            <Button
                                variant={fee === MEMBERSHIP_FEE ? "filled" : "default"}
                                size="xs"
                                onClick={() => {
                                    setDraft(MEMBERSHIP_FEE)
                                    setFee(MEMBERSHIP_FEE)
                                }}
                            >
                                <FormattedMessage id="pages.applications.view.uplatnicaYear" />
                            </Button>
                            <Button
                                variant={fee === MEMBERSHIP_FEE_TWO_YEARS ? "filled" : "default"}
                                size="xs"
                                onClick={() => {
                                    setDraft(MEMBERSHIP_FEE_TWO_YEARS)
                                    setFee(MEMBERSHIP_FEE_TWO_YEARS)
                                }}
                            >
                                <FormattedMessage id="pages.applications.view.uplatnicaTwoYears" />
                            </Button>
                            <NumberInput
                                value={draft}
                                onChange={(value) => setDraft(typeof value === "number" ? value : draft)}
                                onBlur={() => {
                                    if (draft >= 500 && draft !== fee) setFee(draft)
                                }}
                                min={500}
                                step={500}
                                suffix=" RSD"
                                w={140}
                                size="xs"
                            />
                        </Flex>
                    </Flex>
                ) : undefined
            }
            prepareAttachments={
                ready || slip
                    ? async () => {
                          if (ready && !application.contract && !slip) return []
                          const files: File[] = []
                          if (ready && application.contract) {
                              try {
                                  files.push(
                                      await buildContractPdf(application, officialGroup, { download: false })
                                  )
                              } catch {
                                  // Пустое поле — уведомление уже показано.
                              }
                              try {
                                  files.push(await generateQuestionnairePdf(application, { download: false }))
                              } catch {
                                  // Пустое поле — уведомление уже показано.
                              }
                          }
                          const name = application.name?.trim()
                          const city = application.city?.trim()
                          if (showFee && name && city && fee > 0) {
                              files.push(generateUplatnicaPdf(name, city, fee, { download: false }))
                          }
                          if (files.length === 0) {
                              if (ready && !application.contract) return []
                              throw new Error("pdf")
                          }
                          return files
                      }
                    : undefined
            }
        />
    )
}
