import { Alert, Text } from "@mantine/core"
import { useEffect, useRef, useState } from "react"
import {
    buildOfficialPotvrdaBlob,
    OfficialPotvrdaInput,
} from "src/shared/docs/potvrdaOfficialDocx"
import { PotvrdaSignDraft } from "src/shared/docs/potvrdaSignDraft"
import classes from "./OfficialPotvrdaEditorPage.module.scss"

type Props = {
    input: OfficialPotvrdaInput
    signDraft: PotvrdaSignDraft
}

/** Scales the rendered page down (never up) so the full page width fits the pane. */
const fitToWidth = (host: HTMLDivElement) => {
    const page = host.querySelector<HTMLElement>("section.docx")
    if (!page) {
        return
    }
    host.style.setProperty("--docx-scale", "1")
    const pageWidth = page.getBoundingClientRect().width
    if (pageWidth > 0) {
        host.style.setProperty("--docx-scale", String(Math.min(1, host.clientWidth / pageWidth)))
    }
}

/** Renders the same DOCX the user downloads via docx-preview (WYSIWYG vs file). */
export const PotvrdaDocxPreview = ({ input, signDraft }: Props) => {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const [error, setError] = useState<string | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const el = hostRef.current
        if (!el) {
            return
        }
        let lastWidth = el.clientWidth
        const observer = new ResizeObserver(() => {
            if (el.clientWidth !== lastWidth) {
                lastWidth = el.clientWidth
                fitToWidth(el)
            }
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const el = hostRef.current
        if (!el) {
            return
        }

        const run = async () => {
            setError(null)
            el.innerHTML = ""
            try {
                const { renderAsync } = await import("src/vendor/docx-preview/dist/docx-preview.mjs")
                const { blob } = await buildOfficialPotvrdaBlob(input, signDraft, { download: false })
                const buffer = await blob.arrayBuffer()
                await renderAsync(buffer, el, undefined, {
                    className: "docx",
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: false,
                })
                fitToWidth(el)
            } catch (e) {
                setError(e instanceof Error ? e.message : "preview failed")
            }
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(() => {
            void run()
        }, 400)

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [input, signDraft])

    return (
        <div className={classes.docxPreviewOuter}>
            {error && (
                <Alert color="red" mb="xs" title="" py="xs">
                    <Text size="xs">{error}</Text>
                </Alert>
            )}
            <div ref={hostRef} className={`${classes.docxPreviewHost} ${classes.docxPreviewFonts}`} />
        </div>
    )
}
