import { useEffect } from 'react';
import { useSettings } from '@core/context/SettingsContext';

/**
 * ProductSeo component
 * Dynamically manages document title, meta description, OpenGraph tags,
 * canonical link, and Schema.org Product JSON-LD structured data.
 * Safe fallback to product name/description if SEO fields are not configured.
 */
export default function ProductSeo({ product, reviews = [] }) {
    const { settings } = useSettings();

    useEffect(() => {
        if (!product) return;

        const appName = settings?.appName || 'Meatyns';
        const rawTitle = product.metaTitle?.trim() || `${product.name} | ${appName}`;
        const prevTitle = document.title;
        document.title = rawTitle;

        // Meta Description fallback
        const cleanDesc = (product.metaDescription?.trim())
            || (product.description ? product.description.replace(/<[^>]*>?/gm, '').trim().slice(0, 160) : '')
            || `Buy ${product.name} online with quick doorstep delivery at ${appName}.`;

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
        const canonicalUrl = `${origin}/product/${product.slug || product._id || product.id}`;
        const mainImg = product.mainImage || (Array.isArray(product.images) && product.images[0]) || '';

        setMetaTag('property', 'og:title', rawTitle);
        setMetaTag('property', 'og:description', cleanDesc);
        setMetaTag('property', 'og:type', 'product');
        setMetaTag('property', 'og:url', canonicalUrl);
        if (mainImg) setMetaTag('property', 'og:image', mainImg);

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

        // Product JSON-LD Structured Data
        let jsonLdScript = document.getElementById('product-schema-jsonld');
        if (!jsonLdScript) {
            jsonLdScript = document.createElement('script');
            jsonLdScript.id = 'product-schema-jsonld';
            jsonLdScript.type = 'application/ld+json';
            document.head.appendChild(jsonLdScript);
        }

        const schemaData = {
            '@context': 'https://schema.org/',
            '@type': 'Product',
            name: product.name,
            description: cleanDesc,
            image: [product.mainImage, ...(product.galleryImages || []), ...(product.images || [])].filter(Boolean),
            sku: product.sku || undefined,
            brand: product.brand ? {
                '@type': 'Brand',
                name: product.brand
            } : undefined,
            offers: {
                '@type': 'Offer',
                url: canonicalUrl,
                priceCurrency: 'INR',
                price: Number(product.salePrice || product.price || 0),
                availability: product.stock > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition'
            }
        };

        // Add real rating data only if genuine customer reviews exist
        if (Array.isArray(reviews) && reviews.length > 0) {
            const validRatings = reviews.map(r => Number(r.rating)).filter(n => !isNaN(n) && n > 0);
            if (validRatings.length > 0) {
                const avgRating = (validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length).toFixed(1);
                schemaData.aggregateRating = {
                    '@type': 'AggregateRating',
                    ratingValue: avgRating,
                    reviewCount: validRatings.length
                };
            }
        }

        jsonLdScript.textContent = JSON.stringify(schemaData, null, 2);

        // Cleanup on unmount
        return () => {
            const defaultTitle = settings?.metaTitle || settings?.appName || prevTitle;
            document.title = defaultTitle;
            if (jsonLdScript && jsonLdScript.parentNode) {
                jsonLdScript.parentNode.removeChild(jsonLdScript);
            }
            if (createdCanonical && linkCanonical && linkCanonical.parentNode) {
                linkCanonical.parentNode.removeChild(linkCanonical);
            }
            const defaultDesc = settings?.metaDescription || '';
            const descEl = document.querySelector('meta[name="description"]');
            if (descEl) descEl.setAttribute('content', defaultDesc);
        };
    }, [product, reviews, settings]);

    return null;
}
