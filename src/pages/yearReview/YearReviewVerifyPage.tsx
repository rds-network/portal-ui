import { Alert, Loader, Stack, Text, Title } from "@mantine/core"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { FormattedMessage } from "react-intl"
import { useParams, useSearchParams } from "react-router"
import { YearReviewApiService } from "src/shared/api/YearReviewApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"

const YearReviewVerifyPage = () => {
    setDocumentTitleByLocale("pages.yearReview.verifyTitle")
    const params = useParams()
    const [search] = useSearchParams()
    const token = params.token || search.get("t") || ""

    const { data, isLoading } = useQuery({
        queryKey: ["certificate-verify", token],
        queryFn: () => YearReviewApiService.verify(token),
        enabled: !!token,
    })

    return (
        <Stack maw={520} mx="auto" mt="xl" p="md">
            <Title order={2}>
                <FormattedMessage id="pages.yearReview.verifyTitle" />
            </Title>
            {!token && (
                <Alert color="yellow">
                    <FormattedMessage id="pages.yearReview.verifyMissing" />
                </Alert>
            )}
            {isLoading && <Loader size="sm" />}
            {data && (
                <>
                    <Alert color={data.valid ? "teal" : "red"}>
                        <FormattedMessage
                            id={data.valid ? "pages.yearReview.verifyValid" : "pages.yearReview.verifyInvalid"}
                        />
                    </Alert>
                    {data.certificateNumber && (
                        <Stack gap={4}>
                            <Text fw={700}>{data.documentTitle}</Text>
                            <Text>{data.recipientFullName}</Text>
                            <Text size="sm" c="dimmed">
                                {data.certificateNumber}
                            </Text>
                            <Text size="sm" c="dimmed">
                                {data.issuedAt ? dayjs(data.issuedAt).format("DD.MM.YYYY") : ""} · {data.organization}
                            </Text>
                        </Stack>
                    )}
                </>
            )}
        </Stack>
    )
}

export default YearReviewVerifyPage
