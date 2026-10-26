import React, { useState, useEffect, useMemo } from 'react';
import Card from '@shared/components/ui/Card';
import {
    Truck,
    Zap,
    Calendar,
    Clock,
    Save,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Info,
    AlertTriangle,
    Sliders,
    Layers,
    CalendarDays,
    ShieldAlert,
    RefreshCw,
    Plus,
    Trash2,
    Settings,
    MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@shared/components/ui/Toast';
import { adminApi } from '../services/adminApi';
import DeliveryZoneManager from '../components/delivery/DeliveryZoneManager';

const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

const DeliveryManagement = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'express' | 'normal' | 'advance' | 'slots' | 'zones'
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Platform & Base Settings
    const [deliveryPricingMode, setDeliveryPricingMode] = useState('distance_based');
    const [baseCharge, setBaseCharge] = useState(30);
    const [baseDistance, setBaseDistance] = useState(0.5);
    const [extraPerKm, setExtraPerKm] = useState(10);
    const [fixedDeliveryFee, setFixedDeliveryFee] = useState(30);
    const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(499);
    const [minimumOrderValue, setMinimumOrderValue] = useState(0);

    // Express Delivery Settings
    const [expressConfig, setExpressConfig] = useState({
        enabled: true,
        surcharge: 40,
        estimatedMinMinutes: 15,
        estimatedMaxMinutes: 30,
        operatingHoursOnly: true,
    });

    // Normal Delivery Settings
    const [normalConfig, setNormalConfig] = useState({
        enabled: true,
        deliveryFee: null, // null = uses base/distance pricing
        estimatedLabel: '1–2 hours',
        minMinutes: 60,
        maxMinutes: 120,
    });

    // Advance Booking Settings
    const [advanceConfig, setAdvanceConfig] = useState({
        enabled: true,
        deliveryFee: null, // null = uses base/distance pricing
        maxAdvanceDays: 7,
        slotDurationMinutes: 60,
        maxOrdersPerSlot: 10,
        minAdvanceMinutes: 60,
        openTime: '09:00',
        closeTime: '21:00',
        operatingDays: DAYS_OF_WEEK,
    });

    // Custom Slot Overrides
    const [slotOverrides, setSlotOverrides] = useState([]);
    const [previewDate, setPreviewDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const markDirty = () => setHasUnsavedChanges(true);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const res = await adminApi.getDeliveryFinanceSettings();
            if (res.data?.success && res.data.result) {
                const s = res.data.result;
                setDeliveryPricingMode(s.deliveryPricingMode || 'distance_based');
                setBaseCharge(s.customerBaseDeliveryFee ?? 30);
                setBaseDistance(s.baseDistanceCapacityKm ?? 0.5);
                setExtraPerKm(s.incrementalKmSurcharge ?? 10);
                setFixedDeliveryFee(s.fixedDeliveryFee ?? 30);
                setFreeDeliveryThreshold(s.freeDeliveryThreshold ?? 499);
                setMinimumOrderValue(s.minimumOrderValue ?? 0);

                const dc = s.deliveryConfig || {};
                if (dc.express) {
                    setExpressConfig({
                        enabled: dc.express.enabled !== false,
                        surcharge: dc.express.surcharge ?? 40,
                        estimatedMinMinutes: dc.express.estimatedMinMinutes ?? 15,
                        estimatedMaxMinutes: dc.express.estimatedMaxMinutes ?? 30,
                        operatingHoursOnly: dc.express.operatingHoursOnly !== false,
                    });
                }
                if (dc.normal) {
                    setNormalConfig({
                        enabled: dc.normal.enabled !== false,
                        deliveryFee: dc.normal.deliveryFee,
                        estimatedLabel: dc.normal.estimatedLabel || '1–2 hours',
                        minMinutes: dc.normal.minMinutes ?? 60,
                        maxMinutes: dc.normal.maxMinutes ?? 120,
                    });
                }
                if (dc.advance) {
                    setAdvanceConfig({
                        enabled: dc.advance.enabled !== false,
                        deliveryFee: dc.advance.deliveryFee,
                        maxAdvanceDays: dc.advance.maxAdvanceDays ?? 7,
                        slotDurationMinutes: dc.advance.slotDurationMinutes ?? 60,
                        maxOrdersPerSlot: dc.advance.maxOrdersPerSlot ?? 10,
                        minAdvanceMinutes: dc.advance.minAdvanceMinutes ?? 60,
                        openTime: dc.advance.openTime || '09:00',
                        closeTime: dc.advance.closeTime || '21:00',
                        operatingDays: Array.isArray(dc.advance.operatingDays) && dc.advance.operatingDays.length > 0
                            ? dc.advance.operatingDays
                            : DAYS_OF_WEEK,
                    });
                }
                if (Array.isArray(dc.slotOverrides)) {
                    setSlotOverrides(dc.slotOverrides);
                }
                setHasUnsavedChanges(false);
            }
        } catch (error) {
            console.error('Failed to load delivery settings', error);
            showToast('Failed to load delivery settings', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        // Validation
        if (expressConfig.surcharge < 0) {
            showToast('Express surcharge cannot be negative', 'error');
            return;
        }
        if (baseCharge < 0) {
            showToast('Base delivery charge cannot be negative', 'error');
            return;
        }
        if (advanceConfig.maxAdvanceDays < 1 || advanceConfig.maxAdvanceDays > 30) {
            showToast('Advance booking days must be between 1 and 30', 'error');
            return;
        }
        if (advanceConfig.maxOrdersPerSlot < 1) {
            showToast('Slot capacity must be at least 1 order', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                deliveryPricingMode,
                pricingMode: deliveryPricingMode,
                customerBaseDeliveryFee: Number(baseCharge) || 0,
                baseDeliveryCharge: Number(baseCharge) || 0,
                baseDistanceCapacityKm: Number(baseDistance) || 0,
                incrementalKmSurcharge: Number(extraPerKm) || 0,
                fixedDeliveryFee: Number(fixedDeliveryFee) || 0,
                freeDeliveryThreshold: Number(freeDeliveryThreshold) || 0,
                minimumOrderValue: Number(minimumOrderValue) || 0,
                deliveryConfig: {
                    express: {
                        enabled: expressConfig.enabled,
                        surcharge: Number(expressConfig.surcharge) || 0,
                        estimatedMinMinutes: Number(expressConfig.estimatedMinMinutes) || 15,
                        estimatedMaxMinutes: Number(expressConfig.estimatedMaxMinutes) || 30,
                        operatingHoursOnly: expressConfig.operatingHoursOnly,
                    },
                    normal: {
                        enabled: normalConfig.enabled,
                        deliveryFee: normalConfig.deliveryFee != null && normalConfig.deliveryFee !== ''
                            ? Number(normalConfig.deliveryFee)
                            : null,
                        estimatedLabel: normalConfig.estimatedLabel || '1–2 hours',
                        minMinutes: Number(normalConfig.minMinutes) || 60,
                        maxMinutes: Number(normalConfig.maxMinutes) || 120,
                    },
                    advance: {
                        enabled: advanceConfig.enabled,
                        deliveryFee: advanceConfig.deliveryFee != null && advanceConfig.deliveryFee !== ''
                            ? Number(advanceConfig.deliveryFee)
                            : null,
                        maxAdvanceDays: Number(advanceConfig.maxAdvanceDays) || 7,
                        slotDurationMinutes: Number(advanceConfig.slotDurationMinutes) || 60,
                        maxOrdersPerSlot: Number(advanceConfig.maxOrdersPerSlot) || 10,
                        minAdvanceMinutes: Number(advanceConfig.minAdvanceMinutes) || 60,
                        openTime: advanceConfig.openTime || '09:00',
                        closeTime: advanceConfig.closeTime || '21:00',
                        operatingDays: advanceConfig.operatingDays || DAYS_OF_WEEK,
                    },
                    slotOverrides,
                },
            };

            await adminApi.updateDeliveryFinanceSettings(payload);
            setHasUnsavedChanges(false);
            showToast('Delivery settings and slots successfully saved!', 'success');
        } catch (error) {
            console.error('Failed to update delivery settings', error);
            showToast(error.response?.data?.message || 'Failed to update delivery settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Generate computed preview slots based on openTime, closeTime, and slotDurationMinutes
    const generatedSlots = useMemo(() => {
        const slots = [];
        const [openH, openM] = (advanceConfig.openTime || '09:00').split(':').map(Number);
        const [closeH, closeM] = (advanceConfig.closeTime || '21:00').split(':').map(Number);
        const startMin = (openH || 0) * 60 + (openM || 0);
        const endMin = (closeH || 0) * 60 + (closeM || 0);
        const duration = Number(advanceConfig.slotDurationMinutes) || 60;

        for (let m = startMin; m + duration <= endMin; m += duration) {
            const sh = String(Math.floor(m / 60)).padStart(2, '0');
            const sm = String(m % 60).padStart(2, '0');
            const eh = String(Math.floor((m + duration) / 60)).padStart(2, '0');
            const em = String((m + duration) % 60).padStart(2, '0');
            const startTime = `${sh}:${sm}`;
            const endTime = `${eh}:${em}`;
            const slotId = `${previewDate}_${sh}-${sm}_${eh}-${em}`;

            // Check if there is an override
            const override = slotOverrides.find(
                (o) => o.slotId === slotId || (o.startTime === startTime && (!o.date || o.date === previewDate))
            );

            const isEnabled = override ? override.enabled !== false : true;
            const capacity = override?.capacity ?? advanceConfig.maxOrdersPerSlot ?? 10;

            slots.push({
                slotId,
                startTime,
                endTime,
                label: `${format12Hour(startTime)} – ${format12Hour(endTime)}`,
                isEnabled,
                capacity,
                hasCustomOverride: Boolean(override),
            });
        }
        return slots;
    }, [advanceConfig.openTime, advanceConfig.closeTime, advanceConfig.slotDurationMinutes, advanceConfig.maxOrdersPerSlot, previewDate, slotOverrides]);

    function format12Hour(timeStr) {
        if (!timeStr) return '';
        const [hStr, mStr] = timeStr.split(':');
        let h = parseInt(hStr, 10);
        const m = mStr ? mStr.padStart(2, '0') : '00';
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return `${h}:${m} ${ampm}`;
    }

    const toggleSlotStatus = (slot) => {
        markDirty();
        setSlotOverrides((prev) => {
            const index = prev.findIndex((o) => o.slotId === slot.slotId);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = { ...updated[index], enabled: !slot.isEnabled };
                return updated;
            } else {
                return [
                    ...prev,
                    {
                        slotId: slot.slotId,
                        date: previewDate,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        enabled: !slot.isEnabled,
                        capacity: slot.capacity,
                    },
                ];
            }
        });
    };

    const updateSlotCapacity = (slot, newCapacity) => {
        markDirty();
        const cap = Math.max(1, parseInt(newCapacity, 10) || 1);
        setSlotOverrides((prev) => {
            const index = prev.findIndex((o) => o.slotId === slot.slotId);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = { ...updated[index], capacity: cap };
                return updated;
            } else {
                return [
                    ...prev,
                    {
                        slotId: slot.slotId,
                        date: previewDate,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        enabled: slot.isEnabled,
                        capacity: cap,
                    },
                ];
            }
        });
    };

    const resetSlotOverride = (slotId) => {
        markDirty();
        setSlotOverrides((prev) => prev.filter((o) => o.slotId !== slotId));
    };

    const toggleOperatingDay = (day) => {
        markDirty();
        setAdvanceConfig((prev) => {
            const current = prev.operatingDays || [];
            const exists = current.includes(day);
            const updated = exists ? current.filter((d) => d !== day) : [...current, day];
            return { ...prev, operatingDays: updated };
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading delivery configuration...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="admin-h1 flex items-center gap-3">
                        Delivery Slots & Pricing
                        <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                            <Truck className="h-5 w-5" />
                        </div>
                    </h1>
                    <p className="admin-description mt-1">
                        Centrally control Express delivery surcharges, standard delivery fees, advance booking windows, and slot capacity.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold animate-pulse">
                            <AlertTriangle size={13} />
                            Unsaved Changes
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={fetchSettings}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95",
                            isSaving ? "opacity-75 cursor-wait" : "hover:bg-brand-700"
                        )}
                    >
                        {isSaving ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        {isSaving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200/80">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                        activeTab === 'general'
                            ? "bg-black text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <Settings size={15} />
                    General & Pricing
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('express')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                        activeTab === 'express'
                            ? "bg-amber-500 text-slate-900 shadow-sm font-extrabold"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <Zap size={15} />
                    Express Delivery
                    {expressConfig.enabled ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('normal')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                        activeTab === 'normal'
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <Truck size={15} />
                    Normal Delivery
                    {normalConfig.enabled ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('advance')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                        activeTab === 'advance'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <CalendarDays size={15} />
                    Advance Booking
                    {advanceConfig.enabled ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('slots')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                        activeTab === 'slots'
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <Clock size={15} />
                    Slots & Capacity Inspector
                    {slotOverrides.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
                            {slotOverrides.length}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('zones')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                        activeTab === 'zones'
                            ? "bg-rose-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <MapPin size={15} />
                    Delivery Zones
                </button>
            </div>

            {/* TAB CONTENT: GENERAL & BASE PRICING */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                    Base Delivery Pricing Model
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Choose how base customer delivery fees are computed.
                                </p>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        markDirty();
                                        setDeliveryPricingMode('distance_based');
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        deliveryPricingMode === 'distance_based'
                                            ? "bg-white text-slate-900 shadow-xs"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    Distance Based
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        markDirty();
                                        setDeliveryPricingMode('fixed_price');
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        deliveryPricingMode === 'fixed_price'
                                            ? "bg-white text-slate-900 shadow-xs"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    Fixed Price
                                </button>
                            </div>
                        </div>

                        {deliveryPricingMode === 'distance_based' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">
                                            Base Delivery Fee (₹)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={baseCharge}
                                                onChange={(e) => {
                                                    markDirty();
                                                    setBaseCharge(Math.max(0, parseFloat(e.target.value) || 0));
                                                }}
                                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Standard fee for base radius.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">
                                            Base Distance Covered (km)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={baseDistance}
                                                onChange={(e) => {
                                                    markDirty();
                                                    setBaseDistance(Math.max(0.1, parseFloat(e.target.value) || 0.1));
                                                }}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">km</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">Distance included in the base fee.</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Incremental Km Surcharge (₹ / extra km)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={extraPerKm}
                                            onChange={(e) => {
                                                markDirty();
                                                setExtraPerKm(Math.max(0, parseFloat(e.target.value) || 0));
                                            }}
                                            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400">Added per each additional kilometer beyond base distance.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Fixed Delivery Fee (₹)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={fixedDeliveryFee}
                                        onChange={(e) => {
                                            markDirty();
                                            setFixedDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0));
                                        }}
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400">Flat charge for all normal deliveries regardless of distance.</p>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
                        <div className="border-b border-slate-100 pb-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                Order Thresholds & Rules
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Configure thresholds for free delivery and checkout eligibility.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Free Delivery Order Threshold (₹)</span>
                                    <span className="text-[11px] text-emerald-600 font-bold">Recommended: ₹499</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={freeDeliveryThreshold}
                                        onChange={(e) => {
                                            markDirty();
                                            setFreeDeliveryThreshold(Math.max(0, parseFloat(e.target.value) || 0));
                                        }}
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Orders with item total at or above this amount receive 100% free standard delivery. Set to 0 to disable.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Minimum Order Value (₹)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={minimumOrderValue}
                                        onChange={(e) => {
                                            markDirty();
                                            setMinimumOrderValue(Math.max(0, parseFloat(e.target.value) || 0));
                                        }}
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Customers cannot place orders below this cart value. Set to 0 for no minimum.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: EXPRESS DELIVERY */}
            {activeTab === 'express' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 p-6 rounded-2xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    Express Delivery Configuration
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure ASAP deliveries with priority surcharge and live ETA calculations.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={expressConfig.enabled}
                                    onChange={(e) => {
                                        markDirty();
                                        setExpressConfig((prev) => ({ ...prev, enabled: e.target.checked }));
                                    }}
                                    className="sr-only"
                                />
                                <span className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    expressConfig.enabled
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-slate-100 text-slate-500 border border-slate-300"
                                )}>
                                    {expressConfig.enabled ? "Enabled" : "Disabled"}
                                </span>
                            </label>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Express Priority Surcharge (₹)</span>
                                    <span className="text-[11px] text-amber-700 font-bold">Added on top of standard base fee</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={expressConfig.surcharge}
                                        onChange={(e) => {
                                            markDirty();
                                            setExpressConfig((prev) => ({ ...prev, surcharge: Math.max(0, parseFloat(e.target.value) || 0) }));
                                        }}
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Formula: Express Delivery Fee = Normal Delivery Fee (Base + Distance) + Express Surcharge.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Estimated Min Minutes
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="5"
                                            value={expressConfig.estimatedMinMinutes}
                                            onChange={(e) => {
                                                markDirty();
                                                setExpressConfig((prev) => ({ ...prev, estimatedMinMinutes: Math.max(5, parseInt(e.target.value, 10) || 5) }));
                                            }}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">mins</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Estimated Max Minutes
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="10"
                                            value={expressConfig.estimatedMaxMinutes}
                                            onChange={(e) => {
                                                markDirty();
                                                setExpressConfig((prev) => ({ ...prev, estimatedMaxMinutes: Math.max(10, parseInt(e.target.value, 10) || 10) }));
                                            }}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">mins</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-amber-900">Operating Hours Restriction</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        Only allow Express delivery when the store is actively open. When closed, customers must use Advance Booking.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={expressConfig.operatingHoursOnly}
                                    onChange={(e) => {
                                        markDirty();
                                        setExpressConfig((prev) => ({ ...prev, operatingHoursOnly: e.target.checked }));
                                    }}
                                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Live Preview Card */}
                    <Card className="p-6 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-white space-y-4 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                                    Customer View Preview
                                </span>
                                <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                            </div>

                            <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200 shadow-xs space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-900">⚡ Express Delivery</h4>
                                    <span className="text-sm font-black text-slate-900">
                                        ₹{(Number(baseCharge) || 30) + (Number(expressConfig.surcharge) || 40)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">Deliver as soon as possible</p>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                        ⚡ {expressConfig.estimatedMinMinutes}–{expressConfig.estimatedMaxMinutes} mins
                                    </span>
                                    <span className="text-slate-400 font-medium text-[11px]">Priority dispatch</span>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2 text-xs text-slate-600">
                                <div className="flex justify-between">
                                    <span>Base Normal Delivery:</span>
                                    <span className="font-bold">₹{baseCharge}</span>
                                </div>
                                <div className="flex justify-between text-amber-700">
                                    <span>Express Surcharge:</span>
                                    <span className="font-bold">+₹{expressConfig.surcharge}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-slate-900">
                                    <span>Total Express Fee:</span>
                                    <span>₹{(Number(baseCharge) || 30) + (Number(expressConfig.surcharge) || 40)}</span>
                                </div>
                            </div>
                        </div>

                        {!expressConfig.enabled && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle size={15} />
                                <span>Express is currently disabled for all customers.</span>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: NORMAL DELIVERY */}
            {activeTab === 'normal' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 p-6 rounded-2xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                    Normal Delivery Configuration
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Standard delivery option with 1–2 hour SLA.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={normalConfig.enabled}
                                    onChange={(e) => {
                                        markDirty();
                                        setNormalConfig((prev) => ({ ...prev, enabled: e.target.checked }));
                                    }}
                                    className="sr-only"
                                />
                                <span className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    normalConfig.enabled
                                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                                        : "bg-slate-100 text-slate-500 border border-slate-300"
                                )}>
                                    {normalConfig.enabled ? "Enabled" : "Disabled"}
                                </span>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Fixed Override Fee (₹, optional)</span>
                                    <span className="text-[11px] text-slate-400">Leave blank to use base/distance fee</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder={`Default from Base: ₹${baseCharge}`}
                                        value={normalConfig.deliveryFee ?? ''}
                                        onChange={(e) => {
                                            markDirty();
                                            const val = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            setNormalConfig((prev) => ({ ...prev, deliveryFee: val }));
                                        }}
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Customer Display Label
                                </label>
                                <input
                                    type="text"
                                    value={normalConfig.estimatedLabel}
                                    onChange={(e) => {
                                        markDirty();
                                        setNormalConfig((prev) => ({ ...prev, estimatedLabel: e.target.value }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                />
                                <p className="text-[11px] text-slate-400">Display label shown to customers on checkout (e.g. 1–2 hours).</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/60 to-white space-y-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full">
                                Customer View Preview
                            </span>
                            <Truck className="h-5 w-5 text-blue-600" />
                        </div>

                        <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 shadow-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold text-slate-900">🚚 Normal Delivery</h4>
                                <span className="text-sm font-black text-slate-900">
                                    ₹{normalConfig.deliveryFee != null ? normalConfig.deliveryFee : baseCharge}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">Standard priority delivery</p>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                                    {normalConfig.estimatedLabel}
                                </span>
                                <span className="text-slate-400 font-medium text-[11px]">Standard SLA</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: ADVANCE BOOKING */}
            {activeTab === 'advance' && (
                <div className="space-y-6">
                    <Card className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                                    Advance Booking & Scheduled Delivery Settings
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure scheduling horizon, slot duration, capacity limits, and operating hours.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={advanceConfig.enabled}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, enabled: e.target.checked }));
                                    }}
                                    className="sr-only"
                                />
                                <span className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    advanceConfig.enabled
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : "bg-slate-100 text-slate-500 border border-slate-300"
                                )}>
                                    {advanceConfig.enabled ? "Enabled" : "Disabled"}
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Max Advance Days (1–30)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={advanceConfig.maxAdvanceDays}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, maxAdvanceDays: Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)) }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                />
                                <p className="text-[11px] text-slate-400">How many future days customers can pick.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Slot Duration (minutes)
                                </label>
                                <select
                                    value={advanceConfig.slotDurationMinutes}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, slotDurationMinutes: parseInt(e.target.value, 10) }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                >
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>60 minutes (1 hour)</option>
                                    <option value={90}>90 minutes (1.5 hours)</option>
                                    <option value={120}>120 minutes (2 hours)</option>
                                </select>
                                <p className="text-[11px] text-slate-400">Duration of each selectable delivery window.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Default Max Orders per Slot
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={advanceConfig.maxOrdersPerSlot}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, maxOrdersPerSlot: Math.max(1, parseInt(e.target.value, 10) || 1) }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                />
                                <p className="text-[11px] text-slate-400">Maximum simultaneous orders allowed per slot.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Opening Time (Store/Slot start)
                                </label>
                                <input
                                    type="time"
                                    value={advanceConfig.openTime}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, openTime: e.target.value }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Closing Time (Store/Slot end)
                                </label>
                                <input
                                    type="time"
                                    value={advanceConfig.closeTime}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, closeTime: e.target.value }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Min Lead Advance Notice (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={advanceConfig.minAdvanceMinutes}
                                    onChange={(e) => {
                                        markDirty();
                                        setAdvanceConfig((prev) => ({ ...prev, minAdvanceMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                                />
                                <p className="text-[11px] text-slate-400">Time buffer required before booking a slot on today's date.</p>
                            </div>
                        </div>

                        {/* Operating Days Checklist */}
                        <div className="pt-4 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-700 block mb-3">
                                Operating Days for Advance Delivery
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => {
                                    const isSelected = (advanceConfig.operatingDays || []).includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleOperatingDay(day)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                                isSelected
                                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: SLOTS & CAPACITY INSPECTOR */}
            {activeTab === 'slots' && (
                <div className="space-y-6">
                    <Card className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-600" />
                                    Interactive Slot & Capacity Inspector
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Inspect generated slots, toggle individual slot availability, or set custom capacity overrides.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-700">Preview Date:</label>
                                <input
                                    type="date"
                                    value={previewDate}
                                    onChange={(e) => setPreviewDate(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                />
                            </div>
                        </div>

                        {slotOverrides.length > 0 && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                                <span>{slotOverrides.length} slot custom override(s) configured.</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        markDirty();
                                        setSlotOverrides([]);
                                    }}
                                    className="font-bold text-purple-700 underline hover:text-purple-900"
                                >
                                    Reset All Overrides
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {generatedSlots.map((slot) => (
                                <div
                                    key={slot.slotId}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3",
                                        !slot.isEnabled
                                            ? "bg-slate-100/70 border-slate-300 opacity-60"
                                            : slot.hasCustomOverride
                                            ? "bg-purple-50/50 border-purple-300 ring-1 ring-purple-200"
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 leading-tight">
                                                {slot.label}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                ID: {slot.startTime}–{slot.endTime}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleSlotStatus(slot)}
                                            className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all",
                                                slot.isEnabled
                                                    ? "bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-800"
                                                    : "bg-red-100 text-red-800 hover:bg-emerald-100 hover:text-emerald-800"
                                            )}
                                        >
                                            {slot.isEnabled ? "Active" : "Disabled"}
                                        </button>
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-[11px] text-slate-500 font-medium">Capacity limit:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={slot.capacity}
                                                onChange={(e) => updateSlotCapacity(slot, e.target.value)}
                                                className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold text-slate-900 outline-none"
                                            />
                                            <span className="text-[10px] text-slate-400">orders</span>
                                        </div>
                                    </div>

                                    {slot.hasCustomOverride && (
                                        <button
                                            type="button"
                                            onClick={() => resetSlotOverride(slot.slotId)}
                                            className="text-[10px] text-slate-400 hover:text-red-600 font-bold flex items-center gap-1 justify-end"
                                        >
                                            <RotateCcw size={10} /> Reset override
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: POLYGON DELIVERY ZONES */}
            {activeTab === 'zones' && (
                <DeliveryZoneManager />
            )}
        </div>
    );
};

export default DeliveryManagement;
