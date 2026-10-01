import { Card, Stack, Text, Title } from "@mantine/core"
import React, { useMemo } from "react"
import { FormattedMessage } from "react-intl"
import { useSearchParams } from "react-router"
import { decodeZahvalnicaVerifyToken } from "src/shared/docs/zahvalnicaVerify"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import classes from "./ZahvalnicaVerifyPage.module.scss"

export const ZahvalnicaVerifyPage: React.FC = () => {
    setDocumentTitleByLocale("pages.zahvalnica.verifyTitle")
    const [params] = useSearchParams()
    const token = params.get("t") || ""

    const payload = useMemo(() => (token ? decodeZahvalnicaVerifyToken(token) : null), [token])

    return (
        <div className={classes.root}>
            <Card withBorder radius="md" padding="xl" className={classes.card}>
                <Stack gap="md">
                    <Title order={2}>
                        <FormattedMessage id="pages.zahvalnica.verifyTitle" />
                    </Title>
                    <Text c="dimmed" size="sm">
                        <FormattedMessage id="pages.zahvalnica.verifyDescription" />
                    </Text>

                    {!token && (
                        <Text c="red">
                            <FormattedMessage id="pages.zahvalnica.verifyMissing" />
                        </Text>
                    )}

                    {token && !payload && (
                        <Text c="red">
                            <FormattedMessage id="pages.zahvalnica.verifyInvalid" />
                        </Text>
                    )}

                    {payload && (
                        <dl className={classes.dl}>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.zahvalnica.volunteerName" />
                                </dt>
                                <dd>{payload.name}</dd>
                            </div>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.zahvalnica.number" />
                                </dt>
                                <dd>{payload.number}</dd>
                            </div>
                            <div>
                                <dt>
                                    <FormattedMessage id="pages.zahvalnica.date" />
                                </dt>
                                <dd>
                                    {payload.place}, {payload.date}
                                </dd>
                            </div>
                            {payload.contribution ? (
                                <div>
                                    <dt>
                                        <FormattedMessage id="pages.zahvalnica.contribution" />
                                    </dt>
                                    <dd>{payload.contribution}</dd>
                                </div>
                            ) : null}
                            {payload.president ? (
                                <div>
                                    <dt>
                                        <FormattedMessage id="pages.zahvalnica.presidentName" />
                                    </dt>
                                    <dd>{payload.president}</dd>
                                </div>
                            ) : null}
                        </dl>
                    )}
                </Stack>
            </Card>
        </div>
    )
}

export default ZahvalnicaVerifyPage
