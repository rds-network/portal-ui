import { Button, Flex, Slider, Switch, Text } from "@mantine/core"
import { PotvrdaSignDraft, savePotvrdaSignDraft } from "src/shared/docs/potvrdaSignDraft"
import { DEFAULT_SIGNATURE, DEFAULT_STAMP } from "src/shared/docs/zahvalnicaDraft"
import { FormattedMessage, useIntl } from "react-intl"

const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
    })

type Props = {
    draft: PotvrdaSignDraft
    onChange: (next: PotvrdaSignDraft) => void
}

export const PotvrdaSignSection = ({ draft, onChange }: Props) => {
    const intl = useIntl()

    const patch = (partial: Partial<PotvrdaSignDraft>) => {
        const next = { ...draft, ...partial }
        onChange(next)
        savePotvrdaSignDraft(next)
    }

    return (
        <Flex direction="column" gap="xs" mt="xs">
            <Text fw={600} size="sm">
                <FormattedMessage id="pages.documents.official.sign.title" />
            </Text>
            <Text size="xs" c="dimmed">
                <FormattedMessage id="pages.documents.official.sign.hint" />
            </Text>
            <Switch
                label={<FormattedMessage id="pages.zahvalnica.showSignature" />}
                checked={draft.showSignature}
                onChange={(e) => patch({ showSignature: e.currentTarget.checked })}
            />
            {draft.showSignature && (
                <>
                    <Slider
                        label={intl.formatMessage(
                            { id: "pages.zahvalnica.signatureScale" },
                            { value: draft.signatureScale }
                        )}
                        min={10}
                        max={120}
                        value={draft.signatureScale}
                        onChange={(value) => patch({ signatureScale: value })}
                    />
                    <Slider
                        label={intl.formatMessage(
                            { id: "pages.zahvalnica.signatureOffsetX" },
                            { value: draft.signatureOffsetX }
                        )}
                        min={-40}
                        max={40}
                        value={draft.signatureOffsetX}
                        onChange={(value) => patch({ signatureOffsetX: value })}
                    />
                    <Slider
                        label={intl.formatMessage(
                            { id: "pages.zahvalnica.signatureOffsetY" },
                            { value: draft.signatureOffsetY }
                        )}
                        min={-40}
                        max={40}
                        value={draft.signatureOffsetY}
                        onChange={(value) => patch({ signatureOffsetY: value })}
                    />
                </>
            )}
            <Switch
                label={<FormattedMessage id="pages.zahvalnica.showStamp" />}
                checked={draft.showStamp}
                onChange={(e) => patch({ showStamp: e.currentTarget.checked })}
            />
            {draft.showStamp && (
                <>
                    <Slider
                        label={intl.formatMessage({ id: "pages.zahvalnica.stampScale" }, { value: draft.stampScale })}
                        min={20}
                        max={140}
                        value={draft.stampScale}
                        onChange={(value) => patch({ stampScale: value })}
                    />
                    <Slider
                        label={intl.formatMessage({ id: "pages.zahvalnica.stampOffsetX" }, { value: draft.stampOffsetX })}
                        min={-40}
                        max={60}
                        value={draft.stampOffsetX}
                        onChange={(value) => patch({ stampOffsetX: value })}
                    />
                    <Slider
                        label={intl.formatMessage({ id: "pages.zahvalnica.stampOffsetY" }, { value: draft.stampOffsetY })}
                        min={-40}
                        max={40}
                        value={draft.stampOffsetY}
                        onChange={(value) => patch({ stampOffsetY: value })}
                    />
                </>
            )}
            <Flex gap="sm" wrap="wrap">
                <Button
                    variant="light"
                    size="xs"
                    component="label"
                >
                    <FormattedMessage id="pages.documents.official.sign.uploadSignature" />
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                                patch({ signatureSrc: await readFileAsDataUrl(file) })
                            }
                        }}
                    />
                </Button>
                <Button variant="subtle" size="xs" onClick={() => patch({ signatureSrc: DEFAULT_SIGNATURE })}>
                    <FormattedMessage id="pages.documents.official.sign.resetSignature" />
                </Button>
                <Button variant="light" size="xs" component="label">
                    <FormattedMessage id="pages.documents.official.sign.uploadStamp" />
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                                patch({ stampSrc: await readFileAsDataUrl(file) })
                            }
                        }}
                    />
                </Button>
                <Button variant="subtle" size="xs" onClick={() => patch({ stampSrc: DEFAULT_STAMP })}>
                    <FormattedMessage id="pages.documents.official.sign.resetStamp" />
                </Button>
            </Flex>
        </Flex>
    )
}
