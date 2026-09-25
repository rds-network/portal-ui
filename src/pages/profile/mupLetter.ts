export const MUP_TO = "upravazastrance@mup.gov.rs"

export const buildMupLetter = (input: {
    fullName: string
    passport?: string
    birthDate?: string
    address?: string
    phone?: string
    email?: string
}) => {
    const fullName = input.fullName.trim() || "—"
    const passport = input.passport?.trim() || "—"
    const birthDate = input.birthDate?.trim() || "—"
    const address = input.address?.trim() || "—"
    const phone = input.phone?.trim() || "—"
    const email = input.email?.trim() || "—"
    return {
        to: MUP_TO,
        subject: `Обавештење о раскиду уговора о волонтирању – ${fullName}`,
        body: `ПРЕДМЕТ: Обавештење о раскиду уговора о волонтирању – ${fullName}

Поштовани,

Овим путем Вас обавештавамо да је Удружење „РУСКА ДИЈАСПОРА У СРБИЈИ“ донело одлуку о једностраном раскиду уговора о волонтирању са следећим лицем:

Име и презиме: ${fullName}
Број пасоша: ${passport}
Датум рођења: ${birthDate}
Место боравка: ${address}
Телефон: ${phone}
Е-маил: ${email}

Разлог за раскид је одсуство активности и непостојање стварног ангажовања у оквиру волонтерских програма удружења, односно неиспуњење обавеза из уговора о волонтирању у вези са боравком (ВНЖ). Уговор сматрати неважећим.

Молимо да се ово унесе у евиденцију и узме у обзир приликом евентуалних административних поступака у вези са боравком наведеног лица.

С поштовањем,
Леонид Стеценко
Председник удружења „Руска дијаспора у Србији“
Šarplaninska 54, Нови Сад
Тел: +381 62 154 78 93
Email: ruskadijasporausrbiji@gmail.com`,
    }
}
