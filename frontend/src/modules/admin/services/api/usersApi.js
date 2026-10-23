import axiosInstance from '@core/api/axios';

/**
 * Admin user, seller, and reports endpoints.
 * Per-domain split (P4.5).
 */
export const adminUsersApi = {
    getStats: () => axiosInstance.get('/admin/stats'),
    getReports: () => axiosInstance.get('/admin/reports'),

    getUsers: (params) => axiosInstance.get('/admin/users', { params }),
    getUserById: (id) => axiosInstance.get(`/admin/users/${id}`),
    getCustomerNotes: (id) => axiosInstance.get(`/admin/users/${id}/notes`),
    addCustomerNote: (id, data) => axiosInstance.post(`/admin/users/${id}/notes`, data),

    getUserWallet: (id) => axiosInstance.get(`/admin/users/${id}/wallet`),
    getUserWalletHistory: (id, params) => axiosInstance.get(`/admin/users/${id}/wallet/history`, { params }),
    addWalletCoins: (data) => axiosInstance.post('/admin/wallet/add-coins', data),
    removeWalletCoins: (data) => axiosInstance.post('/admin/wallet/remove-coins', data),

    getSellers: (params) => axiosInstance.get('/admin/sellers', { params }),
    getActiveSellers: (params) =>
        axiosInstance.get('/admin/sellers/active', { params }),
    getSellerLocations: (params) =>
        axiosInstance.get('/admin/sellers/locations', { params }),
    getPendingSellers: (params) =>
        axiosInstance.get('/admin/sellers/pending', { params }),
    approveSeller: (id) => axiosInstance.patch(`/admin/sellers/approve/${id}`),
    rejectSeller: (id, data) =>
        axiosInstance.delete(`/admin/sellers/reject/${id}`, { data }),

    // Customer Segments & Abandoned Carts
    getCustomerSegments: () => axiosInstance.get('/admin/segments'),
    getSegmentCustomers: (key, params) => axiosInstance.get(`/admin/segments/${key}/customers`, { params }),
    getAbandonedCarts: (params) => axiosInstance.get('/admin/abandoned-carts', { params }),

    // Staff & RBAC endpoints
    getStaff: () => axiosInstance.get('/admin/staff'),
    createStaff: (data) => axiosInstance.post('/admin/staff', data),
    updateStaffRole: (id, data) => axiosInstance.patch(`/admin/staff/${id}/role`, data),
    toggleStaffStatus: (id, data) => axiosInstance.patch(`/admin/staff/${id}/status`, data),
};

export default adminUsersApi;
