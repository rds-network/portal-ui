import { Anchor, Text, TextProps } from "@mantine/core"
import React, { Fragment, useMemo } from "react"
import { IntlShape, useIntl } from "react-intl"

/** Markdown [label](url) — preferred for Ekomapa bag photos. */
const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi

/** Split plain text so http(s) URLs become clickable external links. */
export function LinkifiedText({ children, ...textProps }: TextProps & { children?: string | null }) {
    const intl = useIntl()
    const text = children ?? ""
    const parts = useMemo(() => linkifyParts(text, intl), [text, intl])

    return (
        <Text {...textProps}>
            {parts.map((part, i) =>
                part.type === "url" ? (
                    <Anchor
                        key={i}
                        href={part.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        inherit
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part.label}
                    </Anchor>
                ) : (
                    <Fragment key={i}>{part.value}</Fragment>
                ),
            )}
        </Text>
    )
}

/**
 * Plain-text preview for list cards: replace long/signed photo URLs with short labels
 * (no clickable href — parent is often a <button>).
 */
export function shortenUrlsForPreview(text: string | null | undefined, intl: IntlShape): string {
    if (!text) {
        return ""
    }
    return linkifyParts(text, intl)
        .map((part) => (part.type === "url" ? part.label : part.value))
        .join("")
}

function isPhotoLikeUrl(url: string): boolean {
    return url.length > 80 || /minio\.|X-Amz-|trash-points\/|cleaning|bag/i.test(url)
}

type Part = { type: "text"; value: string } | { type: "url"; href: string; label: string }

function linkifyParts(text: string, intl: IntlShape): Part[] {
    if (!text) {
        return [{ type: "text", value: "" }]
    }

    // Collapse accidental newlines inside long signed URLs (word-wrap paste / AI translation).
    const normalized = text.replace(/(https?:\/\/[^\s]+)(?:\r?\n|\s+)(?=[A-Za-z0-9._~%-]*=)/g, "$1")

    const parts: Part[] = []
    let last = 0
    let photoIndex = 0

    type Match = { start: number; end: number; href: string; label: string }
    const matches: Match[] = []

    const mdRe = new RegExp(MD_LINK_RE.source, "gi")
    let md: RegExpExecArray | null
    while ((md = mdRe.exec(normalized)) !== null) {
        const label =
            md[1].trim() ||
            intl.formatMessage({ id: "common.linkified.photo-link" }, { n: ++photoIndex })
        matches.push({
            start: md.index,
            end: md.index + md[0].length,
            // Keep full signed URL — MinIO bucket is private without X-Amz-* query.
            href: md[2],
            label,
        })
    }

    const urlRe = new RegExp(URL_RE.source, "gi")
    let urlMatch: RegExpExecArray | null
    while ((urlMatch = urlRe.exec(normalized)) !== null) {
        const start = urlMatch.index
        const end = start + urlMatch[0].length
        if (matches.some((m) => start >= m.start && end <= m.end)) {
            continue
        }
        const raw = urlMatch[0].replace(/[.,;:!?]+$/u, "")
        let label = raw
        if (isPhotoLikeUrl(raw)) {
            photoIndex += 1
            label = intl.formatMessage({ id: "common.linkified.photo-link" }, { n: photoIndex })
        }
        matches.push({ start, end: start + raw.length, href: raw, label })
    }

    matches.sort((a, b) => a.start - b.start)

    for (const m of matches) {
        if (m.start < last) {
            continue
        }
        if (m.start > last) {
            parts.push({ type: "text", value: normalized.slice(last, m.start) })
        }
        parts.push({ type: "url", href: m.href, label: m.label })
        last = m.end
    }

    if (last < normalized.length) {
        parts.push({ type: "text", value: normalized.slice(last) })
    }

    return parts.length ? parts : [{ type: "text", value: text }]
}
