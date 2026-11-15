import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

const P1_ROWS = 5
const MAX_ROWS = 25
const COLS = ['ime', 'telefon', 'datum_raskida', 'pol', 'datum_rodjenja', 'starost', 'pasos', 'adresa'] as const

type Col = (typeof COLS)[number]
type VolunteerRow = Partial<Record<Col, string | number | null>>

export type MupApelData = {
    broj?: string
    datum?: string
    volunteers: VolunteerRow[]
}

function fitFontSize(font: ReturnType<PDFDocument['embedFont']> extends Promise<infer F> ? F : never, field: ReturnType<ReturnType<PDFDocument['getForm']>['getTextField']>, text: string): number {
    const TABLE_FONT_MAX = 9
    const TABLE_FONT_MIN = 6
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { width, height } = (field as any).acroField.getWidgets()[0].getRectangle()
    const w = (width as number) - 2
    const h = (height as number) - 2
    const multiline = field.isMultiline()
    for (let size = TABLE_FONT_MAX; size >= TABLE_FONT_MIN; size -= 0.25) {
        if (!multiline) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((font as any).widthOfTextAtSize(text, size) <= w) return size
            continue
        }
        let lines = 1, cur = '', fits = true
        for (const word of text.split(/\s+/).filter(Boolean)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((font as any).widthOfTextAtSize(word, size) > w) { fits = false; break }
            const next = cur ? `${cur} ${word}` : word
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((font as any).widthOfTextAtSize(next, size) <= w) cur = next
            else { lines += 1; cur = word }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (fits && lines * (font as any).heightAtSize(size) * 1.2 <= h) return size
    }
    return TABLE_FONT_MIN
}

export async function fillMupTemplate(
    templateBytes: ArrayBuffer | Uint8Array,
    fontBytes: ArrayBuffer | Uint8Array,
    data: MupApelData
): Promise<Uint8Array> {
    const TABLE_FONT_MAX = 9
    const { broj = '', datum = '', volunteers } = data
    if (volunteers.length > MAX_ROWS) throw new Error(`Max ${MAX_ROWS} volunteers per letter`)

    const pdf = await PDFDocument.load(templateBytes)
    pdf.registerFontkit(fontkit)
    const font = await pdf.embedFont(fontBytes, { subset: true })
    const form = pdf.getForm()

    const setHeader = (name: string, value: string) => {
        const f = form.getTextField(name)
        f.setText(value)
        f.setFontSize(12)
    }
    setHeader('broj', broj)
    setHeader('datum', datum)

    volunteers.forEach((v, i) => {
        for (const col of COLS) {
            const value = v[col] == null ? '' : String(v[col]).trim()
            const f = form.getTextField(`r${i + 1}_${col}`)
            f.setText(value)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            f.setFontSize(value ? fitFontSize(font as any, f as any, value) : TABLE_FONT_MAX)
        }
    })

    if (volunteers.length <= P1_ROWS) {
        for (let n = P1_ROWS + 1; n <= MAX_ROWS; n++) {
            for (const col of COLS) {
                try { form.removeField(form.getTextField(`r${n}_${col}`)) } catch { /* skip missing fields */ }
            }
        }
        try { form.removeField(form.getTextField('p2_broj')) } catch { /* skip */ }
        try { form.removeField(form.getTextField('p2_datum')) } catch { /* skip */ }
        pdf.removePage(1)
    } else {
        setHeader('p2_broj', broj)
        setHeader('p2_datum', datum)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.updateFieldAppearances(font as any)
    form.flatten()
    return pdf.save()
}

export type MupApelVolunteer = {
    username: string
    fullName?: string | null
    phone?: string | null
    birthDate?: string | null
    gender?: string | null
    postalCode?: string | null
    city?: string | null
    address?: string | null
    passport?: string | null
}

const GENDER_ABBR: Record<string, string> = { MALE: 'M', FEMALE: 'Ž' }

export async function downloadMupApelPdf(volunteer: MupApelVolunteer): Promise<void> {
    const templateBytes = await fetch('/resources/apel_raskid_ugovora_mup_template.pdf').then(r => r.arrayBuffer())
    // Dynamic import keeps the large font out of the initial bundle
    const fontModule = await import('src/shared/docs/fonts/DejaVuSans') as unknown as { DEJAVU_SANS: string }
    const fontBytes = Uint8Array.from(atob(fontModule.DEJAVU_SANS), c => c.charCodeAt(0))

    const today = dayjs()
    const birthDate = volunteer.birthDate ? dayjs(volunteer.birthDate) : null
    const age = birthDate?.isValid() ? today.diff(birthDate, 'year') : null

    const adresa = [volunteer.postalCode, volunteer.city, volunteer.address].filter(Boolean).join(', ')

    const row: VolunteerRow = {
        ime: volunteer.fullName ?? '',
        telefon: volunteer.phone ?? '',
        datum_raskida: today.format('DD.MM.YYYY'),
        pol: volunteer.gender ? (GENDER_ABBR[volunteer.gender.toUpperCase()] ?? '') : '',
        datum_rodjenja: birthDate?.isValid() ? birthDate.format('DD.MM.YYYY') : '',
        starost: age !== null ? String(age) : '',
        pasos: volunteer.passport ?? '',
        adresa,
    }

    const pdfBytes = await fillMupTemplate(templateBytes, fontBytes, {
        datum: today.format('DD.MM.YYYY'),
        volunteers: [row],
    })

    saveAs(
        new Blob([pdfBytes], { type: 'application/pdf' }),
        `mup-apel-${volunteer.username ?? 'volunteer'}-${today.format('YYYY-MM-DD')}.pdf`
    )
}
