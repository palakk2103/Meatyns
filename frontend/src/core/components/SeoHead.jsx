import { useEffect, useRef } from 'react';
import { useSettings } from '@core/context/SettingsContext';

/**
 * Updates document title, favicon, and meta description/keywords from global settings.
 * Must be rendered inside SettingsProvider.
 */
export default function SeoHead() {
    const { settings } = useSettings();
    const metaRefs = useRef({ description: null, keywords: null, favicon: null });

    useEffect(() => {
        if (!settings) return;

        const title = settings.metaTitle || settings.appName || 'App';
        document.title = title;

        const desc = settings.metaDescription || '';
        const keywordsContent = (Array.isArray(settings.keywords) && settings.keywords.length)
            ? settings.keywords.join(', ')
            : (settings.metaKeywords || '');

        // Update or create meta description
        let metaDesc = metaRefs.current.description;
        if (!metaDesc) {
            metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                document.head.appendChild(metaDesc);
            }
            metaRefs.current.description = metaDesc;
        }
        metaDesc.setAttribute('content', desc);

        // Update or create meta keywords
        let metaKw = metaRefs.current.keywords;
        if (!metaKw) {
            metaKw = document.querySelector('meta[name="keywords"]');
            if (!metaKw) {
                metaKw = document.createElement('meta');
                metaKw.setAttribute('name', 'keywords');
                document.head.appendChild(metaKw);
            }
            metaRefs.current.keywords = metaKw;
        }
        metaKw.setAttribute('content', keywordsContent);

        // Update or create dynamic favicon
        const faviconUrl = settings.faviconUrl || '';
        let linkFavicon = metaRefs.current.favicon;
        if (!linkFavicon) {
            linkFavicon = document.getElementById('dynamic-favicon');
            if (!linkFavicon && faviconUrl) {
                linkFavicon = document.createElement('link');
                linkFavicon.id = 'dynamic-favicon';
                linkFavicon.rel = 'icon';
                linkFavicon.type = 'image/x-icon';
                document.head.appendChild(linkFavicon);
                metaRefs.current.favicon = linkFavicon;
            } else if (linkFavicon) {
                metaRefs.current.favicon = linkFavicon;
            }
        }
        if (linkFavicon) {
            linkFavicon.href = faviconUrl || '/anitalogo.jpg';
        }

        // Maintain theme-color for mobile status bar (defaults to Meatyns yellow)
        const themeColor = settings.primaryColor || '#FDCE04';
        let metaTheme = metaRefs.current.themeColor;
        if (!metaTheme) {
            metaTheme = document.querySelector('meta[name="theme-color"]');
            if (!metaTheme) {
                metaTheme = document.createElement('meta');
                metaTheme.setAttribute('name', 'theme-color');
                document.head.appendChild(metaTheme);
            }
            metaRefs.current.themeColor = metaTheme;
        }
        metaTheme.setAttribute('content', themeColor);

        // Enforce color-scheme meta tag is strictly only light
        let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
        if (!metaColorScheme) {
            metaColorScheme = document.createElement('meta');
            metaColorScheme.setAttribute('name', 'color-scheme');
            metaColorScheme.setAttribute('content', 'only light');
            document.head.appendChild(metaColorScheme);
        } else {
            metaColorScheme.setAttribute('content', 'only light');
        }
    }, [settings]);

    return null;
}
