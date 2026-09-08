import { ApplicationDto, OfficialGroupDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { getFullAddress } from "src/shared/utils/getFullAddress"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { notifications } from "@mantine/notifications"

export default function generateContractPdf(
    application: ApplicationDto,
    officialProgramDto: OfficialGroupDto | undefined
) {
    const fullName = errorIfEmpty("Name", application.name)
    const birthDate = dayjs(errorIfEmpty("Birth date", application.birthDate)).format("DD.MM.YYYY")
    const passport = errorIfEmpty("Passport", application.passport)
    const phone = errorIfEmpty("Phone", application.phone)
    const email = errorIfEmpty("Email", application.email)
    const officialProgram = errorIfEmpty("Official Program", officialProgramDto?.nameSr)

    const address = getFullAddress(
        errorIfEmpty("Postal code", application.postalCode),
        errorIfEmpty("City", application.city),
        errorIfEmpty("Address", application.address)
    )
    const contractFrom = dayjs(errorIfEmpty("Contract start date", application.contract?.startDate))
    const contractUntil = dayjs(errorIfEmpty("Contract end date", application.contract?.endDate))

    const pdf = new JsPdf({
        orientation: "p",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        compress: true,
    })

    // Fonts
    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    // Layout constants
    const MARGIN_X = 15
    const MARGIN_TOP = 15
    const MARGIN_BOTTOM = 20

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - MARGIN_X * 2

    // Typography
    const TITLE_PT = 11
    const HEADING_PT = 9
    const BODY_PT = 8
    const SMALL_PT = 7

    let y = MARGIN_TOP
    const ptToMm = (pt: number) => pt * 0.352778
    const lineHeightMm = (pt: number, factor = 1.25) => ptToMm(pt) * factor

    const setBody = () => {
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(BODY_PT)
    }

    const setBold = () => {
        pdf.setFont("Montserrat-Bold", "bold")
    }

    const ensureSpace = (needMm: number) => {
        const bottomLimit = pageHeight - MARGIN_BOTTOM
        if (y + needMm > bottomLimit) {
            pdf.addPage()
            y = MARGIN_TOP
        }
    }

    const writeCentered = (text: string, pt: number, gapAfterMm = 2) => {
        ensureSpace(lineHeightMm(pt) + gapAfterMm)
        setBold()
        pdf.setFontSize(pt)
        pdf.text(text, pageWidth / 2, y, { align: "center" })
        y += lineHeightMm(pt) + gapAfterMm
    }

    const writeLeftRight = (left: string, right: string, pt: number, gapAfterMm = 2) => {
        ensureSpace(lineHeightMm(pt) + gapAfterMm)
        pdf.setFontSize(pt)
        setBody()
        pdf.text(left, MARGIN_X, y)
        pdf.text(right, pageWidth - MARGIN_X, y, { align: "right" })
        y += lineHeightMm(pt) + gapAfterMm
    }

    const writeWrapped = (text: string, pt: number, gapAfterMm = 2) => {
        const paragraphs = text
            .split(/\n{2,}/g)
            .map((p) => p.trim())
            .filter(Boolean)

        pdf.setFontSize(pt)

        for (const p of paragraphs) {
            const lines = pdf.splitTextToSize(p, contentWidth)
            const need = lines.length * lineHeightMm(pt) + gapAfterMm
            ensureSpace(need)

            setBody()
            for (const line of lines) {
                pdf.text(line, MARGIN_X, y)
                y += lineHeightMm(pt)
            }
            y += gapAfterMm
        }
    }

    const writeBullets = (items: string[], pt: number, gapAfterMm = 2) => {
        pdf.setFontSize(pt)
        const bulletX = MARGIN_X
        const textX = MARGIN_X + 4
        const bulletWidth = contentWidth - 4

        for (const item of items) {
            const lines = pdf.splitTextToSize(item, bulletWidth)
            const need = lines.length * lineHeightMm(pt) + gapAfterMm
            ensureSpace(need)

            setBody()
            pdf.text("•", bulletX, y)
            pdf.text(lines[0], textX, y)
            y += lineHeightMm(pt)

            for (let i = 1; i < lines.length; i++) {
                pdf.text(lines[i], textX, y)
                y += lineHeightMm(pt)
            }

            y += gapAfterMm
        }
    }

    const writeInlineBold = (markdown: string, pt: number, gapAfterMm = 2) => {
        const segments = parseBoldMarkdown(markdown)
        pdf.setFontSize(pt)

        const tokens: Array<{ text: string; bold: boolean }> = []
        for (const seg of segments) {
            const parts = seg.text.split(/(\s+)/).filter((p) => p.length > 0)
            for (const part of parts) tokens.push({ text: part, bold: seg.bold })
        }

        const lh = lineHeightMm(pt)
        let lineTokens: Array<{ text: string; bold: boolean }> = []
        let lineW = 0

        const tokenWidth = (t: { text: string; bold: boolean }) => {
            if (t.bold) setBold()
            else setBody()
            pdf.setFontSize(pt)
            return pdf.getTextWidth(t.text)
        }

        const renderLine = (lt: Array<{ text: string; bold: boolean }>) => {
            ensureSpace(lh + gapAfterMm)
            let x = MARGIN_X
            for (const t of lt) {
                if (t.bold) setBold()
                else setBody()
                pdf.setFontSize(pt)
                pdf.text(t.text, x, y)
                x += pdf.getTextWidth(t.text)
            }
            y += lh
        }

        for (const t of tokens) {
            const w = tokenWidth(t)
            const isOnlySpace = t.text.trim().length === 0
            const wouldOverflow = lineW + w > contentWidth

            if (wouldOverflow && lineTokens.length > 0 && !isOnlySpace) {
                renderLine(lineTokens)
                lineTokens = []
                lineW = 0
            }

            if (lineTokens.length === 0 && isOnlySpace) continue

            lineTokens.push(t)
            lineW += w
        }

        if (lineTokens.length > 0) renderLine(lineTokens)
        y += gapAfterMm
    }

    const writeHeading = (text: string) => {
        ensureSpace(lineHeightMm(HEADING_PT) + 2)
        setBold()
        pdf.setFontSize(HEADING_PT)
        pdf.text(text, MARGIN_X, y)
        y += lineHeightMm(HEADING_PT) + 2
    }

    // Contract
    writeCentered("УГОВОР О ВОЛОНТИРАЊУ", TITLE_PT, 3)

    setBody()
    writeLeftRight(dayjs().format("DD.MM.YYYY"), "град Нови Сад", BODY_PT, 3)

    writeWrapped("На основу Закoнa о волонтирању („Службени гласник РС“, бр. 36/2010), уговорне стране:", BODY_PT, 2)

    writeInlineBold(`**${fullName}** рођен **${birthDate}**, адреса **${address}**, Србиjа,`, BODY_PT, 1)
    writeInlineBold(`пасош **${passport}**, (у даљем тексту: Волонтер) и`, BODY_PT, 2)

    writeInlineBold(
        `**Удружење грађана "РУСКА ДИЈАСПОРА У СРБИJИ"**, матични број (МБ): 28355122 ПИБ: 113526376, са седиштем у граду Нови Сад, Шарпланинска 54, 2, 21000,`,
        BODY_PT,
        1
    )

    writeWrapped(
        `Шифра активности: 9499, адреса: 21000, Нови Сад, Шарпланинска 54, 2, које заступа директор Леонид Стеценко (у даљем тексту: Организатор волонтирања) уговорне стране су се договориле о следећем.

Уговорне стране, у горе наведеном својству, сагласне су да волонтер има релевантна стручна знања неопходна за обављање волонтерских активности у организацији организатора волонтирања, те да волонтер испуњава услове предвиђене одредбама Закона о волонтирању (у даљем тексту: Закон).`,
        BODY_PT,
        4
    )

    writeHeading("ЧЛАН 1. ПРЕДМЕТ УГОВОРА")

    writeWrapped(
        `1.1. Волонтирање у смислу овог уговора је организовано добровољно пружање услуга или активности од општег интереса за опште добро или у корист другог лица без плаћања новчане накнаде или захтева за другу имовинску корист.

1.2. Овим уговором волонтер се обавезује да ће пружати услуге учешћа у активностима и догађајима Организатора волонтирања у области заступања интереса дијаспоре руског говорног подручја у Републици Србији, у циљу остваривања циљева дефинисаних Законом, Статутом организације у складу са Законом, овим уговором, програмом волонтирања, упутствима за волонтере, правилима струке.

1.3. У складу са чланом 6. Закона о волонтирању („Сл. гласник РС“, бр. 36/2010), активности волонтера се спроводе у областима од општег интереса. Волонтер може учествовати у једном или више програма волонтирања Организатора, у складу са потребама активности и сопственим вештинама. Главне области волонтирања су:`,
        BODY_PT,
        2
    )

    writeBullets(
        [
            "медијско волонтирање (информативна подршка сајта и друштвених мрежа);",
            "заштита животне средине и уређење јавних површина;",
            "психолошко-педагошка подршка;",
            "промоција здравих стилова живота;",
            "образовне активности;",
            "слободне и креативне активности.",
        ],
        BODY_PT,
        1
    )
    writeWrapped(
        `У оквиру наведених области, волонтер конкретно обавља активности у складу са програмом волонтирања који чини саставни део овог уговора.`,
        BODY_PT,
        4
    )

    writeWrapped(
        `1.4. У тренутку закључења овог уговора, волонтер је примарно укључен у програм: „${officialProgram}“

    1.5. Промена програма или обима активности врши се без измене овог уговора, путем интерне евиденције или анекса, у складу са програмом волонтирања.`,
        BODY_PT,
        4
    )

    writeHeading("ЧЛАН 2. РОК ТРАЈАЊА УГОВОРА")
    writeInlineBold("2.1. Овај Уговор подразумева континуирано, **дугорочно волонтирање**.", BODY_PT, 1)
    writeInlineBold(
        `2.2. Волонтирање ће се вршити од **${contractFrom.format("DD.MM.YYYY")}** до **${contractUntil.format(
            "DD.MM.YYYY"
        )}** године.`,
        BODY_PT,
        3
    )

    writeHeading("ЧЛАН 3. МЕСТО И ВРЕМЕ ВОЛОНТИРАЊА")
    writeInlineBold(
        "**3.1. Место волонтирања одређује се у граду пребивалишта** или боравишта волонтера, у зависности",
        BODY_PT,
        1
    )

    writeWrapped(
        `од облика волонтирања (трајање волонтирања укључујући и онлајн), програма (или програма) у којима волонтер учествује. Наведене информације су приказане у документима о обрачуну волонтирања од стране Организатора волонтирања.`,
        BODY_PT,
        2
    )

    writeInlineBold(
        "**3.2. Трајање (време волонтерске службе)** одређује се у износу **од најмање 10 часова недељно.**",
        BODY_PT,
        2
    )

    writeWrapped(
        `3.3. Волонтер може бити укључен у догађаје у другом граду ван места пребивалишта или боравишта.

3.4. Волонтер има право на накнаду путних трошкова до места волонтирања и назад, ако се волонтирање одвија ван места наведеног у тачки 3.1.

3.5. Волонтер се обавезује да ће о промени пребивалишта или боравишта одмах обавестити Организатора волонтирања са навођењем новог пребивалишта или боравишта најкасније 5 дана унапред.

3.6. Волонтер обавља активности уживо на територији Републике Србије, у складу са планом активности као и онлајн путем информационих система Организатора (портал http://portal.russian.rs/).`,
        BODY_PT,
        4
    )

    writeHeading("ЧЛАН 4. ПРАВА И ОБАВЕЗЕ СТРАНАКА")

    writeWrapped(
        `4.1. Волонтер има право да се упозна са условима волонтирања, услугама и активностима које ће обављати;

4.2. Уколико волонтер нема осигурање за случај повреде и професионалне болести током волонтирања, осигурање обезбеђује организатор волонтирања.`,
        BODY_PT,
        2
    )

    writeInlineBold(
        "4.2.1. Место, облик и конкретан садржај волонтерских активности ближе се утврђују у Прилогу 1 (упитник/изјава), који чини саставни и нераздвојни део овог уговора и има исту правну снагу као и његов основни текст.",
        BODY_PT,
        2
    )

    writeWrapped(
        `4.3. Волонтер није у обавези да волонтира у складу са упутствима организатора волонтирања:
- ако извршење налога може угрозити живот и здравље волонтера, корисника волонтирања или других лица;
- ако је садржина упутства морално неприхватљива за волонтера, корисника волонтирања или другог лица;
- ако је упутство супротно закону или овом уговору о волонтирању;
- ако примена упутства може проузроковати штету волонтеру, кориснику волонтирања или трећем лицу,`,
        BODY_PT,
        4
    )

    writeWrapped(
        `у том случају волонтер је дужан да писменим путем упозори Организатора волонтирања.

4.4. Волонтер је у потпуности одговоран за штету коју намерно или крајњом непажњом проузрокује организатору волонтирања, обављањем волонтерске службе или активности.

4.5. Волонтер се обавезује да чува информације и личне податке добијене током волонтирања и да неће дозволити откривање било каквих информација добијених у интеракцији са Организатором волонтирања, обављањем волонтерских активности без писмене сагласности Организатора волонтирања.

4.6. Волонтер има право на безбедне и здраве услове рада и средства и опрему за личну заштиту, у складу са природом волонтерских услуга и активности које се обављају у складу са законом о праву о безбедности и здрављу на раду („Службени гласник РС“, бр. 35/2023).

4.7. Волонтер се обавезује да обавести организатора волонтирања о битним околностима које утичу или могу утицати на обављање волонтерских услуга и активности или које угрожавају његов живот или здравље, односно живот или здравље лица са којима контактира током волонтирања.

4.8. Волонтер је дужан да услуге пружа лично и непосредно у складу са правилима струке и професионалне етике, када је за пружање услуга потребно стручно знање, непристрасно, без обзира на лична својства корисника;

4.9. Организатор волонтирања је дужан да води евиденцију о волонтирању.

4.10. Организатор волонтирања, при првој организацији волонтирања, дужан је да поднесе Министарству рада пријаву за организовање волонтирања које се спроводи у складу са одредбама овог Закона о волонтирању.

4.11. Организатор волонтирања се обавезује да волонтеру изда потврду о волонтирању са наведеним временом волонтирања.

4.12. Организатор обезбеђује уводну обуку волонтера у трајању до 10 часова, која обухвата упознавање са правним оквиром волонтирања у Републици Србији, безбедност при обављању активности, коришћење дигиталних система Организатора (russian.rs, portal.russian.rs, edu.russian.rs, igramo.rs). Облик, методе, време потребно за обуку утврђује Организатор волонтирања.

4.13. Волонтер се укључује у активности искључиво у складу са програмом волонтирања Организатора, који је саставни део документације и доступан надлежним органима.`,
        BODY_PT,
        4
    )

    writeHeading("ЧЛАН 5. УСЛОВИ РАСКИДА УГОВОРА")
    writeWrapped(
        `5.1. Волонтер може у свако доба раскинути уговор о волонтирању на начин прописан за његово закључење, без обавезе навођења разлога.

5.2. Организатор волонтирања може раскинути уговор о волонтерству:`,
        BODY_PT,
        2
    )

    writeWrapped(
        `1) када нестане потребе за волонтирањем;
2) ако не може да обезбеди услове за даље волонтирање;
3) ако волонтер не испуњава уговорне обавезе;
4) ако волонтер својом активношћу ствара опасност за корисника волонтирања;`,
        BODY_PT,
        3
    )

    writeHeading("ЧЛАН 6. ПРИМЕНА ЗАКОНА И СЛУЧАЈ СПОРА")
    writeWrapped(
        `6.1. На сва питања која нису уређена овим уговором примењују се одредбе Закона и других важећих правила у Републици Србији.

6.2. Уговорне стране сагласне су да сваки спор из овог уговора или у вези са овим уговором биће коначно решен арбитражом у складу са правилником сталне арбитраже при Удружењу "Руска дијаспора у Србији" у Новом Саду.

6.3. Овај Уговор ступа на снагу даном потписивања од стране овлашћених лица уговорних страна.

6.4. Овај уговор је сачињен у 2 (два) истоветна примерка, по један за сваку уговорну страну.`,
        BODY_PT,
        2
    )

    writeHeading("ЧЛАН 7. ПРИЛОЗИ УГОВОРА")
    writeWrapped(
        `7.1. Прилог 1 – Изјава – упитник (заявление – анкета), попуњен и потписан од стране волонтера, чини саставни и нераздвојни део овог уговора и има исту правну снагу као и основни текст уговора.

7.2. Прилог 2 – Програм волонтерских активности у интересу Републике Србије чини саставни и нераздвојни део овог уговора и на основу њега се утврђује садржај и обим волонтерских активности.`,
        BODY_PT,
        6
    )

    ensureSpace(25)

    pdf.setFontSize(SMALL_PT)
    setBody()

    const dividerX = pageWidth / 2
    const colGap = 6
    const leftX = MARGIN_X
    const rightX = dividerX + colGap
    const leftW = dividerX - colGap - MARGIN_X
    const rightW = pageWidth - MARGIN_X - rightX

    let yLeft = y
    setBold()
    pdf.setFontSize(BODY_PT)
    const leftTitleLines = pdf.splitTextToSize('Удружење грађана "РУСКА ДИЈАСПОРА У СРБИJИ"', leftW)
    for (const ln of leftTitleLines) {
        pdf.text(ln, leftX, yLeft)
        yLeft += lineHeightMm(BODY_PT)
    }

    setBody()
    const leftText = `Број текућег рачуна 200-3624860101038-38
Банка Поштанска Штедионица
Удружење грађана "РУСКА ДИЈАСПОРА У СРБИJИ", регистрациони број: 28355122 ПИБ: 113526376
Адреса: 21000, Нови Сад, Шарпланинска 54, 2
Телефон 062 154 78 93

Председник
потпис ______________ ЛЕОНИД СТЕЦЕНКО`
    pdf.setFontSize(SMALL_PT)
    for (const paragraph of leftText.split("\n")) {
        const lines = pdf.splitTextToSize(paragraph, leftW)
        for (const ln of lines) {
            pdf.text(ln, leftX, yLeft)
            yLeft += lineHeightMm(SMALL_PT)
        }
        yLeft += 1
    }

    let yRight = y

    const lineTop = y
    const leftBottom = yLeft

    const rightBottom = yRight
    const lineBottom = Math.max(leftBottom, rightBottom)
    pdf.line(dividerX, lineTop, dividerX, lineBottom)
    pdf.setFontSize(BODY_PT)
    writeInlineBoldAt(
        pdf,
        `**${fullName}** рођен **${birthDate}**`,
        rightX,
        () => yRight,
        (ny) => (yRight = ny),
        rightW,
        BODY_PT
    )

    yRight += 1
    setBody()
    pdf.setFontSize(BODY_PT)
    pdf.text("Адреса:", rightX, yRight)
    yRight += lineHeightMm(BODY_PT)

    writeInlineBoldAt(
        pdf,
        `**Србиjа, ${address}**`,
        rightX,
        () => yRight,
        (ny) => (yRight = ny),
        rightW,
        BODY_PT
    )

    yRight += 1
    writeInlineBoldAt(
        pdf,
        `Пасош: **${passport}**`,
        rightX,
        () => yRight,
        (ny) => (yRight = ny),
        rightW,
        BODY_PT
    )
    writeInlineBoldAt(
        pdf,
        `Телефон: **${phone}**`,
        rightX,
        () => yRight,
        (ny) => (yRight = ny),
        rightW,
        BODY_PT
    )
    writeInlineBoldAt(
        pdf,
        `E-mail: **${email}**`,
        rightX,
        () => yRight,
        (ny) => (yRight = ny),
        rightW,
        BODY_PT
    )

    yRight += 4
    setBody()
    pdf.text(`потпис __________________ ${fullName}`, rightX, yRight)

    pdf.save(`Ugovor_${fullName.replaceAll(" ", "_")}.pdf`)
}

function parseBoldMarkdown(input: string): Array<{ text: string; bold: boolean }> {
    const parts = input.split("**")
    return parts.map((t, i) => ({ text: t, bold: i % 2 === 1 }))
}

function writeInlineBoldAt(
    pdf: JsPdf,
    markdown: string,
    xStart: number,
    getY: () => number,
    setY: (y: number) => void,
    maxWidth: number,
    fontPt: number
) {
    const segments = parseBoldMarkdown(markdown)
    pdf.setFontSize(fontPt)

    const tokens: Array<{ text: string; bold: boolean }> = []
    for (const seg of segments) {
        const parts = seg.text.split(/(\s+)/).filter((p) => p.length > 0)
        for (const part of parts) tokens.push({ text: part, bold: seg.bold })
    }

    const ptToMm = (pt: number) => pt * 0.352778
    const lh = ptToMm(fontPt) * 1.25

    const setBody = () => pdf.setFont("Montserrat-Medium", "normal")
    const setBold = () => pdf.setFont("Montserrat-Bold", "bold")

    const tokenWidth = (t: { text: string; bold: boolean }) => {
        if (t.bold) setBold()
        else setBody()
        pdf.setFontSize(fontPt)
        return pdf.getTextWidth(t.text)
    }

    const renderLine = (lineTokens: Array<{ text: string; bold: boolean }>) => {
        let x = xStart
        let y = getY()
        for (const t of lineTokens) {
            if (t.bold) setBold()
            else setBody()
            pdf.setFontSize(fontPt)
            pdf.text(t.text, x, y)
            x += pdf.getTextWidth(t.text)
        }
        setY(y + lh)
    }

    let lineTokens: Array<{ text: string; bold: boolean }> = []
    let lineW = 0

    for (const t of tokens) {
        const w = tokenWidth(t)
        const isOnlySpace = t.text.trim().length === 0
        const wouldOverflow = lineW + w > maxWidth

        if (wouldOverflow && lineTokens.length > 0 && !isOnlySpace) {
            renderLine(lineTokens)
            lineTokens = []
            lineW = 0
        }

        if (lineTokens.length === 0 && isOnlySpace) continue

        lineTokens.push(t)
        lineW += w
    }

    if (lineTokens.length > 0) renderLine(lineTokens)
}

function errorIfEmpty(name: string, str: string | null | undefined): string {
    if (str == null || str === "") {
        notifications.show(
            ErrorNotification(`${name} is empty`, "Please fill in all required fields before generating the PDF.")
        )
        throw new Error(name + " is empty")
    }
    return str
}
