import { Text } from "@mantine/core"
import { useEffect, useRef, useState } from "react"
import {
    getOfficialPotvrdaPreviewBlocks,
    OfficialPotvrdaInput,
} from "src/shared/docs/potvrdaOfficialDocx"
import {
    docxSignatureWidthMm,
    docxStampSizeMm,
    POTVRDA_DOCX_PT,
    potvrdaDocxSignatureAnchorMm,
    potvrdaDocxStampAnchorMm,
    PotvrdaSignDraft,
} from "src/shared/docs/potvrdaSignDraft"
import {
    A4_WIDTH_MM,
    DEFAULT_SIGNATURE,
    DEFAULT_STAMP,
    mmToPreviewPx,
    PREVIEW_PX_PER_MM,
    ptToPreviewPx,
} from "src/shared/docs/zahvalnicaDraft"
import classes from "./OfficialPotvrdaEditorPage.module.scss"

type Props = {
    draft: PotvrdaSignDraft
    input: OfficialPotvrdaInput
}

export const PotvrdaSignPreview = ({ draft, input }: Props) => {
    const previewRef = useRef<HTMLDivElement | null>(null)
    const [pxPerMm, setPxPerMm] = useState(PREVIEW_PX_PER_MM)
    const blocks = getOfficialPotvrdaPreviewBlocks(input)

    useEffect(() => {
        const el = previewRef.current
        if (!el || typeof ResizeObserver === "undefined") {
            return
        }
        const update = () => {
            const w = el.getBoundingClientRect().width
            if (w > 40) {
                setPxPerMm(w / A4_WIDTH_MM)
            }
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const pt = (size: number) => ptToPreviewPx(size, pxPerMm)
    const mm = (size: number) => mmToPreviewPx(size, pxPerMm)

    const stampMm = docxStampSizeMm(draft)
    const sigWMm = docxSignatureWidthMm(draft)
    const stampAnchor = potvrdaDocxStampAnchorMm(draft)
    const sigAnchor = potvrdaDocxSignatureAnchorMm(draft)
    const canvasMinHeight = mm(Math.max(stampMm + stampAnchor.y + 4, 22))

    return (
        <div ref={previewRef} className={classes.preview}>
            <div className={classes.previewBody}>
                {blocks.map((block, index) => (
                    <p
                        key={index}
                        className={[
                            classes.previewParagraph,
                            block.muted ? classes.previewMuted : "",
                            block.bold ? classes.previewBold : "",
                            block.align === "center"
                                ? classes.previewCenter
                                : block.align === "justify"
                                  ? classes.previewJustify
                                  : classes.previewStart,
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        style={{
                            fontSize: pt(block.muted ? POTVRDA_DOCX_PT.hint : POTVRDA_DOCX_PT.body),
                            lineHeight: block.muted ? 1.15 : 1.22,
                        }}
                    >
                        {block.text}
                    </p>
                ))}
            </div>
            <div className={classes.signFooter}>
                <div className={classes.signColTitle}>
                    <Text
                        component="span"
                        className={classes.signFooterText}
                        style={{ fontSize: pt(POTVRDA_DOCX_PT.president) }}
                    >
                        Председник Руске дијаспоре у Србији
                    </Text>
                </div>
                <div className={classes.signColMp}>
                    <Text
                        component="span"
                        className={classes.signFooterText}
                        style={{ fontSize: pt(POTVRDA_DOCX_PT.body) }}
                    >
                        M. П.
                    </Text>
                </div>
                <div className={classes.signColImages}>
                    <div className={classes.signCanvas} style={{ minHeight: canvasMinHeight }}>
                        {draft.showStamp && (
                            <img
                                src={draft.stampSrc || DEFAULT_STAMP}
                                alt=""
                                className={classes.stampImg}
                                style={{
                                    width: mm(stampMm),
                                    height: mm(stampMm),
                                    left: mm(Math.max(0, stampAnchor.x)),
                                    top: mm(Math.max(0, stampAnchor.y)),
                                }}
                            />
                        )}
                        {draft.showSignature && (
                            <img
                                src={draft.signatureSrc || DEFAULT_SIGNATURE}
                                alt=""
                                className={classes.signatureImg}
                                style={{
                                    width: mm(sigWMm),
                                    left: mm(Math.max(0, sigAnchor.x)),
                                    top: mm(Math.max(0, sigAnchor.y)),
                                }}
                            />
                        )}
                        {!draft.showSignature && !draft.showStamp && (
                            <Text
                                component="span"
                                className={classes.signFooterText}
                                td="underline"
                                style={{ fontSize: pt(POTVRDA_DOCX_PT.body) }}
                            >
                                ________________________
                            </Text>
                        )}
                    </div>
                    <Text
                        component="span"
                        className={`${classes.signFooterText} ${classes.previewMuted}`}
                        style={{ fontSize: pt(POTVRDA_DOCX_PT.caption) }}
                    >
                        (потпис овлашћеног лица)
                    </Text>
                </div>
            </div>
        </div>
    )
}
