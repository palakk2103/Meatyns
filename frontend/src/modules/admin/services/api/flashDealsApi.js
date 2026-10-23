import axiosInstance from "@core/api/axios";

export const flashDealsApi = {
  getFlashDeals: (params) =>
    axiosInstance.get("/admin/flash-deals", { params }),
  createFlashDeal: (data) =>
    axiosInstance.post("/admin/flash-deals", data),
  updateFlashDeal: (id, data) =>
    axiosInstance.put(`/admin/flash-deals/${id}`, data),
  toggleFlashDealStatus: (id, status) =>
    axiosInstance.patch(`/admin/flash-deals/${id}/status`, { status }),
};
