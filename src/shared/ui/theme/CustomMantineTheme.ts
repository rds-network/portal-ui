import {
    Button,
    createTheme,
    DEFAULT_THEME,
    defaultVariantColorsResolver,
    getContrastColor,
    getPrimaryShade,
    Input,
    MantineColor,
    Modal,
    Paper,
    parseThemeColor,
} from "@mantine/core"

export const theme = createTheme({
    fontFamily: "Geologica, sans-serif",
    luminanceThreshold: 0.3,
    autoContrast: true,
    focusRing: "auto",
    defaultRadius: "md",
    primaryColor: "ocean",
    defaultGradient: { from: "#147f79", to: "#2d6cc4", deg: 110 },
    primaryShade: { light: 7, dark: 4 },
    variantColorResolver: (input) => {
        const colors = defaultVariantColorsResolver(input)
        if (input.variant !== "filled" || !(input.autoContrast ?? input.theme.autoContrast)) return colors
        const parsed = parseThemeColor({ color: input.color || input.theme.primaryColor, theme: input.theme })
        if (!parsed.isThemeColor || parsed.shade !== undefined) return colors
        const contrast = (scheme: "light" | "dark") =>
            getContrastColor({
                color: `${parsed.color}.${getPrimaryShade(input.theme, scheme)}`,
                theme: input.theme,
                autoContrast: true,
            })
        return { ...colors, color: `light-dark(${contrast("light")}, ${contrast("dark")})` }
    },
    colors: {
        ocean: [
            "#edf8fb",
            "#d7edf6",
            "#acd9ea",
            "#7dc3dc",
            "#51abc9",
            "#3093b4",
            "#21829f",
            "#176e91",
            "#195a78",
            "#194b63",
        ],
        dark: [
            "#e5edf6",
            "#bdcddd",
            "#98aec6",
            "#6d8ca8",
            "#456581",
            "#334f6b",
            "#263f58",
            "#1c3047",
            "#16273a",
            "#101d2c",
        ],
    },
    radius: { xs: "6px", sm: "10px", md: "12px", lg: "18px", xl: "26px" },
    headings: { fontFamily: "Geologica, sans-serif", fontWeight: "650" },
    components: {
        Button: Button.extend({ defaultProps: { radius: "md" } }),
        Input: Input.extend({ defaultProps: { size: "md" } }),
        Paper: Paper.extend({ defaultProps: { radius: "lg" } }),
        Modal: Modal.extend({ defaultProps: { radius: "xl", overlayProps: { backgroundOpacity: 0.35, blur: 5 } } }),
    },
})

export const getMantineColor = (input: string | undefined | null): MantineColor => {
    if (!input) {
        return "dark"
    }
    // Generate a numeric hash from the string
    const hash = input.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)

    // Get all color keys from MantineThemeColors
    const colorKeys = Object.keys(DEFAULT_THEME.colors) as MantineColor[]

    // Map the hash to a color key
    const colorIndex = hash % colorKeys.length

    return colorKeys[colorIndex]
}
