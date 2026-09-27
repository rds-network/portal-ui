import { Alert, Button, Card, Flex, Loader, Pill, Select, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { FileInfoDto } from "@rds-network/portal-api-axios"
import { IconLifebuoy } from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import parse from "html-react-parser"
import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { TicketApiService } from "src/shared/api/TicketApiService"
import CaseForm from "src/shared/dynamic-forms/CaseForm"
import { defaultSupportCaseId, supportCases } from "src/shared/dynamic-forms/cases"
import { CaseId, CaseValues } from "src/shared/dynamic-forms/types"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { FileUploader, FileUploaderInterface } from "src/shared/ui/fileUploader/FileUploader"
import { pickTicketGroupByTarget } from "src/shared/ui/ticketModal/lib/groupTarget"
import { locales as ticketModalLocales } from "src/shared/ui/ticketModal/lib/locales"
import classes from "./SupportPage.module.scss"
import { locales } from "./lib/locales"

export const SupportPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()

    const [caseId, setCaseId] = useState<CaseId>(defaultSupportCaseId)
    const [values, setValues] = useState<CaseValues>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [group, setGroup] = useState<string>("")

    const fileUploaderRef = useRef<FileUploaderInterface | null>(null)
    const [uploadedFiles, setUploadedFiles] = useState<FileInfoDto[]>([])
    const [loadingFiles, setLoadingFiles] = useState<string[]>([])

    const selectedCase = supportCases.find((c) => c.id === caseId) ?? supportCases[0]

    setDocumentTitleByLocale(locales.title)

    if (!user) {
        return null
    }

    const validate = (): boolean => {
        const next: Record<string, string> = {}
        for (const f of selectedCase.fields) {
            if (f.visibleWhen) {
                const current = (values[f.visibleWhen.field] ?? "").toString()
                if (current !== f.visibleWhen.equals) continue
            }
            if (!f.required) continue
            const v = (values[f.name] ?? "").trim()
            if (!v) {
                next[f.name] = intl.formatMessage({ id: "common.ticket-modal.required" })
            }
        }
        setErrors(next)
        return Object.keys(next).length === 0
    }

    const t = (id: string) => intl.formatMessage({ id })
    const draft = selectedCase.build(values, t)

    const { data: ticketGroups } = useQuery({
        queryKey: ["ticketGroups"],
        queryFn: () => TicketApiService.getTicketGroups().then((r) => r.data),
    })

    const autoGroup = useMemo(
        () => pickTicketGroupByTarget(ticketGroups, draft.groupTarget) ?? "",
        [ticketGroups, draft.groupTarget]
    )

    useEffect(() => {
        // On case switch: reset values + files + auto group
        setGroup(autoGroup)
        setUploadedFiles([])
        setLoadingFiles([])
    }, [caseId, autoGroup])

    useEffect(() => {
        // When groups are loaded and group still empty - auto-pick
        if (group) return
        if (!autoGroup) return
        setGroup(autoGroup)
    }, [group, autoGroup])

    const { mutateAsync: createTicket, isPending: creating } = useMutation({
        mutationFn: () =>
            TicketApiService.createTicket({
                toUser: null,
                fromUser: user?.username ?? null,
                group,
                title: draft.title,
                body: draft.bodyHtml,
                attachments: uploadedFiles.map((f) => f.id),
            }),
    })

    const submit = async () => {
        if (!validate()) return
        if (!group) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">{intl.formatMessage({ id: ticketModalLocales.required })}</Text>,
                    null
                )
            )
            return
        }
        if (draft.attachmentsRequired && uploadedFiles.length === 0) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">{intl.formatMessage({ id: "common.ticket-modal.attachmentsRequired" })}</Text>,
                    null
                )
            )
            return
        }
        if (loadingFiles.length !== 0) return

        try {
            const createdTicket = await createTicket()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        {parse(
                            intl.formatMessage(
                                { id: ticketModalLocales.success },
                                { number: createdTicket.data.id, link: createdTicket.data.ticketLink },
                                { ignoreTag: true }
                            )
                        )}
                    </Text>,
                    null
                )
            )

            // Clear form after successful ticket creation
            setValues({})
            setErrors({})
            setUploadedFiles([])
            setLoadingFiles([])
            setGroup(autoGroup)
        } catch (e) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">{parse(intl.formatMessage({ id: ticketModalLocales.error }))}</Text>,
                    null
                )
            )
        }
    }

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <Card withBorder shadow="sm" className={classes.card}>
                <Flex direction="column" gap="sm">
                    <Text size="xl" fw={700}>
                        <FormattedMessage id={locales.heading} />
                    </Text>
                    <Text c="dimmed">
                        <FormattedMessage id={locales.description} />
                    </Text>
                    <Select
                        label={<FormattedMessage id={locales.caseLabel} />}
                        placeholder={intl.formatMessage({ id: locales.casePlaceholder })}
                        value={caseId}
                        allowDeselect={false}
                        data={supportCases.map((c) => ({
                            value: c.id,
                            label: intl.formatMessage({ id: c.labelKey }),
                        }))}
                        onChange={(v) => {
                            const next = (v ?? defaultSupportCaseId) as CaseId
                            setCaseId(next)
                            setValues({})
                            setErrors({})
                        }}
                    />
                </Flex>
            </Card>

            <Card withBorder shadow="sm" className={classes.card}>
                <Flex direction="column" gap="md">
                    <Text fw={600}>
                        <FormattedMessage id={locales.formTitle} />
                    </Text>

                    {draft.attachmentsRequired ? (
                        <Alert color="orange" variant="light">
                            <FormattedMessage id={locales.attachmentsRequiredHint} />
                        </Alert>
                    ) : null}

                    <CaseForm fields={selectedCase.fields} values={values} onChange={setValues} errors={errors} />

                    <Select
                        withAsterisk
                        label={intl.formatMessage({ id: ticketModalLocales.group })}
                        placeholder={intl.formatMessage({ id: ticketModalLocales.groupPlaceholder })}
                        description={intl.formatMessage({ id: ticketModalLocales.groupDescription })}
                        allowDeselect={false}
                        value={group || null}
                        data={ticketGroups ?? []}
                        onChange={(v) => setGroup(v ?? "")}
                    />

                    {draft.allowAttachments ? (
                        <>
                            <FileUploader
                                ref={fileUploaderRef}
                                maxFiles={10}
                                maxSize={10}
                                files={uploadedFiles}
                                onFilesUploaded={setUploadedFiles}
                                onFilesLoading={setLoadingFiles}
                            />

                            {(uploadedFiles.length > 0 || loadingFiles.length > 0) && (
                                <Flex wrap="wrap" gap="xs">
                                    {uploadedFiles.map((file) => (
                                        <Pill
                                            key={file.id}
                                            withRemoveButton
                                            onRemove={() => fileUploaderRef.current?.delete(file.id)}
                                        >
                                            {file.name}
                                        </Pill>
                                    ))}
                                    {loadingFiles.map((name) => (
                                        <Pill key={name}>
                                            <Flex align="center" gap={6}>
                                                <Text size="sm" c="dimmed">
                                                    {name}
                                                </Text>
                                                <Loader size={10} />
                                            </Flex>
                                        </Pill>
                                    ))}
                                </Flex>
                            )}
                        </>
                    ) : null}

                    <Flex>
                        <Button
                            leftSection={creating ? <Loader size={16} /> : <IconLifebuoy size={16} />}
                            onClick={submit}
                            disabled={creating || loadingFiles.length !== 0}
                        >
                            <FormattedMessage id={locales.button} />
                        </Button>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    )
}

export default SupportPage
