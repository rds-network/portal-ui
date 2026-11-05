import { Text } from "@mantine/core"
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
    volunteerName?: string
}

export const PotvrdaSignPreview = ({ draft, volunteerName }: Props) => {
    const sigW = Math.round(signatureWidthMm(draft) * PX_PER_MM)
    const stampSize = Math.round(stampSizeMm(draft) * PX_PER_MM)

    return (
        <div className={classes.preview}>
            <Text size="xs" c="dimmed" ta="center" mt="md">
                ПОТВРДА О ВОЛОНТИРАЊУ
            </Text>
            {volunteerName && (
                <Text size="xs" mt="sm" lineClamp={3}>
                    {volunteerName}
                </Text>
            )}
            <div className={classes.previewSpacer} />
            <div className={classes.signBlock}>
                <Text size="xs" fw={600}>
                    Председник Руске дијаспоре у Србији
                </Text>
                <Text size="xs" c="dimmed">
                    M. П.
                </Text>
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
                        <Text size="xs" c="dimmed" td="underline">
                            ________________________
                        </Text>
                    )}
                </div>
                <Text size="xs" c="dimmed" ta="center">
                    (потпис овлашћеног лица)
                </Text>
            </div>
        </div>
    )
}
