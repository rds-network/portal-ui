import { Alert, Button, Card, Group, Loader, Stack, Text, Title } from "@mantine/core"
import { IconDownload, IconQrcode } from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import { YearReviewApiService } from "src/shared/api/YearReviewApiService"
import { generateAnnualZahvalnicaPdf } from "src/shared/docs/annualZahvalnicaPdf"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"

const MyDocumentsPage = () => {
    const intl = useIntl()
    setDocumentTitleByLocale("pages.yearReview.documentsTitle")

    const { data = [], isLoading } = useQuery({
        queryKey: ["my-documents"],
        queryFn: () => YearReviewApiService.myDocuments(),
    })

    const downloadMutation = useMutation({
        mutationFn: async (id: string) => {
            const doc = data.find((d) => d.id === id)
            if (!doc) throw new Error("missing")
            const review = await YearReviewApiService.get(doc.year)
            if (!review) throw new Error("review missing")
            await generateAnnualZahvalnicaPdf({
                certificate: doc,
                stats: review.stats,
                download: true,
            })
        },
    })

    return (
        <Stack gap="md" p="md" maw={800} mx="auto">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.yearReview.documentsTitle" />
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                    <FormattedMessage id="pages.yearReview.documentsHint" />
                </Text>
            </div>
            {isLoading && <Loader size="sm" />}
            {!isLoading && data.length === 0 && (
                <Alert color="blue">
                    <FormattedMessage id="pages.yearReview.documentsEmpty" />
                </Alert>
            )}
            {data.map((doc) => (
                <Card key={doc.id} withBorder radius="lg" padding="lg">
                    <Group justify="space-between" align="flex-start" wrap="wrap">
                        <Stack gap={4}>
                            <Text fw={700}>
                                <FormattedMessage
                                    id="pages.yearReview.documentName"
                                    values={{ year: doc.year }}
                                />
                            </Text>
                            <Text size="sm" c="dimmed">
                                {doc.status === "REVOKED"
                                    ? intl.formatMessage({ id: "pages.yearReview.statusRevoked" })
                                    : doc.issueSource === "MANUAL"
                                      ? intl.formatMessage({ id: "pages.yearReview.statusManual" })
                                      : intl.formatMessage({ id: "pages.yearReview.statusAuto" })}
                                {" · "}
                                {dayjs(doc.issuedAt).format("DD.MM.YYYY")}
                            </Text>
                            <Text size="sm">{doc.certificateNumber}</Text>
                            {doc.qualificationReasons.length > 0 && (
                                <Text size="sm" c="dimmed">
                                    {doc.qualificationReasons.join(" · ")}
                                </Text>
                            )}
                        </Stack>
                        <Group gap="xs">
                            <Button
                                variant="filled"
                                color="teal"
                                leftSection={<IconDownload size={16} />}
                                loading={downloadMutation.isPending}
                                disabled={doc.status === "REVOKED"}
                                onClick={() => downloadMutation.mutate(doc.id)}
                            >
                                <FormattedMessage id="pages.yearReview.downloadPdf" />
                            </Button>
                            <Button
                                component={Link}
                                to={`/verify/certificate/${doc.verificationToken}`}
                                variant="light"
                                leftSection={<IconQrcode size={16} />}
                            >
                                <FormattedMessage id="pages.yearReview.verifyByQr" />
                            </Button>
                        </Group>
                    </Group>
                </Card>
            ))}
        </Stack>
    )
}

export default MyDocumentsPage
