import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import {
  getDeliveryZonesController,
  getDeliveryZoneDetailController,
  createDeliveryZoneController,
  updateDeliveryZoneController,
  toggleDeliveryZoneStatusController,
  deleteDeliveryZoneController,
  checkLocationZoneController,
} from "../controller/deliveryZoneController.js";

const router = express.Router();

// Public check endpoint
router.post("/check", checkLocationZoneController);
router.get("/check", checkLocationZoneController);

// Admin-only zone management
router.get("/", verifyToken, allowRoles("admin"), getDeliveryZonesController);
router.post("/", verifyToken, allowRoles("admin"), createDeliveryZoneController);
router.get("/:id", verifyToken, allowRoles("admin"), getDeliveryZoneDetailController);
router.put("/:id", verifyToken, allowRoles("admin"), updateDeliveryZoneController);
router.patch("/:id/status", verifyToken, allowRoles("admin"), toggleDeliveryZoneStatusController);
router.delete("/:id", verifyToken, allowRoles("admin"), deleteDeliveryZoneController);

export default router;
