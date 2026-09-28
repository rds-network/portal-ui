import { useEffect, useRef } from "react"
import { useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ChatApiService } from "src/shared/api/ChatApiService"

const SOUND_KEY = "portal.chat.sound.v1"
const SOUND_URL = "/resources/sounds/aska.mp3"
const POLL_MS = 8000

const readSoundEnabled = () => {
    try {
        const raw = localStorage.getItem(SOUND_KEY)
        if (raw == null) return true
        return raw !== "0"
    } catch {
        return true
    }
}

/**
 * Global chat sound outside /chat — plays Аська when unread count increases.
 * ChatPage keeps its own in-room sound; watcher skips while on the chat page.
 */
export function ChatNotifyWatcher() {
    const location = useLocation()
    const onChatPage = location.pathname === "/chat" || location.pathname.startsWith("/chat/")
    const prevCount = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const unlocked = useRef(false)
    const lastPlayAt = useRef(0)

    const { data: count = 0 } = useQuery({
        queryKey: ["chat-unread"],
        queryFn: () => ChatApiService.unreadCount(),
        refetchInterval: POLL_MS,
        refetchOnWindowFocus: true,
    })

    useEffect(() => {
        const unlock = () => {
            if (unlocked.current) return
            try {
                if (!audioRef.current) {
                    audioRef.current = new Audio(SOUND_URL)
                    audioRef.current.preload = "auto"
                    audioRef.current.volume = 0.9
                }
                const a = audioRef.current
                a.muted = true
                const p = a.play()
                if (p && typeof p.then === "function") {
                    p.then(() => {
                        a.pause()
                        a.currentTime = 0
                        a.muted = false
                        unlocked.current = true
                    }).catch(() => {
                        a.muted = false
                    })
                } else {
                    a.muted = false
                    unlocked.current = true
                }
            } catch {
                /* ignore */
            }
        }
        window.addEventListener("pointerdown", unlock, { once: true })
        window.addEventListener("keydown", unlock, { once: true })
        return () => {
            window.removeEventListener("pointerdown", unlock)
            window.removeEventListener("keydown", unlock)
        }
    }, [])

    useEffect(() => {
        if (prevCount.current == null) {
            prevCount.current = count
            return
        }
        const grew = count > prevCount.current
        prevCount.current = count
        if (!grew || onChatPage || !readSoundEnabled()) return

        const now = Date.now()
        if (now - lastPlayAt.current < 1400) return
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio(SOUND_URL)
                audioRef.current.preload = "auto"
                audioRef.current.volume = 0.9
            }
            const a = audioRef.current
            a.currentTime = 0
            const p = a.play()
            lastPlayAt.current = now
            if (p && typeof p.catch === "function") p.catch(() => undefined)
        } catch {
            /* ignore */
        }
    }, [count, onChatPage])

    return null
}
