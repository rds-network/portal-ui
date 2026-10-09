import { Anchor, Text, TextProps } from "@mantine/core"
import React, { Fragment, useMemo } from "react"
import { IntlShape, useIntl } from "react-intl"

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi

/** Split plain text so http(s) URLs become clickable external links. */
export function LinkifiedText({ children, ...textProps }: TextProps & { children?: string | null }) {
    const intl = useIntl()
    const text = children ?? ""
    const parts = useMemo(() => linkifyParts(text), [text])

    return (
        <Text {...textProps}>
            {parts.map((part, i) =>
                part.type === "url" ? (
                    <Anchor key={i} href={part.value} target="_blank" rel="noopener noreferrer" inherit>
                        {shortUrlLabel(part.value, intl)}
                    </Anchor>
                ) : (
                    <Fragment key={i}>{part.value}</Fragment>
                ),
            )}
        </Text>
    )
}

function shortUrlLabel(url: string, intl: IntlShape): string {
    // Signed MinIO / very long URLs — show a short human label, keep full href.
    if (url.length > 80 || /minio\.|X-Amz-|trash-points\//i.test(url)) {
        return intl.formatMessage({ id: "common.linkified.photo-link" })
    }
    return url
}

type Part = { type: "text" | "url"; value: string }

function linkifyParts(text: string): Part[] {
    if (!text) {
        return [{ type: "text", value: "" }]
    }

    const parts: Part[] = []
    let last = 0
    const re = new RegExp(URL_RE.source, "gi")
    let match: RegExpExecArray | null

    while ((match = re.exec(text)) !== null) {
        if (match.index > last) {
            parts.push({ type: "text", value: text.slice(last, match.index) })
        }

        const raw = match[0]
        const trimmed = raw.replace(/[.,;:!?]+$/u, "")
        parts.push({ type: "url", value: trimmed })
        if (trimmed.length < raw.length) {
            parts.push({ type: "text", value: raw.slice(trimmed.length) })
        }
        last = match.index + raw.length
    }

    if (last < text.length) {
        parts.push({ type: "text", value: text.slice(last) })
    }

    return parts.length ? parts : [{ type: "text", value: text }]
}
