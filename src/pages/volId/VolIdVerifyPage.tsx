import { Badge, Card, Stack, Text, Title } from "@mantine/core"
import React, { useMemo } from "react"
import { FormattedMessage } from "react-intl"
import { useSearchParams } from "react-router"
import { decodeVolIdVerifyToken } from "src/shared/docs/volId"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import classes from "./VolIdVerifyPage.module.scss"

const VolIdVerifyPage: React.FC = () => {
    setDocumentTitleByLocale("pages.volId.verifyTitle")
    const [params] = useSearchParams()
    const token = params.get("t") || ""
    const payload = useMemo(() => (token ? decodeVolIdVerifyToken(token) : null), [token])

    return (
        <div className={classes.root}>
            <Card withBorder radius="md" padding="xl" className={classes.card}>
                <Stack gap="md">
                    <Title order={2}>
                        <FormattedMessage id="pages.volId.verifyTitle" />
                    </Title>
                    <Text c="dimmed" size="sm">
                        <FormattedMessage id="pages.volId.verifyDescription" />
                    </Text>

                    {!token && (
                        <Text c="red">
                            <FormattedMessage id="pages.volId.verifyMissing" />
                        </Text>
                    )}
                    {token && !payload && (
                        <Text c="red">
                            <FormattedMessage id="pages.volId.verifyInvalid" />
                        </Text>
                    )}
                    {payload && (
                        <Badge color="teal" size="lg" variant="light" w="fit-content">
                            <FormattedMessage id="pages.volId.verifyValidBadge" />
                        </Badge>
                    )}
                    {payload && (
                        <dl className={classes.dl}>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.volId.fieldName" />
                                </dt>
                                <dd>{payload.name}</dd>
                            </div>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.volId.fieldNumber" />
                                </dt>
                                <dd>{payload.id}</dd>
                            </div>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.volId.fieldSince" />
                                </dt>
                                <dd>{payload.since}</dd>
                            </div>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.volId.fieldIssued" />
                                </dt>
                                <dd>{payload.issued}</dd>
                            </div>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.volId.fieldValidUntil" />
                                </dt>
                                <dd>{payload.validUntil}</dd>
                            </div>
                        </dl>
                    )}
                    <Text size="xs" c="dimmed">
                        <FormattedMessage id="pages.volId.notOfficial" />
                    </Text>
                </Stack>
            </Card>
        </div>
    )
}

export default VolIdVerifyPage
