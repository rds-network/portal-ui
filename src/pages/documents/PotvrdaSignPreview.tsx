import { Text } from "@mantine/core"
import {
    getOfficialPotvrdaPreviewBlocks,
    OfficialPotvrdaInput,
} from "src/shared/docs/potvrdaOfficialDocx"
import {
    PotvrdaSignDraft,
    signatureWidthMm,
    stampSizeMm,
} from "src/shared/docs/potvrdaSignDraft"
import { DEFAULT_SIGNATURE, DEFAULT_STAMP } from "src/shared/docs/zahvalnicaDraft"
import classes from "./OfficialPotvrdaEditorPage.module.scss"

const PX_PER_MM = 2

type Props = {
    draft: PotvrdaSignDraft
    input: OfficialPotvrdaInput
}

export const PotvrdaSignPreview = ({ draft, input }: Props) => {
    const sigW = Math.round(signatureWidthMm(draft) * PX_PER_MM)
    const stampSize = Math.round(stampSizeMm(draft) * PX_PER_MM)
    const blocks = getOfficialPotvrdaPreviewBlocks(input)

    return (
        <div className={classes.preview}>
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
                    >
                        {block.text}
                    </p>
                ))}
            </div>
            <div className={classes.signFooter}>
                <div className={classes.signColTitle}>
                    <Text component="span" className={classes.signFooterText}>
                        Председник Руске дијаспоре у Србији
                    </Text>
                </div>
                <div className={classes.signColMp}>
                    <Text component="span" className={classes.signFooterText}>
                        M. П.
                    </Text>
                </div>
                <div className={classes.signColImages}>
                    <div className={classes.signCanvas}>
                        {draft.showSignature && (
                            <img
                                src={draft.signatureSrc || DEFAULT_SIGNATURE}
                                alt=""
                                className={classes.signatureImg}
                                style={{
                                    width: `${sigW}px`,
                                    transform: `translate(${draft.signatureOffsetX * PX_PER_MM}px, ${draft.signatureOffsetY * PX_PER_MM}px)`,
                                }}
                            />
                        )}
                        {draft.showStamp && (
                            <img
                                src={draft.stampSrc || DEFAULT_STAMP}
                                alt=""
                                className={classes.stampImg}
                                style={{
                                    width: `${stampSize}px`,
                                    height: `${stampSize}px`,
                                    transform: `translate(${draft.stampOffsetX * PX_PER_MM}px, ${draft.stampOffsetY * PX_PER_MM}px)`,
                                }}
                            />
                        )}
                        {!draft.showSignature && !draft.showStamp && (
                            <Text component="span" className={classes.signFooterText} td="underline">
                                ________________________
                            </Text>
                        )}
                    </div>
                    <Text component="span" className={`${classes.signFooterText} ${classes.previewMuted}`}>
                        (потпис овлашћеног лица)
                    </Text>
                </div>
            </div>
        </div>
    )
}
