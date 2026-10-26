import axiosInstance from '@core/api/axios';

/**
 * Admin order and return endpoints.
 * Per-domain split (P4.5).
 */
export const adminOrdersApi = {
    getOrders: (params) =>
        axiosInstance.get('/orders/seller-orders', { params }),
    getOrderDetails: (orderId) =>
        axiosInstance.get(`/orders/details/${orderId}`),
    updateOrderStatus: (orderId, data) =>
        axiosInstance.put(`/orders/status/${orderId}`, data),

    getReturns: (params) =>
        axiosInstance.get('/orders/seller-returns', { params }),
    getReturnDetails: (orderId) =>
        axiosInstance.get(`/orders/${orderId}/returns`),
    approveReturn: (orderId, data) =>
        axiosInstance.put(`/orders/returns/${orderId}/approve`, data),
    rejectReturn: (orderId, data) =>
        axiosInstance.put(`/orders/returns/${orderId}/reject`, data),
    assignReturnDelivery: (orderId, data) =>
        axiosInstance.put(`/orders/returns/${orderId}/assign-delivery`, data),
    updateReturnQc: (orderId, data) =>
        axiosInstance.put(`/orders/returns/${orderId}/qc`, data),

    // Partial Fulfillment & Item Refunds (ORD-005)
    getOrderItemRefundPreview: (orderId, itemIndex) =>
        axiosInstance.get(`/orders/${orderId}/items/${itemIndex}/refund-preview`),
    markOrderItemUnavailable: (orderId, itemIndex, data) =>
        axiosInstance.post(`/orders/${orderId}/items/${itemIndex}/unavailable`, data),
    retryOrderItemRefund: (orderId, itemIndex) =>
        axiosInstance.post(`/orders/${orderId}/items/${itemIndex}/retry-refund`),
};

export default adminOrdersApi;
