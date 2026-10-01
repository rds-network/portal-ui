import {
    Button,
    Checkbox,
    ColorInput,
    FileButton,
    Flex,
    NumberInput,
    Select,
    Slider,
    Switch,
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
import { Link, useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import generateZahvalnicaPdf from "src/shared/docs/zahvalnica"
import {
    DEFAULT_BACKGROUND,
    DEFAULT_LOGO,
    DEFAULT_SIGNATURE,
    DEFAULT_STAMP,
    PREVIEW_PX_PER_MM,
    SIGNATURE_BASE_WIDTH_MM,
    STAMP_BASE_SIZE_MM,
    TEXT_TEMPLATES,
    TITLE_FONT_CSS,
    TextStyle,
    SavedBackground,
    ZahvalnicaBackground,
    ZahvalnicaDraft,
    ZahvalnicaIssue,
    ZahvalnicaTitleFont,
    ZahvalnicaTypography,
    addSavedBackground,
    clearZahvalnicaHistory,
    compressImageDataUrl,
    defaultZahvalnicaDraft,
    loadSavedBackgrounds,
    loadZahvalnicaDraft,
    loadZahvalnicaHistory,
    removeSavedBackground,
    saveZahvalnicaDraft,
} from "src/shared/docs/zahvalnicaDraft"
import { makeQrDataUrl } from "src/shared/docs/zahvalnicaQr"
import { buildZahvalnicaVerifyUrl, encodeZahvalnicaVerifyToken } from "src/shared/docs/zahvalnicaVerify"
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
            max={56}
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
    const [backgrounds, setBackgrounds] = useState<SavedBackground[]>(() => loadSavedBackgrounds())
    const [busy, setBusy] = useState(false)
    const [previewQr, setPreviewQr] = useState<string | null>(null)

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

    useEffect(() => {
        if (!draft.customTitleFontData) return
        let cancelled = false
        ;(async () => {
            try {
                const face = new FontFace("ZahvalnicaCustomTitle", `url(${draft.customTitleFontData})`)
                await face.load()
                if (!cancelled) document.fonts.add(face)
            } catch {
                /* ignore */
            }
        })()
        return () => {
            cancelled = true
        }
    }, [draft.customTitleFontData])

    useEffect(() => {
        if (!draft.showQr) {
            setPreviewQr(null)
            return
        }
        try {
            const token = encodeZahvalnicaVerifyToken({
                v: 1,
                id: "preview",
                name: draft.volunteerName.trim() || "—",
                number: draft.number,
                date: draft.dateLabel,
                place: draft.place,
                contribution: draft.contribution.trim(),
                president: draft.presidentName.trim(),
                issuedAt: new Date().toISOString(),
            })
            setPreviewQr(makeQrDataUrl(buildZahvalnicaVerifyUrl(token), 2, 1))
        } catch {
            setPreviewQr(null)
        }
    }, [
        draft.showQr,
        draft.volunteerName,
        draft.number,
        draft.dateLabel,
        draft.place,
        draft.contribution,
        draft.presidentName,
    ])

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

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_BACKGROUND
    const themeValue: ZahvalnicaBackground =
        draft.background === "white" || draft.background === "navy" || draft.background === "soft"
            ? draft.background
            : "white"
    const ty = draft.typography
    const titleFontCss = TITLE_FONT_CSS[draft.titleFont] || TITLE_FONT_CSS.marck
    const sigPreviewW = Math.round(
        SIGNATURE_BASE_WIDTH_MM * (Math.min(120, Math.max(10, draft.signatureScale)) / 100) * PREVIEW_PX_PER_MM
    )
    const stampPreviewSize = Math.round(
        STAMP_BASE_SIZE_MM * (Math.min(140, Math.max(20, draft.stampScale)) / 100) * PREVIEW_PX_PER_MM
    )
    const selectedBgId =
        backgrounds.find((b) => b.src === draft.backgroundImageSrc)?.id ||
        (draft.backgroundImageSrc ? null : "builtin-default")

    const issue = async (mode: "pdf" | "print") => {
        setBusy(true)
        try {
            await generateZahvalnicaPdf(draft, {
                issuedBy: user?.username || user?.fullName || "admin",
                print: mode === "print",
            })
            setHistory(loadZahvalnicaHistory())
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
                    <Select
                        label={intl.formatMessage({ id: "pages.zahvalnica.titleFont" })}
                        value={draft.titleFont}
                        data={[
                            { value: "marck", label: "Marck Script" },
                            { value: "magnolia", label: "Magnolia Script" },
                            { value: "montserrat", label: "Montserrat" },
                            {
                                value: "custom",
                                label: draft.customTitleFontName
                                    ? `⬆ ${draft.customTitleFontName}`
                                    : intl.formatMessage({ id: "pages.zahvalnica.customFont" }),
                            },
                        ]}
                        onChange={(v) => v && patch({ titleFont: v as ZahvalnicaTitleFont })}
                        mb="sm"
                    />
                    <Flex gap="sm" wrap="wrap" mb="sm" align="center">
                        <FileButton
                            accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf,application/font-sfnt"
                            onChange={async (file) => {
                                if (!file) return
                                const data = await readFileAsDataUrl(file)
                                patch({
                                    titleFont: "custom",
                                    customTitleFontData: data,
                                    customTitleFontName: file.name,
                                })
                                try {
                                    const face = new FontFace("ZahvalnicaCustomTitle", `url(${data})`)
                                    await face.load()
                                    document.fonts.add(face)
                                } catch {
                                    /* ignore */
                                }
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" size="compact-sm">
                                    <FormattedMessage id="pages.zahvalnica.uploadFont" />
                                </Button>
                            )}
                        </FileButton>
                        {draft.customTitleFontData && (
                            <Button
                                variant="subtle"
                                size="compact-sm"
                                onClick={() =>
                                    patch({
                                        customTitleFontData: null,
                                        customTitleFontName: "",
                                        titleFont: "marck",
                                    })
                                }
                            >
                                <FormattedMessage id="pages.zahvalnica.clearFont" />
                            </Button>
                        )}
                    </Flex>
                    <div>
                        <Text size="sm" fw={500} mb={6}>
                            <FormattedMessage
                                id="pages.zahvalnica.lineHeight"
                                values={{ value: draft.bodyLineHeight.toFixed(2) }}
                            />
                        </Text>
                        <Slider
                            min={1.1}
                            max={2.2}
                            step={0.05}
                            value={draft.bodyLineHeight}
                            onChange={(value) => patch({ bodyLineHeight: value })}
                            mb="md"
                        />
                    </div>
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
                            max={100}
                            step={1}
                            value={draft.backgroundOpacity}
                            onChange={(value) => patch({ backgroundOpacity: value })}
                            mb="md"
                        />
                    </div>
                    <div>
                        <Text size="sm" fw={500} mb={6}>
                            <FormattedMessage
                                id="pages.zahvalnica.bgScale"
                                values={{ value: draft.watermarkScale }}
                            />
                        </Text>
                        <Slider
                            min={40}
                            max={140}
                            step={1}
                            value={draft.watermarkScale}
                            onChange={(value) => patch({ watermarkScale: value })}
                            mb="lg"
                        />
                    </div>
                    <Flex gap="sm" wrap="wrap" align="center">
                        <FileButton
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (file) => {
                                if (!file) return
                                const raw = await readFileAsDataUrl(file)
                                // Knock out black squares so print keeps transparency
                                try {
                                    const img = new Image()
                                    const dataUrl = await new Promise<string>((resolve, reject) => {
                                        img.onload = () => {
                                            const canvas = document.createElement("canvas")
                                            canvas.width = img.width
                                            canvas.height = img.height
                                            const ctx = canvas.getContext("2d")
                                            if (!ctx) {
                                                resolve(raw)
                                                return
                                            }
                                            ctx.drawImage(img, 0, 0)
                                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                                            const px = imageData.data
                                            for (let i = 0; i < px.length; i += 4) {
                                                if (px[i] <= 28 && px[i + 1] <= 28 && px[i + 2] <= 28) {
                                                    px[i + 3] = 0
                                                }
                                            }
                                            ctx.putImageData(imageData, 0, 0)
                                            resolve(canvas.toDataURL("image/png"))
                                        }
                                        img.onerror = reject
                                        img.src = raw
                                    })
                                    patch({ logoSrc: dataUrl })
                                } catch {
                                    patch({ logoSrc: raw })
                                }
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
                                    <FormattedMessage id="pages.zahvalnica.uploadLogo" />
                                </Button>
                            )}
                        </FileButton>
                        <Button variant="subtle" onClick={() => patch({ logoSrc: DEFAULT_LOGO })}>
                            <FormattedMessage id="pages.zahvalnica.defaultLogo" />
                        </Button>
                    </Flex>

                    <Text size="sm" fw={500} mt="md" mb={6}>
                        <FormattedMessage id="pages.zahvalnica.bgLibrary" />
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                        <FormattedMessage id="pages.zahvalnica.bgLibraryHint" />
                    </Text>
                    <div className={classes.bgGallery}>
                        {backgrounds.map((bg) => (
                            <button
                                key={bg.id}
                                type="button"
                                className={`${classes.bgThumb} ${
                                    selectedBgId === bg.id || draft.backgroundImageSrc === bg.src
                                        ? classes.bgThumbActive
                                        : ""
                                }`}
                                title={bg.name}
                                onClick={() =>
                                    patch({
                                        backgroundImageSrc: bg.src,
                                        backgroundOpacity: 100,
                                        watermarkScale: 100,
                                    })
                                }
                            >
                                <img src={bg.src} alt={bg.name} />
                                <span>{bg.name}</span>
                                {!bg.builtin && (
                                    <span
                                        className={classes.bgThumbDelete}
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const next = removeSavedBackground(bg.id)
                                            setBackgrounds(next)
                                            if (draft.backgroundImageSrc === bg.src) {
                                                patch({ backgroundImageSrc: DEFAULT_BACKGROUND })
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.stopPropagation()
                                                const next = removeSavedBackground(bg.id)
                                                setBackgrounds(next)
                                                if (draft.backgroundImageSrc === bg.src) {
                                                    patch({ backgroundImageSrc: DEFAULT_BACKGROUND })
                                                }
                                            }
                                        }}
                                    >
                                        ×
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <Flex gap="sm" wrap="wrap" align="center" mt="sm">
                        <FileButton
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (file) => {
                                if (!file) return
                                const raw = await readFileAsDataUrl(file)
                                const compressed = await compressImageDataUrl(raw)
                                const next = addSavedBackground(file.name.replace(/\.[^.]+$/, ""), compressed)
                                setBackgrounds(next)
                                patch({
                                    backgroundImageSrc: compressed,
                                    backgroundOpacity: 100,
                                    watermarkScale: 100,
                                })
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
                                    <FormattedMessage id="pages.zahvalnica.uploadBg" />
                                </Button>
                            )}
                        </FileButton>
                        {draft.backgroundImageSrc &&
                            !backgrounds.some((b) => b.src === draft.backgroundImageSrc) && (
                                <Button
                                    variant="light"
                                    size="compact-sm"
                                    onClick={() => {
                                        const src = draft.backgroundImageSrc
                                        if (!src) return
                                        const next = addSavedBackground(
                                            intl.formatMessage({ id: "pages.zahvalnica.savedBg" }),
                                            src
                                        )
                                        setBackgrounds(next)
                                    }}
                                >
                                    <FormattedMessage id="pages.zahvalnica.saveBg" />
                                </Button>
                            )}
                        {draft.backgroundImageSrc && (
                            <Button variant="subtle" onClick={() => patch({ backgroundImageSrc: null })}>
                                <FormattedMessage id="pages.zahvalnica.clearBg" />
                            </Button>
                        )}
                    </Flex>

                    <Title order={4} mt="md">
                        <FormattedMessage id="pages.zahvalnica.onlineBlock" />
                    </Title>
                    <Text size="xs" c="dimmed" mb="sm">
                        <FormattedMessage id="pages.zahvalnica.onlineHint" />
                    </Text>
                    <Switch
                        label={intl.formatMessage({ id: "pages.zahvalnica.showSignature" })}
                        checked={draft.showSignature}
                        onChange={(e) => patch({ showSignature: e.currentTarget.checked })}
                        mb={8}
                    />
                    {draft.showSignature && (
                        <>
                            <Text size="sm" fw={500} mb={6}>
                                <FormattedMessage
                                    id="pages.zahvalnica.signatureScale"
                                    values={{ value: draft.signatureScale }}
                                />
                            </Text>
                            <Slider
                                min={10}
                                max={100}
                                step={1}
                                value={draft.signatureScale}
                                onChange={(value) => patch({ signatureScale: value })}
                                mb="sm"
                            />
                            <Text size="sm" fw={500} mb={6}>
                                <FormattedMessage
                                    id="pages.zahvalnica.signatureOffsetX"
                                    values={{ value: draft.signatureOffsetX }}
                                />
                            </Text>
                            <Slider
                                min={-40}
                                max={40}
                                step={1}
                                value={draft.signatureOffsetX}
                                onChange={(value) => patch({ signatureOffsetX: value })}
                                mb="sm"
                            />
                            <Text size="sm" fw={500} mb={6}>
                                <FormattedMessage
                                    id="pages.zahvalnica.signatureOffsetY"
                                    values={{ value: draft.signatureOffsetY }}
                                />
                            </Text>
                            <Slider
                                min={-30}
                                max={30}
                                step={1}
                                value={draft.signatureOffsetY}
                                onChange={(value) => patch({ signatureOffsetY: value })}
                                mb="md"
                            />
                        </>
                    )}
                    <Switch
                        label={intl.formatMessage({ id: "pages.zahvalnica.showStamp" })}
                        checked={draft.showStamp}
                        onChange={(e) => patch({ showStamp: e.currentTarget.checked })}
                        mb={8}
                    />
                    {draft.showStamp && (
                        <>
                            <Text size="sm" fw={500} mb={6}>
                                <FormattedMessage
                                    id="pages.zahvalnica.stampScale"
                                    values={{ value: draft.stampScale }}
                                />
                            </Text>
                            <Slider
                                min={20}
                                max={140}
                                step={1}
                                value={draft.stampScale}
                                onChange={(value) => patch({ stampScale: value })}
                                mb="sm"
                            />
                            <Text size="sm" fw={500} mb={6}>
                                <FormattedMessage
                                    id="pages.zahvalnica.stampOffsetX"
                                    values={{ value: draft.stampOffsetX }}
                                />
                            </Text>
                            <Slider
                                min={-40}
                                max={60}
                                step={1}
                                value={draft.stampOffsetX}
                                onChange={(value) => patch({ stampOffsetX: value })}
                                mb="sm"
                            />
                            <Text size="sm" fw={500} mb={6}>
                                <FormattedMessage
                                    id="pages.zahvalnica.stampOffsetY"
                                    values={{ value: draft.stampOffsetY }}
                                />
                            </Text>
                            <Slider
                                min={-40}
                                max={40}
                                step={1}
                                value={draft.stampOffsetY}
                                onChange={(value) => patch({ stampOffsetY: value })}
                                mb="md"
                            />
                        </>
                    )}
                    <Switch
                        label={intl.formatMessage({ id: "pages.zahvalnica.showQr" })}
                        checked={draft.showQr}
                        onChange={(e) => patch({ showQr: e.currentTarget.checked })}
                        mb="sm"
                    />
                    <Flex gap="sm" wrap="wrap">
                        <FileButton
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (file) => {
                                if (!file) return
                                patch({ signatureSrc: await readFileAsDataUrl(file) })
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" size="compact-sm">
                                    <FormattedMessage id="pages.zahvalnica.uploadSignature" />
                                </Button>
                            )}
                        </FileButton>
                        <Button
                            variant="subtle"
                            size="compact-sm"
                            onClick={() => patch({ signatureSrc: DEFAULT_SIGNATURE })}
                        >
                            <FormattedMessage id="pages.zahvalnica.defaultSignature" />
                        </Button>
                        <FileButton
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (file) => {
                                if (!file) return
                                patch({ stampSrc: await readFileAsDataUrl(file) })
                            }}
                        >
                            {(props) => (
                                <Button {...props} variant="light" size="compact-sm">
                                    <FormattedMessage id="pages.zahvalnica.uploadStamp" />
                                </Button>
                            )}
                        </FileButton>
                        <Button
                            variant="subtle"
                            size="compact-sm"
                            onClick={() => patch({ stampSrc: DEFAULT_STAMP })}
                        >
                            <FormattedMessage id="pages.zahvalnica.defaultStamp" />
                        </Button>
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
                                className={classes.pageBg}
                                style={{
                                    opacity: draft.backgroundOpacity / 100,
                                    transform: `translate(-50%, -50%) scale(${draft.watermarkScale / 100})`,
                                }}
                            />
                        )}
                        <div className={classes.previewContent}>
                            <img src={draft.logoSrc} alt="" className={classes.previewLogo} style={{ width: 32 * PREVIEW_PX_PER_MM, height: 32 * PREVIEW_PX_PER_MM }} />
                            <p
                                className={classes.org}
                                style={{
                                    color: ty.org.color,
                                    fontSize: ty.org.size * (96 / 72),
                                    fontWeight: ty.org.bold ? 700 : 500,
                                }}
                            >
                                {draft.orgTitle}
                            </p>
                            <h1
                                className={classes.docTitle}
                                style={{
                                    color: ty.title.color,
                                    fontSize: ty.title.size * (96 / 72),
                                    fontWeight: ty.title.bold ? 700 : 400,
                                    fontFamily: titleFontCss,
                                }}
                            >
                                {draft.title}
                            </h1>
                            <div className={classes.rule} style={{ background: ty.title.color }} />
                            <p
                                className={classes.name}
                                style={{
                                    color: ty.name.color,
                                    fontSize: ty.name.size * (96 / 72),
                                    fontWeight: ty.name.bold ? 700 : 500,
                                }}
                            >
                                {draft.volunteerName || "—"}
                            </p>
                            <p
                                className={classes.body}
                                style={{
                                    color: ty.body.color,
                                    fontSize: ty.body.size * (96 / 72),
                                    fontWeight: ty.body.bold ? 700 : 400,
                                    lineHeight: draft.bodyLineHeight,
                                }}
                            >
                                {draft.intro}
                            </p>
                            {draft.contribution.trim() && (
                                <p
                                    className={classes.body}
                                    style={{
                                        color: ty.body.color,
                                        fontSize: ty.body.size * (96 / 72),
                                        fontWeight: ty.body.bold ? 700 : 400,
                                        lineHeight: draft.bodyLineHeight,
                                    }}
                                >
                                    Посебну захвалност изражавамо за {draft.contribution.trim()}.
                                </p>
                            )}
                            <p
                                className={classes.body}
                                style={{
                                    color: ty.body.color,
                                    fontSize: ty.body.size * (96 / 72),
                                    fontWeight: ty.body.bold ? 700 : 400,
                                    lineHeight: draft.bodyLineHeight,
                                }}
                            >
                                {draft.closing}
                            </p>
                            <div className={classes.signBlock}>
                                <div className={classes.sign}>
                                    <span
                                        style={{
                                            color: ty.sign.color,
                                            fontSize: Math.max(10, (ty.sign.size - 2) * (96 / 72)),
                                            fontWeight: 400,
                                        }}
                                    >
                                        {draft.presidentLabel}
                                    </span>
                                    {draft.showSignature && (
                                        <img
                                            src={draft.signatureSrc || DEFAULT_SIGNATURE}
                                            alt=""
                                            className={classes.signatureImg}
                                            style={{
                                                width: `${sigPreviewW}px`,
                                                transform: `translate(${draft.signatureOffsetX * PREVIEW_PX_PER_MM}px, ${draft.signatureOffsetY * PREVIEW_PX_PER_MM}px)`,
                                            }}
                                        />
                                    )}
                                    <strong
                                        style={{
                                            color: ty.sign.color,
                                            fontSize: ty.sign.size * (96 / 72),
                                            fontWeight: ty.sign.bold ? 700 : 500,
                                        }}
                                    >
                                        {draft.presidentName || "—"}
                                    </strong>
                                </div>
                                {draft.showStamp && (
                                    <img
                                        src={draft.stampSrc || DEFAULT_STAMP}
                                        alt=""
                                        className={classes.stampImg}
                                        style={{
                                            width: `${stampPreviewSize}px`,
                                            height: `${stampPreviewSize}px`,
                                            transform: `translate(${draft.stampOffsetX * PREVIEW_PX_PER_MM}px, ${draft.stampOffsetY * PREVIEW_PX_PER_MM}px)`,
                                        }}
                                    />
                                )}
                            </div>
                            <div
                                className={classes.meta}
                                style={{
                                    color: ty.meta.color,
                                    fontSize: ty.meta.size * (96 / 72),
                                    fontWeight: ty.meta.bold ? 700 : 400,
                                }}
                            >
                                <div className={classes.metaLeft}>
                                    {draft.showQr && previewQr && (
                                        <img src={previewQr} alt="" className={classes.qrImg} />
                                    )}
                                    <span>
                                        {draft.place}, {draft.dateLabel}
                                    </span>
                                </div>
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
                                <Table.Th>
                                    <FormattedMessage id="pages.zahvalnica.verifyLink" />
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
                                    <Table.Td>
                                        {row.verifyToken ? (
                                            <Link
                                                to={`/zahvalnica/verify?t=${encodeURIComponent(row.verifyToken)}`}
                                                target="_blank"
                                            >
                                                <FormattedMessage id="pages.zahvalnica.openVerify" />
                                            </Link>
                                        ) : (
                                            "—"
                                        )}
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
