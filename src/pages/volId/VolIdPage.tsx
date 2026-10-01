import { Anchor, Button, Flex, SegmentedControl, Text, Title } from "@mantine/core"
import { IconId, IconRefresh, IconX } from "@tabler/icons-react"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useSearchParams } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { makeQrDataUrl } from "src/shared/docs/zahvalnicaQr"
import {
    VOL_ID_COUNTRY_OPTIONS,
    VolIdCountryCode,
    buildVolIdCardData,
    buildVolIdPayload,
    buildVolIdVerifyUrl,
    encodeVolIdVerifyToken,
    guessVolIdCountry,
    loadVolIdCountry,
    saveVolIdCountry,
} from "src/shared/docs/volId"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { VolIdCard } from "./VolIdCard"
import classes from "./VolIdPage.module.scss"

const ACCOUNT_SETTINGS_URL = "https://id.russian.rs/if/user/#/settings"

const VolIdPage: React.FC = () => {
    setDocumentTitleByLocale("pages.volId.title")
    const intl = useIntl()
    const { user } = useContext(UserContext)
    const [params, setParams] = useSearchParams()
    const [side, setSide] = useState<"front" | "back">("front")
    const presenting = params.get("present") === "1"
    const [countryCode, setCountryCode] = useState<VolIdCountryCode>("SRB")

    useEffect(() => {
        if (!user) return
        setCountryCode(loadVolIdCountry(user.username) || guessVolIdCountry(user))
    }, [user])

    const card = useMemo(
        () => (user ? buildVolIdCardData(user, countryCode) : null),
        [user, countryCode]
    )

    const qrDataUrl = useMemo(() => {
        if (!card) return null
        try {
            const token = encodeVolIdVerifyToken(buildVolIdPayload(card))
            return makeQrDataUrl(buildVolIdVerifyUrl(token), 3, 1)
        } catch {
            return null
        }
    }, [card])

    useEffect(() => {
        if (!presenting) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [presenting])

    const openPresent = () => {
        setSide("front")
        setParams({ present: "1" }, { replace: false })
    }

    const closePresent = () => {
        setParams({}, { replace: true })
    }

    const onCountryChange = (value: string) => {
        const code = value as VolIdCountryCode
        setCountryCode(code)
        if (user) saveVolIdCountry(user.username, code)
    }

    if (!user || !card) {
        return (
            <div className={classes.root}>
                <Text c="dimmed">
                    <FormattedMessage id="pages.volId.needLogin" />
                </Text>
            </div>
        )
    }

    return (
        <div className={classes.root}>
            <div className={classes.intro}>
                <Title order={2}>
                    <FormattedMessage id="pages.volId.title" />
                </Title>
                <Text c="dimmed" size="sm" maw={480}>
                    <FormattedMessage id="pages.volId.description" />
                </Text>
            </div>

            <div className={classes.countryPicker}>
                <Text size="sm" fw={500} mb={6}>
                    <FormattedMessage id="pages.volId.countryLabel" />
                </Text>
                <SegmentedControl
                    fullWidth
                    value={countryCode}
                    onChange={onCountryChange}
                    data={VOL_ID_COUNTRY_OPTIONS.map((value) => ({
                        value,
                        label: intl.formatMessage({ id: `pages.volId.country.${value}` }),
                    }))}
                />
                <Text size="xs" c="dimmed" mt={6}>
                    <FormattedMessage id="pages.volId.countryHint" />
                </Text>
            </div>

            <div className={classes.preview}>
                <VolIdCard card={card} qrDataUrl={qrDataUrl} side={side} />
            </div>

            <Flex gap="sm" wrap="wrap" justify="center" className={classes.actions}>
                <Button size="md" leftSection={<IconId size={18} />} onClick={openPresent}>
                    <FormattedMessage id="pages.volId.present" />
                </Button>
                <Button
                    variant="light"
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => setSide((s) => (s === "front" ? "back" : "front"))}
                >
                    <FormattedMessage
                        id={side === "front" ? "pages.volId.showBack" : "pages.volId.showFront"}
                    />
                </Button>
            </Flex>

            <Text size="xs" c="dimmed" ta="center" mt="sm">
                {card.cardNumber} · {intl.formatMessage({ id: "pages.volId.notOfficial" })}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={420} className={classes.nameHint}>
                <FormattedMessage
                    id="pages.volId.nameHint"
                    values={{
                        name: <strong>{card.name}</strong>,
                        link: (chunks) => (
                            <Anchor href={ACCOUNT_SETTINGS_URL} target="_blank" size="xs">
                                {chunks}
                            </Anchor>
                        ),
                    }}
                />
            </Text>

            {presenting && (
                <div className={classes.present} role="dialog" aria-modal="true">
                    <button type="button" className={classes.close} onClick={closePresent}>
                        <IconX size={22} />
                        <span>
                            <FormattedMessage id="pages.volId.close" />
                        </span>
                    </button>
                    <div className={classes.presentCard}>
                        <VolIdCard card={card} qrDataUrl={qrDataUrl} side={side} large />
                    </div>
                    <Flex gap="sm" justify="center" mt="md">
                        <Button
                            variant="white"
                            color="dark"
                            leftSection={<IconRefresh size={16} />}
                            onClick={() => setSide((s) => (s === "front" ? "back" : "front"))}
                        >
                            <FormattedMessage
                                id={
                                    side === "front"
                                        ? "pages.volId.showBack"
                                        : "pages.volId.showFront"
                                }
                            />
                        </Button>
                    </Flex>
                    <Text size="xs" c="gray.4" ta="center" mt="sm" px="md">
                        <FormattedMessage id="pages.volId.presentHint" />
                    </Text>
                </div>
            )}
        </div>
    )
}

export default VolIdPage
