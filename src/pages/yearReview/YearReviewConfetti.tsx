import { useEffect, useRef } from "react"
import classes from "./YearReviewPage.module.scss"

type Particle = {
    x: number
    y: number
    vx: number
    vy: number
    rot: number
    vr: number
    w: number
    h: number
    color: string
    life: number
}

const COLORS = ["#20a090", "#e36b2c", "#f0c14b", "#5ec8ff", "#ff6b8a", "#ffffff", "#1a2b48"]

type Props = {
    burstKey: number
}

const YearReviewConfetti = ({ burstKey }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const particlesRef = useRef<Particle[]>([])
    const rafRef = useRef<number>(0)

    useEffect(() => {
        if (!burstKey) return
        const canvas = canvasRef.current
        if (!canvas) return
        const parent = canvas.parentElement
        if (!parent) return

        const resize = () => {
            canvas.width = parent.clientWidth
            canvas.height = parent.clientHeight
        }
        resize()

        const spawn = () => {
            const count = 42
            const cx = canvas.width * 0.5
            const cy = canvas.height * 0.22
            for (let i = 0; i < count; i++) {
                const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 1.6
                const speed = 4 + Math.random() * 7
                particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * 40,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    rot: Math.random() * Math.PI,
                    vr: (Math.random() - 0.5) * 0.35,
                    w: 5 + Math.random() * 6,
                    h: 8 + Math.random() * 10,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    life: 1,
                })
            }
        }
        spawn()

        const tick = () => {
            const ctx = canvas.getContext("2d")
            if (!ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particlesRef.current = particlesRef.current
                .map((p) => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    vy: p.vy + 0.18,
                    vx: p.vx * 0.99,
                    rot: p.rot + p.vr,
                    life: p.life - 0.012,
                }))
                .filter((p) => p.life > 0 && p.y < canvas.height + 20)

            for (const p of particlesRef.current) {
                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rot)
                ctx.globalAlpha = Math.max(p.life, 0)
                ctx.fillStyle = p.color
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
                ctx.restore()
            }

            if (particlesRef.current.length > 0) {
                rafRef.current = requestAnimationFrame(tick)
            }
        }
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(tick)

        return () => cancelAnimationFrame(rafRef.current)
    }, [burstKey])

    return <canvas ref={canvasRef} className={classes.confetti} aria-hidden />
}

export default YearReviewConfetti
