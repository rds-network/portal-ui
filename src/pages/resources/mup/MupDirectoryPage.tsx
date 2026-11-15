import { ActionIcon, Anchor, Card, CopyButton, Flex, Text, TextInput, Title, Tooltip } from "@mantine/core"
import { IconCheck, IconCopy, IconMail, IconMapPin, IconPhone, IconSearch } from "@tabler/icons-react"
import React, { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { cityLabel, MUP_OFFICES, officeNote } from "./mupOffices"
import classes from "./MupDirectoryPage.module.scss"

const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/č|ć/g, "c")
        .replace(/š/g, "s")
        .replace(/ž/g, "z")
        .replace(/đ/g, "d")

export const MupDirectoryPage: React.FC = () => {
    const intl = useIntl()
    const [query, setQuery] = useState("")
    setDocumentTitleByLocale("pages.mupDirectory.documentTitle")

    const offices = useMemo(() => {
        const q = normalize(query.trim())
        const list = [...MUP_OFFICES].sort((a, b) =>
            cityLabel(a, intl.locale).localeCompare(cityLabel(b, intl.locale), intl.locale)
        )
        if (!q) return list
        return list.filter((office) => {
            const hay = normalize(
                [
                    office.citySr,
                    office.cityRu,
                    office.cityEn,
                    office.cityCode,
                    office.address,
                    office.email,
                    office.unitSr,
                    ...office.phones,
                ].join(" ")
            )
            return hay.includes(q)
        })
    }, [query, intl.locale])

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Text size="sm" mb={6}>
                    <Anchor component={Link} to="/resources">
                        <FormattedMessage id="pages.mupDirectory.back" />
                    </Anchor>
                </Text>
                <Title order={2}>
                    <FormattedMessage id="pages.mupDirectory.title" />
                </Title>
                <Text c="dimmed" mt={6} maw={720}>
                    <FormattedMessage id="pages.mupDirectory.description" />
                </Text>
            </div>

            <TextInput
                className={classes.search}
                leftSection={<IconSearch size={16} />}
                placeholder={intl.formatMessage({ id: "pages.mupDirectory.search" })}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
            />

            <Text size="sm" c="dimmed">
                <FormattedMessage id="pages.mupDirectory.count" values={{ count: offices.length }} />
            </Text>

            <div className={classes.grid}>
                {offices.map((office) => {
                    const note = officeNote(office, intl.locale)
                    return (
                        <Card key={office.cityCode} withBorder radius="lg" padding="md" className={classes.card}>
                            <Text fw={700} size="lg">
                                {cityLabel(office, intl.locale)}
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                {office.unitSr}
                            </Text>

                            <Flex align="flex-start" gap={8} mt="md">
                                <IconMapPin size={16} className={classes.icon} />
                                <Text size="sm">{office.address}</Text>
                            </Flex>

                            <Flex direction="column" gap={6} mt="sm">
                                {office.phones.map((phone) => (
                                    <Flex key={phone} align="center" gap={8}>
                                        <IconPhone size={16} className={classes.icon} />
                                        <Anchor href={`tel:${phone}`} size="sm">
                                            {phone}
                                        </Anchor>
                                    </Flex>
                                ))}
                            </Flex>

                            <Flex align="center" gap={8} mt="sm" wrap="nowrap">
                                <IconMail size={16} className={classes.icon} />
                                <Anchor href={`mailto:${office.email}`} size="sm" className={classes.email}>
                                    {office.email}
                                </Anchor>
                                <CopyButton value={office.email} timeout={1500}>
                                    {({ copied, copy }) => (
                                        <Tooltip
                                            label={intl.formatMessage({
                                                id: copied
                                                    ? "pages.mupDirectory.copied"
                                                    : "pages.mupDirectory.copyEmail",
                                            })}
                                        >
                                            <ActionIcon
                                                variant="subtle"
                                                color={copied ? "teal" : "gray"}
                                                size="sm"
                                                onClick={copy}
                                                aria-label={intl.formatMessage({
                                                    id: "pages.mupDirectory.copyEmail",
                                                })}
                                            >
                                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Flex>

                            {note && (
                                <Text size="xs" c="dimmed" mt="sm">
                                    {note}
                                </Text>
                            )}
                        </Card>
                    )
                })}
            </div>

            {offices.length === 0 && (
                <Text c="dimmed">
                    <FormattedMessage id="pages.mupDirectory.empty" />
                </Text>
            )}

            <Text size="xs" c="dimmed" maw={720}>
                <FormattedMessage id="pages.mupDirectory.source" />
            </Text>
        </Flex>
    )
}

export default MupDirectoryPage
