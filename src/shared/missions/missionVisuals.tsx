import {
    IconBook,
    IconBrandInstagram,
    IconCamera,
    IconClipboardList,
    IconGift,
    IconHandshake,
    IconHeart,
    IconHeartHandshake,
    IconLink,
    IconPlant2,
    IconStar,
    IconUsers,
} from "@tabler/icons-react"
import React from "react"

export type MissionVisualType = "PICTOGRAM" | "LOGO" | "COVER"

export const MISSION_PICTOGRAMS = [
    "instagram",
    "survey",
    "event",
    "star",
    "heart",
    "users",
    "book",
    "leaf",
    "handshake",
    "gift",
    "camera",
    "link",
] as const

export type MissionPictogramKey = (typeof MISSION_PICTOGRAMS)[number]

const PICTOGRAM_META: Record<
    MissionPictogramKey,
    { bg: string; color: string; Icon: React.ComponentType<{ size?: number; stroke?: number }> }
> = {
    instagram: { bg: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)", color: "#fff", Icon: IconBrandInstagram },
    survey: { bg: "#d1fae5", color: "#047857", Icon: IconClipboardList },
    event: { bg: "#ffe4e6", color: "#be123c", Icon: IconHeartHandshake },
    star: { bg: "#fef3c7", color: "#b45309", Icon: IconStar },
    heart: { bg: "#ffe4e6", color: "#e11d48", Icon: IconHeart },
    users: { bg: "#dbeafe", color: "#1d4ed8", Icon: IconUsers },
    book: { bg: "#e2e8f0", color: "#334155", Icon: IconBook },
    leaf: { bg: "#dcfce7", color: "#15803d", Icon: IconPlant2 },
    handshake: { bg: "#ffedd5", color: "#c2410c", Icon: IconHandshake },
    gift: { bg: "#fce7f3", color: "#be185d", Icon: IconGift },
    camera: { bg: "#e0e7ff", color: "#4338ca", Icon: IconCamera },
    link: { bg: "#ecfeff", color: "#0e7490", Icon: IconLink },
}

export const pictogramMeta = (key?: string | null) => {
    const resolved = (MISSION_PICTOGRAMS as readonly string[]).includes(key || "")
        ? (key as MissionPictogramKey)
        : "star"
    return { key: resolved, ...PICTOGRAM_META[resolved] }
}

type VisualProps = {
    visualType?: string | null
    visualKey?: string | null
    imageUrl?: string | null
    size?: number
    className?: string
    coverClassName?: string
}

/** Circular logo/pictogram for mission cards. */
export const MissionVisualMark: React.FC<VisualProps> = ({
    visualType,
    visualKey,
    imageUrl,
    size = 56,
    className,
}) => {
    const type = (visualType || "PICTOGRAM").toUpperCase()
    if ((type === "LOGO" || type === "COVER") && imageUrl) {
        return (
            <span
                className={className}
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    overflow: "hidden",
                    display: "inline-flex",
                    flexShrink: 0,
                    background: "#f1f5f9",
                }}
            >
                <img
                    src={imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </span>
        )
    }
    const meta = pictogramMeta(visualKey)
    const Icon = meta.Icon
    return (
        <span
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: meta.bg,
                color: meta.color,
            }}
        >
            <Icon size={Math.round(size * 0.48)} stroke={1.75} />
        </span>
    )
}

/** Rectangular cover when visualType = COVER; otherwise null. */
export const MissionVisualCover: React.FC<VisualProps> = ({
    visualType,
    imageUrl,
    coverClassName,
}) => {
    if ((visualType || "").toUpperCase() !== "COVER" || !imageUrl) return null
    return (
        <div className={coverClassName}>
            <img src={imageUrl} alt="" />
        </div>
    )
}
