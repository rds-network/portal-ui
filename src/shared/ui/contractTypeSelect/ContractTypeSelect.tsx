import { CloseButton, Combobox, Flex, Input, InputBase, useCombobox } from "@mantine/core"
import { UseFormReturnType } from "@mantine/form"
import { ContractTypeEnum } from "@rds-network/portal-api-axios"
import { IconContract } from "@tabler/icons-react"
import React, { ReactNode, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"

interface ContractTypeSelectProps {
    className?: string
    onChange?: (type: ContractTypeEnum | null) => void
    form?: UseFormReturnType<any>
    path?: string
    error?: ReactNode
    initial?: ContractTypeEnum | null
}

export const ContractTypeSelect = (props: ContractTypeSelectProps) => {
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    })

    const [value, setValue] = useState<ContractTypeEnum | null>(props.initial ?? null)

    useEffect(() => {
        setValue(props.initial ?? null)
    }, [props.initial])

    useEffect(() => {
        if (props.onChange) {
            props.onChange(value)
        }
        if (props.form && props.path) {
            props.form.setFieldValue(props.path, value)
        }
    }, [value])

    const options = Object.values(ContractTypeEnum).map((item) => (
        <Combobox.Option value={item} key={item}>
            <FormattedMessage id={`common.contract-type.${item}`} />
        </Combobox.Option>
    ))

    return (
        <Flex direction="column">
            <Combobox
                store={combobox}
                onOptionSubmit={(val) => {
                    setValue(val as ContractTypeEnum)
                    combobox.closeDropdown()
                }}
            >
                <Combobox.Target>
                    <InputBase
                        component="button"
                        type="button"
                        pointer
                        withAsterisk
                        error={props.error}
                        label={<FormattedMessage id={"common.contract-type.select.label"} />}
                        className={props.className}
                        onClick={() => combobox.toggleDropdown()}
                        leftSection={<IconContract size={16} />}
                        rightSectionPointerEvents={value === null ? "none" : "all"}
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
                            <FormattedMessage id={`common.contract-type.${value}`} />
                        ) : (
                            <Input.Placeholder>
                                <FormattedMessage id="common.contract-type.select.empty" />
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
