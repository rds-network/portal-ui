type ContractLike = {
    endDate?: string | null
    startDate?: string | null
    type?: string | null
}

const isActiveOn = (contract: ContractLike, on = new Date()): boolean => {
    const start = contract.startDate ? new Date(contract.startDate) : null
    const end = contract.endDate ? new Date(contract.endDate) : null
    if (start && start > on) return false
    if (end && end < on) return false
    return true
}

export const latestContractEnd = (contracts?: ContractLike[] | null): string | null => {
    const dates = (contracts ?? [])
        .filter((contract) => !contract.type || contract.type === "REGULAR")
        .map((contract) => contract.endDate)
        .filter((value): value is string => !!value)
        .sort()
    return dates.at(-1) ?? null
}

export const hasActiveAssociatedContract = (contracts?: ContractLike[] | null): boolean =>
    (contracts ?? []).some((contract) => contract.type === "ASSOCIATED" && isActiveOn(contract))

export const formatContractEnd = (value?: string | null): string | null => {
    if (!value) return null
    const [year, month, day] = value.split("-")
    if (!year || !month || !day) return value
    return `${day}.${month}.${year}`
}
