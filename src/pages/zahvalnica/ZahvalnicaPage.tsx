import {
    Button,
    Checkbox,
    ColorInput,
    FileButton,
    Flex,
    NumberInput,
    Select,
    Slider,
    Table,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core"
import { IconAward, IconDownload, IconPhoto, IconPrinter, IconRefresh, IconTrash } from "@tabler/icons-react"
import dayjs from "dayjs"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import generateZahvalnicaPdf from "src/shared/docs/zahvalnica"
import {
    DEFAULT_LOGO,
    TEXT_TEMPLATES,
    TextStyle,
    ZahvalnicaBackground,
    ZahvalnicaDraft,
    ZahvalnicaIssue,
    ZahvalnicaTypography,
    clearZahvalnicaHistory,
    defaultZahvalnicaDraft,
    loadZahvalnicaDraft,
    loadZahvalnicaHistory,
    saveZahvalnicaDraft,
} from "src/shared/docs/zahvalnicaDraft"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { hasPermission } from "src/shared/user/roles"
import classes from "./ZahvalnicaPage.module.scss"

const ADMIN_ROLES = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]

const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
    })

const StyleRow: React.FC<{
    label: string
    value: TextStyle
    onChange: (next: TextStyle) => void
}> = ({ label, value, onChange }) => (
    <Flex gap="sm" align="flex-end" wrap="wrap" mb={8}>
        <Text size="sm" fw={500} w={110}>
            {label}
        </Text>
        <NumberInput
            label="pt"
            w={70}
            min={8}
            max={48}
            value={value.size}
            onChange={(v) => onChange({ ...value, size: typeof v === "number" ? v : value.size })}
        />
        <ColorInput
            label=" "
            w={120}
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
            withEyeDropper={false}
        />
        <Checkbox
            label="Bold"
            checked={value.bold}
            onChange={(e) => onChange({ ...value, bold: e.currentTarget.checked })}
            mb={6}
        />
    </Flex>
)

export const ZahvalnicaPage: React.FC = () => {
    setDocumentTitleByLocale("pages.zahvalnica.title")
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const canManage = hasPermission(user, ADMIN_ROLES)

    const [draft, setDraft] = useState<ZahvalnicaDraft>(() => loadZahvalnicaDraft())
    const [history, setHistory] = useState<ZahvalnicaIssue[]>(() => loadZahvalnicaHistory())
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!canManage) navigate("/", { replace: true })
    }, [canManage, navigate])

    useEffect(() => {
        setDraft((d) => {
            if (d.presidentName || !user?.fullName) return d
            const next = { ...d, presidentName: user.fullName }
            saveZahvalnicaDraft(next)
            return next
        })
    }, [user?.fullName])

    const patch = (partial: Partial<ZahvalnicaDraft>) => {
        setDraft((d) => {
            const next = { ...d, ...partial }
            saveZahvalnicaDraft(next)
            return next
        })
    }

    const patchType = (key: keyof ZahvalnicaTypography, style: TextStyle) => {
        setDraft((d) => {
            const next = { ...d, typography: { ...d.typography, [key]: style } }
            saveZahvalnicaDraft(next)
            return next
        })
    }

    const previewStyle = useMemo(() => {
        const map: Record<ZahvalnicaBackground, string> = {
            white: "#ffffff",
            navy: "#122444",
            soft: "#e8f0f8",
        }
        const bg: ZahvalnicaBackground =
            draft.background === "white" || draft.background === "navy" || draft.background === "soft"
                ? draft.background
                : "white"
        return { page: map[bg] }
    }, [draft.background])

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_LOGO
    const themeValue: ZahvalnicaBackground =
        draft.background === "white" || draft.background === "navy" || draft.background === "soft"
            ? draft.background
            : "white"
    const ty = draft.typography

    const issue = async (mode: "pdf" | "print") => {
        setBusy(true)
        try {
            await generateZahvalnicaPdf(draft, {
                issuedBy: user?.username || user?.fullName || "admin",
                print: mode === "print",
            })
            setHistory(loadZahvalnicaHistory())
            // prepare next number for a new certificate
            const n = Number(draft.number)
            if (!Number.isNaN(n)) {
                patch({ number: String(n + 1) })
            }
        } finally {
            setBusy(false)
        }
    }

    if (!canManage) return null

    return (
        <div className={classes.root}>
            <div className={`${classes.header} ${classes.noPrint}`}>
                <Flex align="center" gap={10}>
                    <IconAward size={28} stroke={1.5} />
                    <div>
                        <Title order={2}>
                            <FormattedMessage id="pages.zahvalnica.title" />
                        </Title>
                        <Text size="sm" c="dimmed">
                            <FormattedMessage id="pages.zahvalnica.description" />
                        </Text>
                    </div>
                </Flex>
                <Flex gap="sm" wrap="wrap">
                    <Button
                        variant="default"
                        leftSection={<IconRefresh size={16} />}
                        onClick={() => {
                            const fresh = defaultZahvalnicaDraft({
                                presidentName: user?.fullName || "",
                            })
                            setDraft(fresh)
                            saveZahvalnicaDraft(fresh)
                        }}
                    >
                        <FormattedMessage id="pages.zahvalnica.reset" />
                    </Button>
                    <Button
                        variant="light"
                        leftSection={<IconPrinter size={16} />}
                        loading={busy}
                        onClick={() => issue("print")}
                    >
                        <FormattedMessage id="pages.zahvalnica.print" />
                    </Button>
                    <Button
                        leftSection={<IconDownload size={16} />}
                        loading={busy}
                        onClick={() => issue("pdf")}
                    >
                        <FormattedMessage id="pages.zahvalnica.download" />
                    </Button>
                </Flex>
            </div>

            <div className={classes.layout}>
                <section className={`${classes.form} ${classes.noPrint}`}>
                    <Title order={4}>
                        <FormattedMessage id="pages.zahvalnica.volunteer" />
                    </Title>
                    <UserSearch
                        label={intl.formatMessage({ id: "pages.zahvalnica.pickVolunteer" })}
                        onUserChange={(u) =>
                            patch({
                                volunteerName: u?.fullName || "",
                                volunteerUsername: u?.username || null,
                            })
                        }
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.zahvalnica.volunteerName" })}
                        value={draft.volunteerName}
                        onChange={(e) => patch({ volunteerName: e.currentTarget.value })}
                    />

                    <Title order={4} mt="md">
                        <FormattedMessage id="pages.zahvalnica.textBlock" />
                    </Title>
                    <Select
                        label={intl.formatMessage({ id: "pages.zahvalnica.template" })}
                        data={TEXT_TEMPLATES.map((t) => ({
                            value: t.id,
                            label: intl.formatMessage({ id: t.labelId }),
                        }))}
                        defaultValue="default"
                        onChange={(id) => {
                            const t = TEXT_TEMPLATES.find((x) => x.id === id)
                            if (t) patch(t.patch)
                        }}
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.zahvalnica.orgTitle" })}
                        value={draft.orgTitle}
                        onChange={(e) => patch({ orgTitle: e.currentTarget.value })}
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.zahvalnica.docTitle" })}
                        value={draft.title}
                        onChange={(e) => patch({ title: e.currentTarget.value })}
                    />
                    <Textarea
                        label={intl.formatMessage({ id: "pages.zahvalnica.intro" })}
                        minRows={3}
                        value={draft.intro}
                        onChange={(e) => patch({ intro: e.currentTarget.value })}
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.zahvalnica.contribution" })}
                        description={intl.formatMessage({ id: "pages.zahvalnica.contributionHint" })}
                        value={draft.contribution}
                        onChange={(e) => patch({ contribution: e.currentTarget.value })}
                    />
                    <Textarea
                        label={intl.formatMessage({ id: "pages.zahvalnica.closing" })}
                        minRows={3}
                        value={draft.closing}
                        onChange={(e) => patch({ closing: e.currentTarget.value })}
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.zahvalnica.presidentLabel" })}
                        value={draft.presidentLabel}
                        onChange={(e) => patch({ presidentLabel: e.currentTarget.value })}
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.zahvalnica.presidentName" })}
                        value={draft.presidentName}
                        onChange={(e) => patch({ presidentName: e.currentTarget.value })}
                    />
                    <Flex gap="sm">
                        <TextInput
                            style={{ flex: 1 }}
                            label={intl.formatMessage({ id: "pages.zahvalnica.place" })}
                            value={draft.place}
                            onChange={(e) => patch({ place: e.currentTarget.value })}
                        />
                        <TextInput
                            style={{ flex: 1 }}
                            label={intl.formatMessage({ id: "pages.zahvalnica.date" })}
                            value={draft.dateLabel}
                            onChange={(e) => patch({ dateLabel: e.currentTarget.value })}
                        />
                        <TextInput
                            w={100}
                            label={intl.formatMessage({ id: "pages.zahvalnica.number" })}
                            value={draft.number}
                            onChange={(e) => patch({ number: e.currentTarget.value })}
                        />
                    </Flex>

                    <Title order={4} mt="md">
                        <FormattedMessage id="pages.zahvalnica.fonts" />
                    </Title>
                    <Text size="xs" c="dimmed" mb={6}>
                        <FormattedMessage id="pages.zahvalnica.fontsHint" />
                    </Text>
                    <StyleRow
                        label={intl.formatMessage({ id: "pages.zahvalnica.fontOrg" })}
                        value={ty.org}
                        onChange={(s) => patchType("org", s)}
                    />
                    <StyleRow
                        label={intl.formatMessage({ id: "pages.zahvalnica.fontTitle" })}
                        value={ty.title}
                        onChange={(s) => patchType("title", s)}
                    />
                    <StyleRow
                        label={intl.formatMessage({ id: "pages.zahvalnica.fontName" })}
                        value={ty.name}
                        onChange={(s) => patchType("name", s)}
                    />
                    <StyleRow
                        label={intl.formatMessage({ id: "pages.zahvalnica.fontBody" })}
                        value={ty.body}
                        onChange={(s) => patchType("body", s)}
                    />
                    <StyleRow
                        label={intl.formatMessage({ id: "pages.zahvalnica.fontSign" })}
                        value={ty.sign}
                        onChange={(s) => patchType("sign", s)}
                    />
                    <StyleRow
                        label={intl.formatMessage({ id: "pages.zahvalnica.fontMeta" })}
                        value={ty.meta}
                        onChange={(s) => patchType("meta", s)}
                    />

                    <Title order={4} mt="md">
                        <FormattedMessage id="pages.zahvalnica.design" />
                    </Title>
                    <Select
                        label={intl.formatMessage({ id: "pages.zahvalnica.background" })}
                        value={themeValue}
                        data={[
                            { value: "white", label: intl.formatMessage({ id: "pages.zahvalnica.bg.white" }) },
                            { value: "soft", label: intl.formatMessage({ id: "pages.zahvalnica.bg.soft" }) },
                            { value: "navy", label: intl.formatMessage({ id: "pages.zahvalnica.bg.navy" }) },
                        ]}
                        onChange={(v) => v && patch({ background: v as ZahvalnicaBackground })}
                    />
                    <div>
                        <Text size="sm" fw={500} mb={6}>
                            <FormattedMessage
                                id="pages.zahvalnica.bgOpacity"
                                values={{ value: draft.backgroundOpacity }}
                            />
                        </Text>
                        <Slider
                            min={0}
                            max={60}
                            step={1}
                            value={draft.backgroundOpacity}
                            onChange={(value) => patch({ backgroundOpacity: value })}
                            mb="lg"
                        />
                    </div>
                    <Flex gap="sm" wrap="wrap" align="center">
                        <FileButton
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (file) => {
                                if (!file) return
                                patch({ logoSrc: await readFileAsDataUrl(file) })
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
                                    <FormattedMessage id="pages.zahvalnica.uploadLogo" />
                                </Button>
                            )}
                        </FileButton>
                        <Button
                            variant="subtle"
                            onClick={() => patch({ logoSrc: DEFAULT_LOGO, backgroundImageSrc: DEFAULT_LOGO })}
                        >
                            <FormattedMessage id="pages.zahvalnica.defaultLogo" />
                        </Button>
                        <FileButton
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (file) => {
                                if (!file) return
                                patch({ backgroundImageSrc: await readFileAsDataUrl(file) })
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
                                    <FormattedMessage id="pages.zahvalnica.uploadBg" />
                                </Button>
                            )}
                        </FileButton>
                        {draft.backgroundImageSrc && (
                            <Button variant="subtle" onClick={() => patch({ backgroundImageSrc: null })}>
                                <FormattedMessage id="pages.zahvalnica.clearBg" />
                            </Button>
                        )}
                    </Flex>
                </section>

                <aside className={classes.previewPane}>
                    <Text size="sm" fw={600} mb={8} className={classes.noPrint}>
                        <FormattedMessage id="pages.zahvalnica.preview" />
                    </Text>
                    <article
                        className={classes.preview}
                        style={{
                            backgroundColor: previewStyle.page,
                            borderColor: ty.title.color,
                        }}
                    >
                        {watermarkSrc && draft.backgroundOpacity > 0 && (
                            <img
                                src={watermarkSrc}
                                alt=""
                                className={classes.watermark}
                                style={{ opacity: draft.backgroundOpacity / 100 }}
                            />
                        )}
                        <div className={classes.previewContent}>
                            <img src={draft.logoSrc} alt="" className={classes.previewLogo} />
                            <p
                                className={classes.org}
                                style={{
                                    color: ty.org.color,
                                    fontSize: ty.org.size,
                                    fontWeight: ty.org.bold ? 700 : 500,
                                }}
                            >
                                {draft.orgTitle}
                            </p>
                            <h1
                                className={classes.docTitle}
                                style={{
                                    color: ty.title.color,
                                    fontSize: ty.title.size * 1.15,
                                    fontWeight: ty.title.bold ? 800 : 600,
                                }}
                            >
                                {draft.title}
                            </h1>
                            <div className={classes.rule} style={{ background: ty.title.color }} />
                            <p
                                className={classes.name}
                                style={{
                                    color: ty.name.color,
                                    fontSize: ty.name.size,
                                    fontWeight: ty.name.bold ? 700 : 500,
                                }}
                            >
                                {draft.volunteerName || "—"}
                            </p>
                            <p
                                className={classes.body}
                                style={{
                                    color: ty.body.color,
                                    fontSize: ty.body.size,
                                    fontWeight: ty.body.bold ? 700 : 400,
                                }}
                            >
                                {draft.intro}
                            </p>
                            {draft.contribution.trim() && (
                                <p
                                    className={classes.body}
                                    style={{
                                        color: ty.body.color,
                                        fontSize: ty.body.size,
                                        fontWeight: ty.body.bold ? 700 : 400,
                                    }}
                                >
                                    Посебну захвалност изражавамо за {draft.contribution.trim()}.
                                </p>
                            )}
                            <p
                                className={classes.body}
                                style={{
                                    color: ty.body.color,
                                    fontSize: ty.body.size,
                                    fontWeight: ty.body.bold ? 700 : 400,
                                }}
                            >
                                {draft.closing}
                            </p>
                            <div className={classes.sign}>
                                <span
                                    style={{
                                        color: ty.sign.color,
                                        fontSize: Math.max(10, ty.sign.size - 2),
                                        fontWeight: 400,
                                    }}
                                >
                                    {draft.presidentLabel}
                                </span>
                                <strong
                                    style={{
                                        color: ty.sign.color,
                                        fontSize: ty.sign.size,
                                        fontWeight: ty.sign.bold ? 700 : 500,
                                    }}
                                >
                                    {draft.presidentName || "—"}
                                </strong>
                            </div>
                            <div
                                className={classes.meta}
                                style={{
                                    color: ty.meta.color,
                                    fontSize: ty.meta.size,
                                    fontWeight: ty.meta.bold ? 700 : 400,
                                }}
                            >
                                <span>
                                    {draft.place}, {draft.dateLabel}
                                </span>
                                <span>Број: {draft.number}</span>
                            </div>
                        </div>
                    </article>
                </aside>
            </div>

            <section className={`${classes.history} ${classes.noPrint}`}>
                <Flex justify="space-between" align="center" mb="sm">
                    <Title order={4}>
                        <FormattedMessage id="pages.zahvalnica.history" />
                    </Title>
                    {history.length > 0 && (
                        <Button
                            variant="subtle"
                            color="red"
                            size="compact-sm"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => {
                                clearZahvalnicaHistory()
                                setHistory([])
                            }}
                        >
                            <FormattedMessage id="pages.zahvalnica.clearHistory" />
                        </Button>
                    )}
                </Flex>
                <Text size="sm" c="dimmed" mb="sm">
                    <FormattedMessage id="pages.zahvalnica.historyHint" />
                </Text>
                {history.length === 0 ? (
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id="pages.zahvalnica.historyEmpty" />
                    </Text>
                ) : (
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.number" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.volunteerName" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.contribution" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.issuedAt" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.issuedBy" />
                                </Table.Th>
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.channel" />
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {history.map((row) => (
                                <Table.Tr key={row.id}>
                                    <Table.Td>{row.number}</Table.Td>
                                    <Table.Td>
                                        {row.volunteerName}
                                        {row.volunteerUsername ? (
                                            <Text size="xs" c="dimmed">
                                                @{row.volunteerUsername}
                                            </Text>
                                        ) : null}
                                    </Table.Td>
                                    <Table.Td>{row.contribution || "—"}</Table.Td>
                                    <Table.Td>{dayjs(row.issuedAt).format("DD.MM.YYYY HH:mm")}</Table.Td>
                                    <Table.Td>{row.issuedBy}</Table.Td>
                                    <Table.Td>
                                        {row.channel === "print"
                                            ? intl.formatMessage({ id: "pages.zahvalnica.print" })
                                            : "PDF"}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </section>
        </div>
    )
}

export default ZahvalnicaPage
