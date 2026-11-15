import PizZip from "pizzip"

const MM_TO_EMU = 36000

export const mmToEmu = (mm: number) => Math.round(mm * MM_TO_EMU)

const dataUrlToBytes = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

export const loadImageDataUrl = async (src: string): Promise<string> => {
    if (src.startsWith("data:")) {
        return src
    }
    const res = await fetch(src)
    if (!res.ok) {
        throw new Error("Image not found")
    }
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

export const measureDataUrl = (dataUrl: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.src = dataUrl
    })

const nextRelId = (relsXml: string): number => {
    const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number.parseInt(m[1]!, 10))
    return (ids.length ? Math.max(...ids) : 0) + 1
}

const appendImageRel = (relsXml: string, relId: number, mediaPath: string): string => {
    const tag = `<Relationship Id="rId${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${mediaPath}"/>`
    return relsXml.replace("</Relationships>", `${tag}</Relationships>`)
}

/** Adds PNG/JPEG bytes under word/media and returns relationship id like rId12. */
export const addImageToDocx = (zip: PizZip, fileName: string, dataUrl: string): string => {
    const bytes = dataUrlToBytes(dataUrl)
    zip.file(`word/media/${fileName}`, bytes)
    const relsPath = "word/_rels/document.xml.rels"
    const relsXml = zip.file(relsPath)!.asText()
    const relId = nextRelId(relsXml)
    zip.file(relsPath, appendImageRel(relsXml, relId, `media/${fileName}`))
    return `rId${relId}`
}

const pictureGraphic = (embedId: string, widthEmu: number, heightEmu: number): string =>
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name=""/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${embedId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`

export const inlineDrawing = (embedId: string, widthEmu: number, heightEmu: number, docPrId: number): string =>
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:docPr id="${docPrId}" name="Picture ${docPrId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>${pictureGraphic(
        embedId,
        widthEmu,
        heightEmu
    )}</wp:inline></w:drawing></w:r>`

/** Floating image in table cell — avoids pushing footer to a blank second page. */
export const anchoredDrawing = (
    embedId: string,
    widthEmu: number,
    heightEmu: number,
    docPrId: number,
    offsetXEmu: number,
    offsetYEmu: number
): string =>
    `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${offsetXEmu}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${offsetYEmu}</wp:posOffset></wp:positionV><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${docPrId}" name="Picture ${docPrId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>${pictureGraphic(
        embedId,
        widthEmu,
        heightEmu
    )}</wp:anchor></w:drawing></w:r>`
