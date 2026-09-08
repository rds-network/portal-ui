import { Avatar, CloseButton, Combobox, Flex, InputBase, Loader, Text, useCombobox } from "@mantine/core"
import { UseFormReturnType } from "@mantine/form"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { IconUser } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import React, { ReactNode, useEffect, useState } from "react"
import { useIntl } from "react-intl"
import { UserApiService } from "src/shared/api/user/UserApiService"
import classes from "./UserSearch.module.scss"

interface UserSearchProps {
    label?: ReactNode
    description?: ReactNode
    form?: UseFormReturnType<any>
    path?: string
    className?: string
    onUserChange?: (user: UserInfoDto | null) => void
    initialSearch?: string
}

export const UserSearch = ({
    label,
    description,
    form,
    path,
    className,
    onUserChange,
    initialSearch,
}: UserSearchProps) => {
    const intl = useIntl()

    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    })

    const [selectedUser, setSelectedUser] = useState<UserInfoDto | null>(null)
    const [search, setSearch] = useState(initialSearch ? initialSearch : "")
    const [debouncedSearch, setDebouncedSearch] = useState(search)

    // Debounce search input by 500ms
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search)
        }, 500)
        return () => clearTimeout(handler)
    }, [search])

    useEffect(() => {
        if (onUserChange) {
            onUserChange(selectedUser)
        }
        if (form && path) {
            form.setFieldValue(path, selectedUser?.username)
        }
    }, [selectedUser])

    const { data: users = [], isFetching } = useQuery({
        queryKey: ["searchUsers", debouncedSearch],
        queryFn: () => UserApiService.searchUsers(debouncedSearch, {}).then((response) => response.data.content),
    })

    useEffect(() => {
        if (initialSearch) {
            UserApiService.searchUsers(initialSearch, {}).then((response) => {
                const result = response.data.content
                if (result.length == 1) {
                    setSelectedUser(result[0])
                    setSearch(result[0].fullName)
                }
            })
        }
    }, [])

    const userMap = new Map(users.map((user) => [user.id.toString(), user]))

    const options = users.map((userDto) => {
        return (
            <Combobox.Option value={userDto.id.toString()} key={userDto.id}>
                <Flex align="center" columnGap={12}>
                    <Avatar src={userDto.avatar?.link} size="sm" color="initials" name={userDto.fullName} />
                    <Flex wrap="wrap" align="center" columnGap={8}>
                        <Text className={classes.name}>{userDto.fullName}</Text>
                        <Text className={classes.email}>{userDto.email}</Text>
                    </Flex>
                </Flex>
            </Combobox.Option>
        )
    })

    return (
        <Combobox
            store={combobox}
            withinPortal
            onOptionSubmit={(userId) => {
                const user = userMap.get(userId)
                if (user) {
                    setSelectedUser(user)
                    setSearch(user.fullName)
                }
                combobox.closeDropdown()
            }}
        >
            <Combobox.Target>
                <InputBase
                    label={label}
                    description={description}
                    value={search}
                    className={className}
                    onChange={(event) => {
                        combobox.openDropdown()
                        combobox.updateSelectedOptionIndex()
                        setSearch(event.currentTarget.value)
                        setSelectedUser(null)
                    }}
                    onClick={() => combobox.openDropdown()}
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => {
                        if (!selectedUser) {
                            setSearch("")
                        }
                    }}
                    placeholder={intl.formatMessage({ id: "common.user-search.placeholder" })}
                    leftSection={
                        selectedUser ? (
                            <Avatar
                                src={selectedUser.avatar?.link}
                                size={20}
                                color="initials"
                                name={selectedUser.fullName}
                            />
                        ) : (
                            <IconUser size={20} />
                        )
                    }
                    rightSection={
                        isFetching ? (
                            <Loader size={20} />
                        ) : selectedUser ? (
                            <CloseButton
                                aria-label="Clear input"
                                onClick={() => {
                                    setSelectedUser(null)
                                    setSearch("")
                                }}
                            />
                        ) : (
                            <Combobox.Chevron />
                        )
                    }
                />
            </Combobox.Target>

            <Combobox.Dropdown>
                <Combobox.Options className={classes.dropdown}>
                    {options.length > 0 ? options : <Combobox.Empty>Ничего не найдено</Combobox.Empty>}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    )
}
