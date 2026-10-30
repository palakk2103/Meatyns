import axiosInstance from "@core/api/axios";

export const metaAdminApi = {
  // Status and Connection
  getStatus: () => axiosInstance.get("/admin/meta/status"),
  getOAuthUrl: () => axiosInstance.get("/admin/meta/oauth/url"),
  selectAccount: (data) => axiosInstance.post("/admin/meta/select-account", data),
  disconnect: () => axiosInstance.post("/admin/meta/disconnect"),
  connectDemo: () => axiosInstance.post("/admin/meta/connect-demo"),

  // Campaigns
  getCampaigns: () => axiosInstance.get("/admin/meta/campaigns"),
  createCampaignDraft: (data) => axiosInstance.post("/admin/meta/campaigns", data),
  updateCampaignStatus: (id, data) => axiosInstance.patch(`/admin/meta/campaigns/${id}/status`, data),

  // Analytics
  getAnalytics: (params) => axiosInstance.get("/admin/meta/analytics", { params }),

  // Tracking Events
  getConversionEvents: (params) => axiosInstance.get("/admin/meta/events", { params }),
  retryConversionEvent: (id) => axiosInstance.post(`/admin/meta/events/${id}/retry`),

  // Settings
  updateSettings: (data) => axiosInstance.put("/admin/meta/settings", data),
};
