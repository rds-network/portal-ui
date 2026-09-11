// Reads and changes only synthetic fixtures; all API requests are intercepted.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { routeData } from "./visual-fixtures.mjs"

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-application-reasons"
await mkdir(output, { recursive: true })
const pauseReason = "Ожидаем уточнения даты приезда.\nСвязаться с заявителем в следующем месяце."
const denyReason =
    "Не хватает документов для участия.\n" +
    "Подробности необходимо уточнить у заявителя. ".repeat(24) +
    "ДлинноеСлово".repeat(30)
const result = routeData("/applications")
const applications = {
    ...result,
    content: result.content.map((app, index) => ({
        ...app,
        status: ["PAUSED", "DENY", "DOCS_SENT"][index],
        comment: index === 0 ? pauseReason : "Старый комментарий неактуального статуса",
        refuseReason: index === 1 ? denyReason : undefined,
    })),
}

const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" })
try {
    for (const width of [1440, 1040, 390, 320]) {
        for (const colorScheme of ["light", "dark"]) {
            const context = await browser.newContext({
                viewport: { width, height: 950 },
                colorScheme,
                reducedMotion: "reduce",
                hasTouch: width < 1024,
            })
            await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("ru")))
            const page = await context.newPage()
            page.setDefaultTimeout(10000)
            const errors = [],
                writes = []
            page.on("pageerror", (e) => errors.push(e.message))
            await page.route(base + "/api/**", async (route) => {
                const req = route.request()
                const path = new URL(req.url()).pathname.replace(/^\/api/, "")
                if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method()) && path.startsWith("/application/"))
                    writes.push(path)
                let data
                try {
                    data = req.postDataJSON()
                } catch {}
                await route.fulfill({ json: path === "/applications" ? applications : routeData(path, data) })
            })
            await page.goto(base + "/login")
            await page.waitForURL(base + "/")
            await page.goto(base + "/applications")
            await page.waitForLoadState("networkidle")
            const comments = page.getByRole("link", { name: "Комментарии: 1", exact: true })
            assert.equal(await comments.count(), 3)
            assert.equal(
                await comments.first().evaluate((e) => getComputedStyle(e).backgroundColor),
                "rgba(0, 0, 0, 0)"
            )
            const longStatus = page.locator('main [title="Документы отправлены"]')
            assert.equal(await longStatus.evaluate((e) => getComputedStyle(e).whiteSpace), "nowrap")
            assert.equal(await longStatus.evaluate((e) => getComputedStyle(e).textOverflow), "ellipsis")
            assert.equal(await page.getByText(pauseReason, { exact: true }).count(), 0)
            assert.equal(await page.getByText("Старый комментарий неактуального статуса", { exact: true }).count(), 0)
            const reasons = [
                ["Причина паузы", pauseReason, "pause"],
                ["Причина отказа", denyReason, "deny"],
            ]
            for (const [label, reason, key] of reasons) {
                const trigger = page.getByRole("button", { name: label, exact: true })
                assert.equal(await trigger.count(), 1)
                await trigger.scrollIntoViewIfNeeded()
                const positionInPage = () =>
                    trigger.evaluate(
                        (e) =>
                            e.getBoundingClientRect().y +
                            document.querySelector("main .mantine-ScrollArea-viewport").scrollTop
                    )
                const before = await positionInPage()
                await page.screenshot({ path: `${output}/closed-${key}-${width}-${colorScheme}.png` })
                if (width < 1024) await trigger.tap()
                else await trigger.hover()
                const dialog = page.getByRole("dialog")
                await dialog.waitFor({ state: "visible" })
                assert.equal(
                    page.url(),
                    base + "/applications",
                    "Reading a reason must not navigate to the application"
                )
                assert.ok(await dialog.getByText(reason, { exact: true }).isVisible())
                const bounds = await dialog.boundingBox()
                assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, "Reason popover must fit the viewport")
                assert.equal(await dialog.evaluate((e) => e.scrollWidth > e.clientWidth), false)
                assert.ok(
                    Math.abs((await positionInPage()) - before) <= 1,
                    "Opening a reason must not shift the row beyond its 1px hover effect"
                )
                await page.screenshot({ path: `${output}/open-${key}-${width}-${colorScheme}.png` })
                if (width >= 1024) {
                    await dialog.hover()
                    await page.waitForTimeout(250)
                    assert.ok(await dialog.isVisible(), "The reason stays open while reading it")
                    await page.mouse.move(0, 0)
                } else await page.keyboard.press("Escape")
                await dialog.waitFor({ state: "hidden" })
                if (width >= 1024) {
                    await trigger.focus()
                    await dialog.waitFor({ state: "visible" })
                    await page.keyboard.press("Escape")
                    await dialog.waitFor({ state: "hidden" })
                }
            }
            await longStatus.scrollIntoViewIfNeeded()
            await page.screenshot({ path: `${output}/long-status-${width}-${colorScheme}.png` })
            assert.deepEqual(writes, [], "Reading comments must not change the application")
            assert.deepEqual(errors, [])
            await context.close()
            console.log(
                `PASS ${width}px ${colorScheme}: reasons hidden, readable, no overflow, no navigation or mutations`
            )
        }
    }
} finally {
    await browser.close()
}
