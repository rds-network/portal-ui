import { Badge, Card, Stack, Text, Title } from "@mantine/core"
import React, { useMemo } from "react"
import { FormattedMessage } from "react-intl"
import { useSearchParams } from "react-router"
import { isZahvalnicaVoided } from "src/shared/docs/zahvalnicaDraft"
import { decodeZahvalnicaVerifyToken } from "src/shared/docs/zahvalnicaVerify"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import classes from "./ZahvalnicaVerifyPage.module.scss"

export const ZahvalnicaVerifyPage: React.FC = () => {
    setDocumentTitleByLocale("pages.zahvalnica.verifyTitle")
    const [params] = useSearchParams()
    const token = params.get("t") || ""

    const payload = useMemo(() => (token ? decodeZahvalnicaVerifyToken(token) : null), [token])
    const voided = useMemo(() => (payload ? isZahvalnicaVoided(payload.id) : false), [payload])

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

                    {payload && voided && (
                        <div className={classes.voidBanner}>
                            <Badge color="red" size="lg" variant="filled">
                                <FormattedMessage id="pages.zahvalnica.verifyVoidedBadge" />
                            </Badge>
                            <Text size="sm" mt={8}>
                                <FormattedMessage id="pages.zahvalnica.verifyVoidedHint" />
                            </Text>
                        </div>
                    )}

                    {payload && !voided && (
                        <Badge color="teal" size="lg" variant="light" w="fit-content">
                            <FormattedMessage id="pages.zahvalnica.verifyValidBadge" />
                        </Badge>
                    )}

                    {payload && (
                        <dl className={`${classes.dl} ${voided ? classes.dlVoided : ""}`}>
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
