import DOMPurify from "dompurify"

export const sanitizeHtml = (html: string): string =>
    DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["p", "b", "strong", "i", "em", "a", "br", "ul", "ol", "li"],
        ALLOWED_ATTR: ["href", "target", "rel"],
    })
