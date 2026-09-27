import type { MupLetterReason } from "src/shared/api/MupLetterApiService"

export const MUP_TO = "upravazastrance@mup.gov.rs"

export type { MupLetterReason }

const dash = (value?: string) => value?.trim() || "—"

const todaySr = () => {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, "0")
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const yyyy = String(now.getFullYear())
    return `${dd}.${mm}.${yyyy}`
}

const yearStartSr = () => `01.01.${new Date().getFullYear()}`

export const buildMupLetter = (input: {
    fullName: string
    passport?: string
    birthDate?: string
    citizenship?: string
    address?: string
    phone?: string
    email?: string
    terminationDate?: string
    periodFrom?: string
    periodTo?: string
    reason?: MupLetterReason
}) => {
    const fullName = dash(input.fullName)
    const passport = dash(input.passport)
    const birthDate = dash(input.birthDate)
    const citizenship = dash(input.citizenship)
    const terminationDate = dash(input.terminationDate) === "—" ? todaySr() : dash(input.terminationDate)
    const periodFrom = dash(input.periodFrom) === "—" ? yearStartSr() : dash(input.periodFrom)
    const periodTo = dash(input.periodTo) === "—" ? todaySr() : dash(input.periodTo)
    const reason = input.reason ?? "NON_COMPLIANCE"
    const reasonBlock =
        reason === "VOLUNTEER_REQUEST"
            ? `Уговор је раскинут на захтев волонтера (по жељи волонтера), на основу члана 5.1 уговора, којим је предвиђено да волонтер може у свако доба раскинути уговор о волонтирању без обавезе навођења разлога.`
            : `Волонтер није доставио извештаје о активностима за период од ${periodFrom} до ${periodTo}. Након упућених обавештења и провере волонтерског ангажовања, Организатор је утврдио да волонтер не испуњава уговорене обавезе. Уговор је раскинут на основу члана 5.2 тачка 3) уговора, у вези са чланом 19. тачка 3) и чланом 20. став 2. тачка 3) Закона о волонтирању.`
    return {
        to: MUP_TO,
        subject: `Обавештење о престанку уговора о волонтирању – ${fullName}`,
        body: `Удружење „Руска дијаспора у Србији“ обавештава вас да је дана ${terminationDate} раскинут уговор о волонтирању закључен са следећим лицем:

Име и презиме: ${fullName}
Датум рођења: ${birthDate}
Држављанство: ${citizenship}
Број пасоша: ${passport}

${reasonBlock}

О престанку уговора који је послужио као основ за одобрење привременог боравка обавештавамо вас у складу са чланом 8. став 1. Закона о странцима. Молимо да ову чињеницу евидентирате.

С поштовањем,
Леонид Стеценко
Председник удружења „Руска дијаспора у Србији“`,
        reason,
    }
}
