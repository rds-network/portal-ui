import React, { useContext, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { LocaleContext } from "src/app/providers/LocaleContext"

interface LocalizedMarkdownProps {
    id: string
    className?: string
}

export const LocalizedMarkdown = ({ id, className }: LocalizedMarkdownProps) => {
    const { locale } = useContext(LocaleContext)
    const [markdownContent, setMarkdownContent] = useState<string | undefined>(undefined)

    useEffect(() => {
        import(`src/shared/locales/markdown/${locale}/${id}.md`).then((file) => {
            setMarkdownContent(file.markdown)
        })
    }, [locale, id])

    const highlightIfStartsWith = (children: React.ReactNode, markers: string[]): React.ReactNode => {
        const childArray = React.Children.toArray(children)
        if (childArray.length > 0 && typeof childArray[0] === "string") {
            const text = childArray[0] as string
            const marker = markers.find((m) => text.startsWith(m))
            if (marker) {
                const rest = text.slice(marker.length)
                const tail = childArray.slice(1)
                return (
                    <>
                        <span className="warn">{marker}</span>
                        {rest}
                        {tail}
                    </>
                )
            }
        }
        return children
    }

    const pMarkers = [
        "Не рекомендуется:",
        "Если Вам не предоставлен доступ к облаку:",
        "Not recommended:",
        "If you have not been granted access to the cloud:",
        "Nije preporučljivo:",
        "Ako nemate pristup cloudu:",
        "Некорректные фото:",
    ]

    const liMarkers = ["Некорректные фото:", "Incorrect photos:", "Nekorektne fotografije:"]

    const isOnlyImages = (children: React.ReactNode): boolean => {
        const arr = React.Children.toArray(children)
        if (arr.length === 0) return false
        const nonWhitespace = arr.filter((child) => {
            if (typeof child === "string") {
                return child.trim().length > 0
            }
            return true
        })
        const isImgElement = (node: React.ReactNode): boolean =>
            React.isValidElement(node) && typeof node.type === "string" && node.type === "img"

        const allAreImages = nonWhitespace.every(isImgElement)
        const imageCount = nonWhitespace.filter(isImgElement).length
        return allAreImages && imageCount >= 2
    }

    return (
        <div className={className}>
            <ReactMarkdown
                components={{
                    p: ({ children }: { children?: React.ReactNode }) => {
                        if (isOnlyImages(children)) {
                            return <p className="img-row">{children}</p>
                        }
                        return <p>{highlightIfStartsWith(children, pMarkers)}</p>
                    },
                    li: ({ children }: { children?: React.ReactNode }) => (
                        <li>{highlightIfStartsWith(children, liMarkers)}</li>
                    ),
                    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                }}
            >
                {markdownContent}
            </ReactMarkdown>
        </div>
    )
}

export default LocalizedMarkdown
