import { useEffect } from 'react';
import { useSettings } from '@core/context/SettingsContext';

/**
 * CategorySeo component
 * Dynamically updates document title, meta description, OpenGraph tags,
 * and canonical link for Category pages.
 * Gracefully falls back to category name and description when SEO fields are empty.
 */
export default function CategorySeo({ category }) {
    const { settings } = useSettings();

    useEffect(() => {
        if (!category) return;

        const appName = settings?.appName || 'Meatyns';
        const categoryName = category.name || 'Categories';
        const rawTitle = category.metaTitle?.trim() || `${categoryName} - Fresh Meat Online | ${appName}`;
        const prevTitle = document.title;
        document.title = rawTitle;

        // Meta Description fallback
        const cleanDesc = (category.metaDescription?.trim())
            || (category.description ? category.description.replace(/<[^>]*>?/gm, '').trim().slice(0, 160) : '')
            || `Buy fresh ${categoryName.toLowerCase()} online at ${appName}. 100% fresh, hygienic cuts delivered in minutes.`;

        // Helper to update or create meta tags
        const setMetaTag = (attributeName, attributeValue, content) => {
            if (!content) return;
            let el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attributeName, attributeValue);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        // Standard SEO tags
        setMetaTag('name', 'description', cleanDesc);

        // OpenGraph tags
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const canonicalUrl = category.canonicalUrl?.trim() || `${origin}/category/${category.slug || category._id || category.id}`;
        const ogImage = category.ogImage?.trim() || category.image || '';

        setMetaTag('property', 'og:title', rawTitle);
        setMetaTag('property', 'og:description', cleanDesc);
        setMetaTag('property', 'og:type', 'website');
        setMetaTag('property', 'og:url', canonicalUrl);
        if (ogImage) setMetaTag('property', 'og:image', ogImage);

        // Canonical link
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        let createdCanonical = false;
        if (!linkCanonical) {
            linkCanonical = document.createElement('link');
            linkCanonical.setAttribute('rel', 'canonical');
            document.head.appendChild(linkCanonical);
            createdCanonical = true;
        }
        linkCanonical.setAttribute('href', canonicalUrl);

        // Cleanup on unmount
        return () => {
            const defaultTitle = settings?.metaTitle || settings?.appName || prevTitle;
            document.title = defaultTitle;
            if (createdCanonical && linkCanonical && linkCanonical.parentNode) {
                linkCanonical.parentNode.removeChild(linkCanonical);
            }
            const defaultDesc = settings?.metaDescription || '';
            const descEl = document.querySelector('meta[name="description"]');
            if (descEl) descEl.setAttribute('content', defaultDesc);
        };
    }, [category, settings]);

    return null;
}
