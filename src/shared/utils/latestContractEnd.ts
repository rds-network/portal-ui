type ContractLike = {
    endDate?: string | null
    type?: string | null
}

export const latestContractEnd = (contracts?: ContractLike[] | null): string | null => {
    const dates = (contracts ?? [])
        .filter((contract) => !contract.type || contract.type === "REGULAR")
        .map((contract) => contract.endDate)
        .filter((value): value is string => !!value)
        .sort()
    return dates.at(-1) ?? null
}

export const formatContractEnd = (value?: string | null): string | null => {
    if (!value) return null
    const [year, month, day] = value.split("-")
    if (!year || !month || !day) return value
    return `${day}.${month}.${year}`
}
