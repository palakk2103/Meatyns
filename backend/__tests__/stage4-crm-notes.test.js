import { describe, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import User from "../app/models/customer.js";
import {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../app/constants/rbac.js";

describe("Stage 4 — Persistent Customer CRM Notes", () => {
  describe("Schema Definition & Privacy Protection", () => {
    it("has crmNotes configured in User schema", () => {
      const crmNotesPath = User.schema.path("crmNotes");
      expect(crmNotesPath).toBeDefined();
    });

    it("enforces select: false on crmNotes so customer profile queries do not leak staff notes", () => {
      const crmNotesPath = User.schema.path("crmNotes");
      // Mongoose schema option select should be false
      expect(crmNotesPath.options.select).toBe(false);
    });

    it("verifies note subdocument schema structure", () => {
      const user = new User({
        name: "Test Customer",
        phone: "9876543210",
        crmNotes: [
          {
            note: "Customer prefers delivery after 2 PM. Ring bell twice.",
            authorName: "Operations Lead",
            authorRole: "order_manager",
          },
        ],
      });

      expect(user.crmNotes).toHaveLength(1);
      const note = user.crmNotes[0];
      expect(note.note).toBe("Customer prefers delivery after 2 PM. Ring bell twice.");
      expect(note.authorName).toBe("Operations Lead");
      expect(note.authorRole).toBe("order_manager");
      expect(note.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("Validation & Content Constraints", () => {
    it("validates reasonable character length limit (max 2000 chars)", () => {
      const validNote = "A".repeat(2000);
      const user = new User({
        phone: "9876543211",
        crmNotes: [{ note: validNote }],
      });
      const err = user.validateSync();
      // Should not have validation error on crmNotes
      expect(err?.errors?.["crmNotes.0.note"]).toBeUndefined();
    });

    it("rejects notes exceeding 2000 characters", () => {
      const invalidNote = "A".repeat(2001);
      const user = new User({
        phone: "9876543212",
        crmNotes: [{ note: invalidNote }],
      });
      const err = user.validateSync();
      expect(err?.errors?.["crmNotes.0.note"]).toBeDefined();
    });

    it("rejects empty note content", () => {
      const user = new User({
        phone: "9876543213",
        crmNotes: [{ note: "" }],
      });
      const err = user.validateSync();
      expect(err?.errors?.["crmNotes.0.note"]).toBeDefined();
    });

    it("trims whitespace from note content", () => {
      const user = new User({
        phone: "9876543214",
        crmNotes: [{ note: "   Customer requested door delivery.   " }],
      });
      expect(user.crmNotes[0].note).toBe("Customer requested door delivery.");
    });
  });

  describe("Authorization & Permission Matrix", () => {
    it("permits Super Admin to manage CRM notes", () => {
      expect(
        hasAdminPermission(ADMIN_ROLES.SUPER_ADMIN, ADMIN_PERMISSIONS.CRM_NOTES_MANAGE),
      ).toBe(true);
    });

    it("permits Order Manager to manage CRM notes", () => {
      expect(
        hasAdminPermission(ADMIN_ROLES.ORDER_MANAGER, ADMIN_PERMISSIONS.CRM_NOTES_MANAGE),
      ).toBe(true);
    });

    it("denies Inventory Manager from managing CRM notes", () => {
      expect(
        hasAdminPermission(ADMIN_ROLES.INVENTORY_MANAGER, ADMIN_PERMISSIONS.CRM_NOTES_MANAGE),
      ).toBe(false);
    });

    it("denies Delivery Manager from managing CRM notes", () => {
      expect(
        hasAdminPermission(ADMIN_ROLES.DELIVERY_MANAGER, ADMIN_PERMISSIONS.CRM_NOTES_MANAGE),
      ).toBe(false);
    });
  });
});
