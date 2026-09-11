import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-redesign"
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined })
try {
    for (const width of [1440, 768, 390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" })
        const page = await context.newPage(),
            errors = []
        page.on("pageerror", (e) => errors.push(e.message))
        await page.route(`${base}/api/**`, (route) =>
            route.fulfill(
                new URL(route.request().url()).pathname === "/api/user/account"
                    ? { status: 401, json: {} }
                    : { json: [] }
            )
        )
        for (const path of ["/", "/application", "/application/form", "/unauthorized"]) {
            await page.goto(base + path)
            await page.waitForLoadState("networkidle")
            await page.screenshot({ path: `${output}/public-${path.replaceAll("/", "-") || "home"}-${width}.png` })
            assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                `Overflow ${width} ${path}`
            )
        }
        await page.goto(base + "/")
        await page.waitForLoadState("networkidle")
        for (const [label, locale] of [
            ["English language", "en"],
            ["Serbian language", "sr"],
        ]) {
            await page.getByRole("button", { name: label }).click()
            await page.waitForLoadState("networkidle")
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("locale"))), locale)
        }
        assert.deepEqual(errors, [])
        console.log(`PASS public ${width}px: welcome, terms, application, error pages, languages, reduced motion`)
        await context.close()
    }
} finally {
    await browser.close()
}
