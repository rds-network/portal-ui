import { useMediaQuery } from "@mantine/hooks"

export const useDesktop = () => {
    const isDesktop = useMediaQuery("(min-width: 64.0625em)", true, {
        getInitialValueInEffect: false,
    })

    return isDesktop === undefined ? true : isDesktop
}

export const useScreenSize = () => {
    const isMobile = useMediaQuery("(max-width: 767px)", false, {
        getInitialValueInEffect: false,
    })
    const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)", false, {
        getInitialValueInEffect: false,
    })
    const isDesktop = useMediaQuery("(min-width: 1024px)", false, {
        getInitialValueInEffect: false,
    })
    const isLargeDesktop = useMediaQuery("(min-width: 1440px)", false, {
        getInitialValueInEffect: false,
    })

    return {
        isMobile: isMobile ?? false,
        isTablet: isTablet ?? false,
        isDesktop: isDesktop ?? true,
        isLargeDesktop: isLargeDesktop ?? true,
        // Для таблицы используем десктопный режим только от 1024px
        shouldShowTable: isDesktop ?? true,
    }
}
