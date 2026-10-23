import * as customerSegmentationService from "../../services/customerSegmentationService.js";

export const getSegmentsOverview = async (req, res) => {
  try {
    const summary = await customerSegmentationService.getSegmentSummary();
    return res.status(200).json({
      success: true,
      error: false,
      result: summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to load customer segments",
    });
  }
};

export const getSegmentCustomerList = async (req, res) => {
  try {
    const { key } = req.params;
    const { page, limit, search } = req.query;
    const result = await customerSegmentationService.getSegmentCustomers({
      segmentKey: key,
      page,
      limit,
      search,
    });
    return res.status(200).json({
      success: true,
      error: false,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to load segment customers",
    });
  }
};
