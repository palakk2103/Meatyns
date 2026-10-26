import axiosInstance from "@core/api/axios";

export const adminRetentionApi = {
  // Subscriptions
  getAllSubscriptions: (params) =>
    axiosInstance.get("/subscriptions/admin/all", { params }),
  triggerSubscriptionBatch: () =>
    axiosInstance.post("/subscriptions/admin/run-due-batch"),

  // Referrals
  getAllReferrals: (params) =>
    axiosInstance.get("/referrals/admin/all", { params }),
  getReferralStats: () =>
    axiosInstance.get("/referrals/admin/stats"),

  // Recipes
  getAllRecipes: (params) =>
    axiosInstance.get("/recipes/admin/all", { params }),
  createRecipe: (data) =>
    axiosInstance.post("/recipes/admin/create", data),
  updateRecipe: (id, data) =>
    axiosInstance.put(`/recipes/admin/${id}`, data),
  deleteRecipe: (id) =>
    axiosInstance.delete(`/recipes/admin/${id}`),

  // Combos
  getAllCombos: (params) =>
    axiosInstance.get("/combos/admin/all", { params }),
  createCombo: (data) =>
    axiosInstance.post("/combos/admin/create", data),
  updateCombo: (id, data) =>
    axiosInstance.put(`/combos/admin/${id}`, data),
  deleteCombo: (id) =>
    axiosInstance.delete(`/combos/admin/${id}`),
};

export default adminRetentionApi;
