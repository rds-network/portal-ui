/**
 * Соответствие программ/проектов портала категориям из годового извештаја (Sheet2):
 * — п.2 «Подаци о програмима волонтирања» (медији и комуникације, заштита животне средине, …)
 * — п.4 «крајњи корисник волонтирања» (културна добра, јавне површине, …)
 */

export type PotvrdaCategoryMapping = {
    /** Текст для абзаца «следеће волонтерске услуге» */
    servicesDescription: string
}

type CategoryPair = {
    volunteerPrograms: string[]
    beneficiaries: string[]
}

const DEFAULT_OTHER: CategoryPair = {
    volunteerPrograms: ["друго"],
    beneficiaries: ["други"],
}

/** По коду проекта (точнее, чем только программа). */
const BY_PROJECT: Record<string, CategoryPair> = {
    CLEAN_CITY: {
        volunteerPrograms: ["заштита животне средине", "јавне површине"],
        beneficiaries: ["природна добра", "јавне површине"],
    },
    MONITORING: {
        volunteerPrograms: ["јавне површине"],
        beneficiaries: ["јавне површине"],
    },
    BOOK: {
        volunteerPrograms: ["култура"],
        beneficiaries: ["културна добра"],
    },
    LAWS: {
        volunteerPrograms: ["социјална заштита"],
        beneficiaries: ["други"],
    },
    HR: {
        volunteerPrograms: ["социјална заштита"],
        beneficiaries: ["други"],
    },
}

/** Резерв по коду программы, если проект не задан или не в таблице. */
const BY_PROGRAM: Record<string, CategoryPair> = {
    MEDIA: {
        volunteerPrograms: ["медији и комуникације"],
        beneficiaries: ["други"],
    },
    INFORMATION: {
        volunteerPrograms: ["медији и комуникације"],
        beneficiaries: ["други"],
    },
    DESIGN: {
        volunteerPrograms: ["медији и комуникације"],
        beneficiaries: ["други"],
    },
    URBANISM: {
        volunteerPrograms: ["заштита животне средине", "јавне површине"],
        beneficiaries: ["природна добра", "јавне површине"],
    },
    EDUCATION: {
        volunteerPrograms: ["друго"],
        beneficiaries: ["други"],
    },
    LAW: {
        volunteerPrograms: ["социјална заштита"],
        beneficiaries: ["други"],
    },
    IT: DEFAULT_OTHER,
    OTHER: DEFAULT_OTHER,
    MANAGEMENT: DEFAULT_OTHER,
}

const MEDIA_PROJECT_CODES = new Set([
    "ARTICLES",
    "SMM",
    "WEB_FIGMA",
    "SOCIAL_MEDIA_DESIGN",
    "MATERIAL_STYLE",
    "STICKERS",
    "GUIDE_ILLUSTRATIONS",
    "BOOK_MURALS",
    "VIDEO_EDITING",
    "PHOTO",
    "GUIDEBOOK",
    "WEB_DESIGN",
])

function joinSr(items: string[]): string {
    return items.join(", ")
}

function buildDescription(
    pair: CategoryPair,
    programNameSr?: string | null,
    projectNameSr?: string | null
): string {
    const scope =
        projectNameSr?.trim() ||
        (programNameSr?.trim() ? `програм „${programNameSr.trim()}“` : "")
    const programs = joinSr(pair.volunteerPrograms)
    const beneficiaries = joinSr(pair.beneficiaries)
    if (scope) {
        return `${scope}: програм волонтирања — ${programs}; крајњи корисник волонтирања — ${beneficiaries}`
    }
    return `програм волонтирања — ${programs}; крајњи корисник волонтирања — ${beneficiaries}`
}

export function potvrdaCategoriesFromProfile(profile: {
    program?: { code?: string; nameSr?: string | null } | null
    project?: { code?: string; nameSr?: string | null } | null
}): PotvrdaCategoryMapping {
    const projectCode = profile.project?.code?.trim().toUpperCase()
    const programCode = profile.program?.code?.trim().toUpperCase()

    let pair: CategoryPair | undefined
    if (projectCode && BY_PROJECT[projectCode]) {
        pair = BY_PROJECT[projectCode]
    } else if (projectCode && MEDIA_PROJECT_CODES.has(projectCode)) {
        pair = BY_PROGRAM.MEDIA
    } else if (programCode && BY_PROGRAM[programCode]) {
        pair = BY_PROGRAM[programCode]
    } else {
        pair = DEFAULT_OTHER
    }

    return {
        servicesDescription: buildDescription(
            pair,
            profile.program?.nameSr,
            profile.project?.nameSr
        ),
    }
}
