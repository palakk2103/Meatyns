import axiosInstance from '@core/api/axios';

/**
 * Admin delivery-partner endpoints (lifecycle, active fleet).
 * Per-domain split (P4.5).
 */
export const adminDeliveryApi = {
    getDeliveryPartners: (params) =>
        axiosInstance.get('/admin/delivery-partners', { params }),
    approveDeliveryPartner: (id) =>
        axiosInstance.patch(`/admin/delivery-partners/approve/${id}`),
    rejectDeliveryPartner: (id) =>
        axiosInstance.delete(`/admin/delivery-partners/reject/${id}`),
    getActiveFleet: (params) =>
        axiosInstance.get('/admin/active-fleet', { params }),

    // Delivery Zones (Sprint 3B / DEL-001)
    getDeliveryZones: (params) =>
        axiosInstance.get('/admin/delivery-zones', { params }),
    getDeliveryZone: (id) =>
        axiosInstance.get(`/admin/delivery-zones/${id}`),
    createDeliveryZone: (data) =>
        axiosInstance.post('/admin/delivery-zones', data),
    updateDeliveryZone: (id, data) =>
        axiosInstance.put(`/admin/delivery-zones/${id}`, data),
    toggleDeliveryZoneStatus: (id, isActive) =>
        axiosInstance.patch(`/admin/delivery-zones/${id}/status`, { isActive }),
    deleteDeliveryZone: (id) =>
        axiosInstance.delete(`/admin/delivery-zones/${id}`),
};

export default adminDeliveryApi;
