import axiosInstance from '@core/api/axios';

/**
 * Admin content-management endpoints: FAQs, Experience Studio, Hero config,
 * Offers, Offer Sections, Coupons.
 * Per-domain split (P4.5).
 */
export const adminContentApi = {
    // FAQ Management
    getFAQs: (params) => axiosInstance.get('/admin/faqs', { params }),
    createFAQ: (data) => axiosInstance.post('/admin/faqs', data),
    updateFAQ: (id, data) => axiosInstance.put(`/admin/faqs/${id}`, data),
    deleteFAQ: (id) => axiosInstance.delete(`/admin/faqs/${id}`),
    // Public FAQs (for profile pages, etc.)
    getPublicFAQs: (params) => axiosInstance.get('/public/faqs', { params }),

    // Experience Studio / Content Manager
    getExperienceSections: (params) =>
        axiosInstance.get('/admin/experience', { params }),
    createExperienceSection: (data) =>
        axiosInstance.post('/admin/experience', data),
    updateExperienceSection: (id, data) =>
        axiosInstance.put(`/admin/experience/${id}`, data),
    deleteExperienceSection: (id) =>
        axiosInstance.delete(`/admin/experience/${id}`),
    reorderExperienceSections: (items) =>
        axiosInstance.put('/admin/experience/reorder', { items }),
    uploadExperienceBanner: (formData) =>
        axiosInstance.post('/admin/experience/upload-banner', formData),

    // Hero config (separate hero banners + categories per page)
    getHeroConfig: (params) =>
        axiosInstance.get('/admin/experience/hero', { params }),
    setHeroConfig: (data) =>
        axiosInstance.put('/admin/experience/hero', data),

    // Offers Management
    getOffers: (params) => axiosInstance.get('/admin-offers', { params }),
    createOffer: (data) => axiosInstance.post('/admin-offers', data),
    updateOffer: (id, data) => axiosInstance.put(`/admin-offers/${id}`, data),
    deleteOffer: (id) => axiosInstance.delete(`/admin-offers/${id}`),
    reorderOffers: (items) =>
        axiosInstance.put('/admin-offers/reorder', { items }),

    // Offer Sections (category → products, banner + side image)
    getOfferSections: (params) =>
        axiosInstance.get('/admin-offer-sections', { params }),
    createOfferSection: (data) =>
        axiosInstance.post('/admin-offer-sections', data),
    updateOfferSection: (id, data) =>
        axiosInstance.put(`/admin-offer-sections/${id}`, data),
    deleteOfferSection: (id) =>
        axiosInstance.delete(`/admin-offer-sections/${id}`),
    reorderOfferSections: (items) =>
        axiosInstance.put('/admin-offer-sections/reorder', { items }),

    // Gallery Management
    getGalleryStats: () => axiosInstance.get('/admin/gallery/stats'),
    getGalleries: (params) => axiosInstance.get('/admin/gallery', { params }),
    getGallery: (id) => axiosInstance.get(`/admin/gallery/${id}`),
    createGallery: (data) => axiosInstance.post('/admin/gallery', data),
    updateGallery: (id, data) => axiosInstance.put(`/admin/gallery/${id}`, data),
    updateGalleryStatus: (id, data) =>
        axiosInstance.patch(`/admin/gallery/${id}/status`, data),
    deleteGallery: (id) => axiosInstance.delete(`/admin/gallery/${id}`),
    reorderGalleries: (items) =>
        axiosInstance.put('/admin/gallery/reorder', { items }),
    uploadGalleryImages: (formData, onUploadProgress) =>
        axiosInstance.post('/admin/gallery/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        }),
    getGalleryCategories: () => axiosInstance.get('/admin/gallery/categories'),
    createGalleryCategory: (data) =>
        axiosInstance.post('/admin/gallery/categories', data),
    updateGalleryCategory: (id, data) =>
        axiosInstance.put(`/admin/gallery/categories/${id}`, data),
    deleteGalleryCategory: (id, reassignTo) =>
        axiosInstance.delete(`/admin/gallery/categories/${id}`, {
            params: reassignTo ? { reassignTo } : undefined,
        }),
    reorderGalleryCategories: (items) =>
        axiosInstance.put('/admin/gallery/categories/reorder', { items }),
    getGallerySettings: () => axiosInstance.get('/admin/gallery/settings'),
    updateGallerySettings: (data) =>
        axiosInstance.put('/admin/gallery/settings', data),

    // Coupons & Promos
    getCoupons: (params) => axiosInstance.get('/admin/coupons', { params }),
    createCoupon: (data) => axiosInstance.post('/admin/coupons', data),
    updateCoupon: (id, data) => axiosInstance.put(`/admin/coupons/${id}`, data),
    deleteCoupon: (id) => axiosInstance.delete(`/admin/coupons/${id}`),
};

export default adminContentApi;
