export type KolobokSmile = {
    id: string
    file: string
    code: string
    codes: string[]
    label: string
}

export type BodyPart =
    | { type: "text"; value: string }
    | { type: "smile"; id: string; src: string; alt: string; code: string }
    | { type: "mention"; value: string }

/** Kolobok smiles — codes match Uglavnom ugl-office-chat.js */
export const KOLOBOK_SMILES: KolobokSmile[] = [
    { id: "hi", file: "gif/hi.gif", code: ":hi:", codes: [":hi:"], label: "Привет" },
    { id: "bye", file: "gif/bye.gif", code: ":bye:", codes: [":bye:"], label: "Пока" },
    { id: "smile", file: "gif/smile.gif", code: ":)", codes: [":)", ":-)"], label: "Улыбка" },
    { id: "biggrin", file: "gif/biggrin.gif", code: ":D", codes: [":D", ":-D"], label: "Широкая улыбка" },
    { id: "happy", file: "gif/i-m_so_happy.gif", code: ":happy:", codes: [":happy:"], label: "Счастлив" },
    { id: "laugh", file: "gif/laugh1.gif", code: ":laugh:", codes: [":laugh:"], label: "Смеюсь" },
    { id: "lol", file: "gif/lol.gif", code: ":lol:", codes: [":lol:", "XD"], label: "LOL" },
    { id: "rofl", file: "gif/rofl.gif", code: ":rofl:", codes: [":rofl:"], label: "ROFL" },
    { id: "wink", file: "gif/wink.gif", code: ";)", codes: [";)", ";-)"], label: "Подмигивание" },
    { id: "blush", file: "gif/blush.gif", code: ":blush:", codes: [":blush:"], label: "Смущение" },
    { id: "air-kiss", file: "gif/air_kiss.gif", code: ":airkiss:", codes: [":airkiss:"], label: "Воздушный поцелуй" },
    { id: "kiss", file: "gif/kiss.gif", code: ":*", codes: [":*", ":-*"], label: "Поцелуй" },
    { id: "heart", file: "gif/give_heart.gif", code: "<3", codes: ["<3", ":heart:"], label: "Сердце" },
    { id: "friends", file: "gif/friends.gif", code: ":friends:", codes: [":friends:"], label: "Друзья" },
    { id: "sad", file: "gif/sad.gif", code: ":(", codes: [":(", ":-("], label: "Грусть" },
    { id: "cry", file: "gif/cray.gif", code: ":'(", codes: [":'(", ":cry:"], label: "Плачу" },
    { id: "angry", file: "gif/aggressive.gif", code: ">:(", codes: [">:(", ":angry:"], label: "Злюсь" },
    { id: "shock", file: "gif/shok.gif", code: ":O", codes: [":O", ":-O"], label: "Шок" },
    { id: "crazy", file: "gif/crazy.gif", code: ":crazy:", codes: [":crazy:"], label: "Безумие" },
    { id: "facepalm", file: "gif/facepalm.gif", code: ":facepalm:", codes: [":facepalm:"], label: "Рукалицо" },
    { id: "thinking", file: "gif/scratch_one-s_head.gif", code: ":hmm:", codes: [":hmm:"], label: "Думаю" },
    { id: "unknown", file: "gif/unknw.gif", code: ":idk:", codes: [":idk:"], label: "Не знаю" },
    { id: "sorry", file: "gif/sorry.gif", code: ":sorry:", codes: [":sorry:"], label: "Извините" },
    { id: "pardon", file: "gif/pardon.gif", code: ":pardon:", codes: [":pardon:"], label: "Простите" },
    { id: "good", file: "gif/good.gif", code: ":+1:", codes: [":+1:", ":good:"], label: "Хорошо" },
    { id: "bad", file: "gif/bad.gif", code: ":-1:", codes: [":-1:", ":bad:"], label: "Плохо" },
    { id: "ok", file: "gif/ok.gif", code: ":ok:", codes: [":ok:"], label: "Окей" },
    { id: "yes", file: "gif/yess.gif", code: ":yes:", codes: [":yes:"], label: "Да" },
    { id: "no", file: "gif/negative.gif", code: ":no:", codes: [":no:"], label: "Нет" },
    { id: "clap", file: "gif/clapping.gif", code: ":clap:", codes: [":clap:"], label: "Аплодисменты" },
    { id: "thanks", file: "gif/thank_you2.gif", code: ":thanks:", codes: [":thanks:"], label: "Спасибо" },
    { id: "victory", file: "gif/victory.gif", code: ":victory:", codes: [":victory:"], label: "Победа" },
    { id: "secret", file: "gif/secret.gif", code: ":secret:", codes: [":secret:"], label: "Секрет" },
    { id: "mail", file: "gif/mail1.gif", code: ":mail:", codes: [":mail:"], label: "Сообщение" },
    { id: "party", file: "gif/party.gif", code: ":party:", codes: [":party:"], label: "Праздник" },
    { id: "dance", file: "gif/dance.gif", code: ":dance:", codes: [":dance:"], label: "Танец" },
    { id: "music", file: "gif/music.gif", code: ":music:", codes: [":music:"], label: "Музыка" },
    { id: "search", file: "gif/search.gif", code: ":search:", codes: [":search:"], label: "Ищу" },
    { id: "read", file: "gif/read.gif", code: ":read:", codes: [":read:"], label: "Читаю" },
    { id: "bored", file: "gif/boredom.gif", code: ":bored:", codes: [":bored:"], label: "Скучно" },
]

export const KOLOBOK_BASE = "/resources/kolobok/"

export const kolobokAssetUrl = (file: string) =>
    KOLOBOK_BASE + String(file || "").replace(/^\/+/, "")

const codeRows = KOLOBOK_SMILES.flatMap((s) =>
    (s.codes?.length ? s.codes : [s.code]).map((code) => ({ code, smile: s }))
)
codeRows.sort((a, b) => b.code.length - a.code.length)

const CODE_LOOKUP: Record<string, KolobokSmile> = {}
for (const row of codeRows) CODE_LOOKUP[row.code] = row.smile

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const CODE_RE = new RegExp(codeRows.map((r) => escapeRe(r.code)).join("|"), "g")

const MENTION_RE = /@([^\s@]+(?:\s+[^\s@]+){0,4})/g

/** Split body into text / smile / mention parts (smiles win over overlapping text). */
export function parseChatBody(text: string): BodyPart[] {
    const raw = String(text || "")
    if (!raw) return []

    const smileParts: BodyPart[] = []
    let last = 0
    CODE_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = CODE_RE.exec(raw)) !== null) {
        if (m.index > last) smileParts.push({ type: "text", value: raw.slice(last, m.index) })
        const smile = CODE_LOOKUP[m[0]]
        if (smile) {
            smileParts.push({
                type: "smile",
                id: smile.id,
                src: kolobokAssetUrl(smile.file),
                alt: smile.label,
                code: m[0],
            })
        } else {
            smileParts.push({ type: "text", value: m[0] })
        }
        last = m.index + m[0].length
    }
    if (last < raw.length) smileParts.push({ type: "text", value: raw.slice(last) })
    const base = smileParts.length ? smileParts : [{ type: "text" as const, value: raw }]

    const out: BodyPart[] = []
    for (const part of base) {
        if (part.type !== "text") {
            out.push(part)
            continue
        }
        const chunk = part.value
        let cursor = 0
        MENTION_RE.lastIndex = 0
        let mm: RegExpExecArray | null
        while ((mm = MENTION_RE.exec(chunk)) !== null) {
            if (mm.index > cursor) out.push({ type: "text", value: chunk.slice(cursor, mm.index) })
            out.push({ type: "mention", value: mm[0] })
            cursor = mm.index + mm[0].length
        }
        if (cursor < chunk.length) out.push({ type: "text", value: chunk.slice(cursor) })
    }
    return out.length ? out : [{ type: "text", value: raw }]
}
