import Setting from "../../models/setting.js";
import {
  DELIVERY_PRICING_MODE,
  HANDLING_FEE_STRATEGY,
} from "../../constants/finance.js";
import { roundCurrency } from "../../utils/money.js";

export const DEFAULT_DELIVERY_CONFIG = Object.freeze({
  express: {
    enabled: true,
    surcharge: 40,
    estimatedMinMinutes: 15,
    estimatedMaxMinutes: 30,
    operatingHoursOnly: true,
  },
  normal: {
    enabled: true,
    deliveryFee: null,
    estimatedLabel: "1–2 hours",
    minMinutes: 60,
    maxMinutes: 120,
  },
  advance: {
    enabled: true,
    deliveryFee: null,
    maxAdvanceDays: 7,
    slotDurationMinutes: 60,
    maxOrdersPerSlot: 10,
    minAdvanceMinutes: 60,
    openTime: "09:00",
    closeTime: "21:00",
    operatingDays: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
  },
  slotOverrides: [],
});

const DEFAULT_FINANCE_SETTINGS = {
  deliveryPricingMode: DELIVERY_PRICING_MODE.DISTANCE_BASED,
  customerBaseDeliveryFee: 30,
  riderBasePayout: 30,
  baseDistanceCapacityKm: 0.5,
  incrementalKmSurcharge: 10,
  deliveryPartnerRatePerKm: 5,
  fixedDeliveryFee: 30,
  freeDeliveryThreshold: 499,
  minimumOrderValue: 0,
  handlingFeeStrategy: HANDLING_FEE_STRATEGY.HIGHEST_CATEGORY_FEE,
  codEnabled: true,
  onlineEnabled: true,
  deliveryConfig: DEFAULT_DELIVERY_CONFIG,
};

export function normalizeFinanceSettings(raw = {}) {
  const deliveryPricingMode =
    raw.deliveryPricingMode ||
    raw.pricingMode ||
    DEFAULT_FINANCE_SETTINGS.deliveryPricingMode;

  const customerBaseDeliveryFee = roundCurrency(
    raw.customerBaseDeliveryFee ?? raw.baseDeliveryCharge ?? DEFAULT_FINANCE_SETTINGS.customerBaseDeliveryFee,
  );

  const riderBasePayout = roundCurrency(
    raw.riderBasePayout ?? raw.baseDeliveryCharge ?? DEFAULT_FINANCE_SETTINGS.riderBasePayout,
  );

  const deliveryPartnerRatePerKm = roundCurrency(
    raw.deliveryPartnerRatePerKm ??
      raw.fleetCommissionRatePerKm ??
      DEFAULT_FINANCE_SETTINGS.deliveryPartnerRatePerKm,
  );

  const baseDistanceCapacityKm = Number(
    raw.baseDistanceCapacityKm ?? DEFAULT_FINANCE_SETTINGS.baseDistanceCapacityKm,
  );

  const incrementalKmSurcharge = roundCurrency(
    raw.incrementalKmSurcharge ?? DEFAULT_FINANCE_SETTINGS.incrementalKmSurcharge,
  );

  const fixedDeliveryFee = roundCurrency(
    raw.fixedDeliveryFee ?? raw.baseDeliveryCharge ?? customerBaseDeliveryFee,
  );

  const freeDeliveryThreshold = roundCurrency(
    raw.freeDeliveryThreshold ?? DEFAULT_FINANCE_SETTINGS.freeDeliveryThreshold,
  );

  const minimumOrderValue = roundCurrency(
    raw.minimumOrderValue ?? DEFAULT_FINANCE_SETTINGS.minimumOrderValue,
  );

  const handlingFeeStrategy =
    raw.handlingFeeStrategy || DEFAULT_FINANCE_SETTINGS.handlingFeeStrategy;

  const rawDeliveryConfig = raw.deliveryConfig || {};
  const rawExpress = rawDeliveryConfig.express || {};
  const rawNormal = rawDeliveryConfig.normal || {};
  const rawAdvance = rawDeliveryConfig.advance || {};

  const deliveryConfig = {
    express: {
      enabled: rawExpress.enabled !== undefined ? Boolean(rawExpress.enabled) : DEFAULT_DELIVERY_CONFIG.express.enabled,
      surcharge: roundCurrency(rawExpress.surcharge ?? DEFAULT_DELIVERY_CONFIG.express.surcharge),
      estimatedMinMinutes: Number.isFinite(Number(rawExpress.estimatedMinMinutes))
        ? Math.max(1, Number(rawExpress.estimatedMinMinutes))
        : DEFAULT_DELIVERY_CONFIG.express.estimatedMinMinutes,
      estimatedMaxMinutes: Number.isFinite(Number(rawExpress.estimatedMaxMinutes))
        ? Math.max(1, Number(rawExpress.estimatedMaxMinutes))
        : DEFAULT_DELIVERY_CONFIG.express.estimatedMaxMinutes,
      operatingHoursOnly: rawExpress.operatingHoursOnly !== undefined
        ? Boolean(rawExpress.operatingHoursOnly)
        : DEFAULT_DELIVERY_CONFIG.express.operatingHoursOnly,
    },
    normal: {
      enabled: rawNormal.enabled !== undefined ? Boolean(rawNormal.enabled) : DEFAULT_DELIVERY_CONFIG.normal.enabled,
      deliveryFee: rawNormal.deliveryFee != null && Number.isFinite(Number(rawNormal.deliveryFee))
        ? roundCurrency(Number(rawNormal.deliveryFee))
        : null,
      estimatedLabel: String(rawNormal.estimatedLabel || DEFAULT_DELIVERY_CONFIG.normal.estimatedLabel),
      minMinutes: Number.isFinite(Number(rawNormal.minMinutes))
        ? Math.max(1, Number(rawNormal.minMinutes))
        : DEFAULT_DELIVERY_CONFIG.normal.minMinutes,
      maxMinutes: Number.isFinite(Number(rawNormal.maxMinutes))
        ? Math.max(1, Number(rawNormal.maxMinutes))
        : DEFAULT_DELIVERY_CONFIG.normal.maxMinutes,
    },
    advance: {
      enabled: rawAdvance.enabled !== undefined ? Boolean(rawAdvance.enabled) : DEFAULT_DELIVERY_CONFIG.advance.enabled,
      deliveryFee: rawAdvance.deliveryFee != null && Number.isFinite(Number(rawAdvance.deliveryFee))
        ? roundCurrency(Number(rawAdvance.deliveryFee))
        : null,
      maxAdvanceDays: Number.isFinite(Number(rawAdvance.maxAdvanceDays))
        ? Math.min(30, Math.max(1, Number(rawAdvance.maxAdvanceDays)))
        : DEFAULT_DELIVERY_CONFIG.advance.maxAdvanceDays,
      slotDurationMinutes: Number.isFinite(Number(rawAdvance.slotDurationMinutes))
        ? Math.min(240, Math.max(15, Number(rawAdvance.slotDurationMinutes)))
        : DEFAULT_DELIVERY_CONFIG.advance.slotDurationMinutes,
      maxOrdersPerSlot: Number.isFinite(Number(rawAdvance.maxOrdersPerSlot))
        ? Math.max(1, Number(rawAdvance.maxOrdersPerSlot))
        : DEFAULT_DELIVERY_CONFIG.advance.maxOrdersPerSlot,
      minAdvanceMinutes: Number.isFinite(Number(rawAdvance.minAdvanceMinutes))
        ? Math.max(0, Number(rawAdvance.minAdvanceMinutes))
        : DEFAULT_DELIVERY_CONFIG.advance.minAdvanceMinutes,
      openTime: String(rawAdvance.openTime || DEFAULT_DELIVERY_CONFIG.advance.openTime),
      closeTime: String(rawAdvance.closeTime || DEFAULT_DELIVERY_CONFIG.advance.closeTime),
      operatingDays: Array.isArray(rawAdvance.operatingDays) && rawAdvance.operatingDays.length > 0
        ? rawAdvance.operatingDays
        : DEFAULT_DELIVERY_CONFIG.advance.operatingDays,
    },
    slotOverrides: Array.isArray(rawDeliveryConfig.slotOverrides)
      ? rawDeliveryConfig.slotOverrides
      : [],
  };

  return {
    deliveryPricingMode,
    pricingMode: deliveryPricingMode,
    customerBaseDeliveryFee,
    riderBasePayout,
    baseDeliveryCharge: customerBaseDeliveryFee,
    baseDistanceCapacityKm: Number.isFinite(baseDistanceCapacityKm)
      ? Math.max(baseDistanceCapacityKm, 0)
      : DEFAULT_FINANCE_SETTINGS.baseDistanceCapacityKm,
    incrementalKmSurcharge,
    deliveryPartnerRatePerKm,
    fleetCommissionRatePerKm: deliveryPartnerRatePerKm,
    fixedDeliveryFee,
    freeDeliveryThreshold: Number.isFinite(freeDeliveryThreshold)
      ? Math.max(freeDeliveryThreshold, 0)
      : DEFAULT_FINANCE_SETTINGS.freeDeliveryThreshold,
    minimumOrderValue: Number.isFinite(minimumOrderValue)
      ? Math.max(minimumOrderValue, 0)
      : DEFAULT_FINANCE_SETTINGS.minimumOrderValue,
    handlingFeeStrategy,
    codEnabled: raw.codEnabled ?? DEFAULT_FINANCE_SETTINGS.codEnabled,
    onlineEnabled: raw.onlineEnabled ?? DEFAULT_FINANCE_SETTINGS.onlineEnabled,
    deliveryConfig,
  };
}

export async function getOrCreateFinanceSettings({ session } = {}) {
  const query = {};
  const options = session ? { session } : {};
  let settings = await Setting.findOne(query, null, options);

  if (!settings) {
    settings = await Setting.create(
      {
        ...DEFAULT_FINANCE_SETTINGS,
        pricingMode: DEFAULT_FINANCE_SETTINGS.deliveryPricingMode,
        baseDeliveryCharge: DEFAULT_FINANCE_SETTINGS.customerBaseDeliveryFee,
        fleetCommissionRatePerKm: DEFAULT_FINANCE_SETTINGS.deliveryPartnerRatePerKm,
      },
      options,
    );
  }

  return normalizeFinanceSettings(settings.toObject?.() || settings);
}

export async function updateDeliveryFinanceSettings(payload, { session } = {}) {
  const existing = await Setting.findOne({}, null, session ? { session } : {});
  const existingObj = existing?.toObject ? existing.toObject() : (existing || {});

  const merged = {
    ...existingObj,
    ...(payload || {}),
    deliveryConfig: {
      ...(existingObj.deliveryConfig || {}),
      ...(payload?.deliveryConfig || {}),
      express: {
        ...(existingObj.deliveryConfig?.express || {}),
        ...(payload?.deliveryConfig?.express || {}),
      },
      normal: {
        ...(existingObj.deliveryConfig?.normal || {}),
        ...(payload?.deliveryConfig?.normal || {}),
      },
      advance: {
        ...(existingObj.deliveryConfig?.advance || {}),
        ...(payload?.deliveryConfig?.advance || {}),
      },
      slotOverrides: payload?.deliveryConfig?.slotOverrides !== undefined
        ? payload.deliveryConfig.slotOverrides
        : (existingObj.deliveryConfig?.slotOverrides || []),
    },
  };

  const normalized = normalizeFinanceSettings(merged);
  const query = {};
  const options = { upsert: true, new: true };
  if (session) options.session = session;

  const updated = await Setting.findOneAndUpdate(query, { $set: normalized }, options);
  return normalizeFinanceSettings(updated.toObject?.() || updated);
}

export { DEFAULT_FINANCE_SETTINGS };
