// Application sidebar and comment workflow checks using synthetic API responses.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { routeData } from "./visual-fixtures.mjs"

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-application-view"
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" })
try {
    for (const width of [1920, 1440, 1040, 390, 320]) {
        for (const colorScheme of ["light", "dark"]) {
            const context = await browser.newContext({
                viewport: { width, height: 1000 },
                colorScheme,
                hasTouch: width < 1024,
                reducedMotion: "reduce",
            })
            await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("ru")))
            const page = await context.newPage()
            page.setDefaultTimeout(10000)
            const seed = routeData("/application/example")
            const application = {
                ...seed,
                id: "example",
                status: "PAUSED",
                comment: "Ожидаем подтверждение даты приезда и недостающие документы.",
                skills: "Разработка, организация мероприятий и поддержка волонтёров. ".repeat(8),
                goal: "Хочу помогать команде и участвовать в проектах организации. ".repeat(10),
                bio: "Рассказ об опыте работы, интересах и участии в волонтёрских проектах. ".repeat(8),
                notes: [
                    {
                        ...seed.notes[0],
                        text: "Документы получены.\nСогласовать встречу с заявителем и уточнить участие в программе.",
                    },
                    {
                        ...seed.notes[0],
                        id: "second-note",
                        createdBy: "alexander",
                        text: "Комментарий с длинным текстом: " + "дополнительныеподробности".repeat(12),
                    },
                ],
            }
            const writes = []
            await page.route(base + "/api/**", async (route) => {
                const req = route.request(),
                    path = new URL(req.url()).pathname.replace(/^\/api/, "")
                let data
                try {
                    data = req.postDataJSON()
                } catch {}
                if (req.method() === "POST" && path.includes("/note") && data?.text) {
                    writes.push("add")
                    const note = { ...data, createdBy: "elena", createTime: "2026-09-05T12:00:00" }
                    application.notes = [...application.notes, note]
                    await route.fulfill({ json: note })
                } else if (req.method() === "DELETE" && path.includes("/note")) {
                    writes.push("delete")
                    application.notes = application.notes.filter((note) => note.id !== path.split("/").at(-1))
                    await route.fulfill({ status: 204 })
                } else
                    await route.fulfill({ json: path === "/application/example" ? application : routeData(path, data) })
            })
            await page.goto(base + "/login")
            await page.waitForURL(base + "/")
            await page.goto(base + "/application/example")
            await page.waitForLoadState("networkidle")
            const info = page.locator('main [class*="info_"]').first()
            const controls = page.locator('main [class*="controls_"]').first()
            const comments = page.locator('main [class*="notes_"]').first()
            const infoBox = await info.boundingBox(),
                controlsBox = await controls.boundingBox(),
                commentsBox = await comments.boundingBox()
            assert.equal(commentsBox.x, controlsBox.x)
            assert.equal(commentsBox.width, controlsBox.width)
            assert.ok(Math.abs(commentsBox.y - controlsBox.y - controlsBox.height - 24) <= 1)
            if (width > 1200) {
                assert.ok(controlsBox.x > infoBox.x + infoBox.width)
                assert.ok(infoBox.width <= 896)
                assert.equal(controlsBox.y, infoBox.y)
            }
            assert.equal(
                await page.locator("main .mantine-ScrollArea-viewport").evaluate((e) => e.scrollWidth - e.clientWidth),
                0
            )
            assert.equal(
                await comments.locator(".mantine-Paper-root").count(),
                0,
                "Comments have no nested paper cards"
            )
            assert.equal(await page.getByText(application.comment, { exact: true }).count(), 0)
            const trigger = page.getByRole("button", { name: "Причина паузы", exact: true })
            if (width < 1024) await trigger.tap()
            else await trigger.hover()
            await page.getByRole("dialog").waitFor({ state: "visible" })
            assert.ok(await page.getByRole("dialog").getByText(application.comment, { exact: true }).isVisible())
            await page.keyboard.press("Escape")
            await page.getByRole("dialog").waitFor({ state: "hidden" })
            await page.mouse.move(0, 0)
            await page.locator("main .mantine-ScrollArea-viewport").evaluate((e) => {
                e.scrollTop = 0
            })
            await page.screenshot({ path: `${output}/application-${width}-${colorScheme}-top.png` })
            await comments.scrollIntoViewIfNeeded()
            await page.screenshot({ path: `${output}/comments-${width}-${colorScheme}.png` })
            if (colorScheme === "light" && [1440, 390].includes(width)) {
                const newComment = "Проверочный комментарий в тестовой анкете"
                await page.getByPlaceholder("Добавить комментарий", { exact: true }).fill(newComment)
                await page.getByRole("button", { name: "Добавить комментарий", exact: true }).click()
                const added = comments.locator("article").filter({ hasText: newComment })
                await added.waitFor({ state: "visible" })
                await added.getByRole("button", { name: "Удалить комментарий", exact: true }).click()
                await added.waitFor({ state: "hidden" })
                assert.deepEqual(writes, ["add", "delete"])
            }
            await context.close()
            console.log(
                `PASS ${width}px ${colorScheme}: narrower form, comments below controls, no overflow or nested cards, reason hint`
            )
        }
    }
} finally {
    await browser.close()
}
