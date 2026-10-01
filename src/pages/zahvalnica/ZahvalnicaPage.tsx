import {
    Button,
    FileButton,
    Flex,
    Select,
    Slider,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core"
import { IconAward, IconDownload, IconPhoto, IconRefresh } from "@tabler/icons-react"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import generateZahvalnicaPdf from "src/shared/docs/zahvalnica"
import {
    DEFAULT_LOGO,
    TEXT_TEMPLATES,
    ZahvalnicaBackground,
    ZahvalnicaDraft,
    defaultZahvalnicaDraft,
    loadZahvalnicaDraft,
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

export const ZahvalnicaPage: React.FC = () => {
    setDocumentTitleByLocale("pages.zahvalnica.title")
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const canManage = hasPermission(user, ADMIN_ROLES)

    const [draft, setDraft] = useState<ZahvalnicaDraft>(() => loadZahvalnicaDraft())
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

    const previewStyle = useMemo(() => {
        const map: Record<ZahvalnicaBackground, string> = {
            white: "#ffffff",
            navy: "#122444",
            soft: "#e8f0f8",
        }
        const textMap: Record<ZahvalnicaBackground, string> = {
            white: "#14233c",
            navy: "#fafafa",
            soft: "#142846",
        }
        const accentMap: Record<ZahvalnicaBackground, string> = {
            white: "#1a365d",
            navy: "#dcbe64",
            soft: "#285a8c",
        }
        const bg: ZahvalnicaBackground =
            draft.background === "white" || draft.background === "navy" || draft.background === "soft"
                ? draft.background
                : "white"
        return {
            page: map[bg],
            color: textMap[bg],
            accent: accentMap[bg],
        }
    }, [draft.background])

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_LOGO
    const themeValue: ZahvalnicaBackground =
        draft.background === "white" || draft.background === "navy" || draft.background === "soft"
            ? draft.background
            : "white"

    if (!canManage) return null

    return (
        <div className={classes.root}>
            <div className={classes.header}>
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
                        leftSection={<IconDownload size={16} />}
                        loading={busy}
                        onClick={async () => {
                            setBusy(true)
                            try {
                                await generateZahvalnicaPdf(draft)
                            } finally {
                                setBusy(false)
                            }
                        }}
                    >
                        <FormattedMessage id="pages.zahvalnica.download" />
                    </Button>
                </Flex>
            </div>

            <div className={classes.layout}>
                <section className={classes.form}>
                    <Title order={4}>
                        <FormattedMessage id="pages.zahvalnica.volunteer" />
                    </Title>
                    <UserSearch
                        label={intl.formatMessage({ id: "pages.zahvalnica.pickVolunteer" })}
                        onUserChange={(u) => patch({ volunteerName: u?.fullName || "" })}
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
                            marks={[
                                { value: 0, label: "0%" },
                                { value: 12, label: "12%" },
                                { value: 30, label: "30%" },
                                { value: 60, label: "60%" },
                            ]}
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
                    <Text size="sm" fw={600} mb={8}>
                        <FormattedMessage id="pages.zahvalnica.preview" />
                    </Text>
                    <article
                        className={classes.preview}
                        style={{
                            backgroundColor: previewStyle.page,
                            color: previewStyle.color,
                            borderColor: previewStyle.accent,
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
                            <p className={classes.org} style={{ color: previewStyle.accent }}>
                                {draft.orgTitle}
                            </p>
                            <h1 className={classes.docTitle}>{draft.title}</h1>
                            <div className={classes.rule} style={{ background: previewStyle.accent }} />
                            <p className={classes.name} style={{ color: previewStyle.accent }}>
                                {draft.volunteerName || "—"}
                            </p>
                            <p className={classes.body}>{draft.intro}</p>
                            {draft.contribution.trim() && (
                                <p className={classes.body}>
                                    Посебну захвалност изражавамо за {draft.contribution.trim()}.
                                </p>
                            )}
                            <p className={classes.body}>{draft.closing}</p>
                            <div className={classes.sign}>
                                <span>{draft.presidentLabel}</span>
                                <strong style={{ color: previewStyle.accent }}>
                                    {draft.presidentName || "—"}
                                </strong>
                            </div>
                            <div className={classes.meta}>
                                <span>
                                    {draft.place}, {draft.dateLabel}
                                </span>
                                <span>Број: {draft.number}</span>
                            </div>
                        </div>
                    </article>
                </aside>
            </div>
        </div>
    )
}

export default ZahvalnicaPage
