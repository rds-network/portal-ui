import { CloseButton, Combobox, Flex, Input, InputBase, Text, useCombobox } from "@mantine/core"
import { IconAlignBoxLeftTop } from "@tabler/icons-react"
import React, { useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { ReportStatus } from "src/shared/report/status"

interface ReportStatusSelectProps {
    className?: string
    onChange?: (status: string | null) => void
    value?: string | null
}

export const ReportStatusSelect = (props: ReportStatusSelectProps) => {
    const intl = useIntl()
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    })

    const [value, setValue] = useState<string | null>(props.value || null)

    useEffect(() => {
        setValue(props.value || null)
    }, [props.value])

    useEffect(() => {
        if (props.onChange) {
            props.onChange(value)
        }
    }, [value])

    const options = Object.values(ReportStatus).map((item) => (
        <Combobox.Option value={item} key={item}>
            <FormattedMessage id={`common.report-status.${item}`} />
        </Combobox.Option>
    ))

    return (
        <Flex direction="column">
            <Text size="xs" c="dimmed" mb={4}>
                <FormattedMessage id="common.report-status-select.label" />
            </Text>
            <Combobox
                store={combobox}
                onOptionSubmit={(val) => {
                    setValue(val)
                    combobox.closeDropdown()
                }}
            >
                <Combobox.Target>
                    <InputBase
                        aria-label={intl.formatMessage({ id: "common.report-status-select.label" })}
                        component="button"
                        type="button"
                        pointer
                        className={props.className}
                        onClick={() => combobox.toggleDropdown()}
                        leftSection={<IconAlignBoxLeftTop size={16} />}
                        rightSection={
                            value !== null ? (
                                <CloseButton
                                    size="sm"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => setValue(null)}
                                    aria-label="Clear value"
                                />
                            ) : (
                                <Combobox.Chevron />
                            )
                        }
                    >
                        {value ? (
                            <FormattedMessage id={`common.report-status.${value}`} />
                        ) : (
                            <Input.Placeholder>
                                <FormattedMessage id="common.report-status-select.empty" />
                            </Input.Placeholder>
                        )}
                    </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown>
                    <Combobox.Options>{options}</Combobox.Options>
                </Combobox.Dropdown>
            </Combobox>
        </Flex>
    )
}
