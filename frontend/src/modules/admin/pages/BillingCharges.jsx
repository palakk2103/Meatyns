// Premium Billing & Financial Configuration System
import React, { useState, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import {
    RotateCcw,
    Save,
    Info,
    Truck,
    Settings,
    Zap,
    MapPin,
    History,
    Plus,
    Trash2,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@shared/components/ui/Toast';
import { adminApi } from '../services/adminApi';

const BillingCharges = () => {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState('distance'); // 'fixed' or 'distance'
    const [returnDeliveryCommission, setReturnDeliveryCommission] = useState(0);
    // City-wise distance slabs for Normal + Scheduled delivery (inputs kept as strings)
    const [cityRules, setCityRules] = useState([]);

    const [config, setConfig] = useState({
        platformFee: 0,
        freeDeliveryThreshold: 499,
        minimumOrderValue: 0,
        baseCharge: 30,
        riderBasePayout: 30,
        baseDistance: 0.5,
        extraPerKm: 10,
        deliveryPartnerRatePerKm: 5,
        fixedCharge: 30,
        handlingFeeStrategy: "highest_category_fee",
        codEnabled: true,
        onlineEnabled: true,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [platformRes, deliveryRes] = await Promise.all([
                    adminApi.getPlatformSettings(),
                    adminApi.getDeliveryFinanceSettings(),
                ]);

                if (platformRes.data?.success && platformRes.data.result) {
                    setReturnDeliveryCommission(platformRes.data.result.returnDeliveryCommission ?? 0);
                }

                if (deliveryRes.data?.success && deliveryRes.data.result) {
                    const s = deliveryRes.data.result;
                    setDeliveryMode(s.deliveryPricingMode === 'fixed_price' ? 'fixed' : 'distance');
                    setConfig((prev) => ({
                        ...prev,
                        baseCharge: s.customerBaseDeliveryFee ?? s.baseDeliveryCharge ?? prev.baseCharge,
                        riderBasePayout: s.riderBasePayout ?? s.customerBaseDeliveryFee ?? prev.riderBasePayout,
                        baseDistance: s.baseDistanceCapacityKm ?? prev.baseDistance,
                        extraPerKm: s.incrementalKmSurcharge ?? prev.extraPerKm,
                        deliveryPartnerRatePerKm: s.deliveryPartnerRatePerKm ?? s.fleetCommissionRatePerKm ?? prev.deliveryPartnerRatePerKm,
                        fixedCharge: s.fixedDeliveryFee ?? s.customerBaseDeliveryFee ?? prev.fixedCharge,
                        freeDeliveryThreshold: s.freeDeliveryThreshold ?? prev.freeDeliveryThreshold,
                        minimumOrderValue: s.minimumOrderValue ?? prev.minimumOrderValue,
                        handlingFeeStrategy: s.handlingFeeStrategy ?? prev.handlingFeeStrategy,
                        codEnabled: s.codEnabled ?? prev.codEnabled,
                        onlineEnabled: s.onlineEnabled ?? prev.onlineEnabled,
                    }));
                    setCityRules(
                        (s.cityDeliverySlabs || []).map((rule) => ({
                            city: rule.city || '',
                            enabled: rule.enabled !== false,
                            slabs: (rule.slabs || []).map((slab) => ({
                                fromKm: String(slab.fromKm),
                                toKm: String(slab.toKm),
                                fee: String(slab.fee),
                            })),
                        }))
                    );
                }
            } catch (error) {
                console.error('Failed to load settings', error);
            }
        };
        fetchSettings();
    }, []);

    const buildCityDeliverySlabs = () => {
        const seen = new Set();
        const rules = [];
        for (const rule of cityRules) {
            const city = rule.city.trim();
            const slabs = [];
            for (const slab of rule.slabs) {
                if (slab.fromKm === '' && slab.toKm === '' && slab.fee === '') continue;
                const fromKm = Number(slab.fromKm || 0);
                const toKm = Number(slab.toKm);
                const fee = Number(slab.fee);
                if (slab.toKm === '' || slab.fee === '' || !Number.isFinite(toKm) || !Number.isFinite(fee) || toKm <= fromKm || fee < 0) {
                    throw new Error(`${city || 'City'}: each slab needs From km, a larger To km and a charge.`);
                }
                slabs.push({ fromKm, toKm, fee });
            }
            if (!city && slabs.length === 0) continue;
            if (city.length < 2) throw new Error('Please enter a city name for every city slab group.');
            if (slabs.length === 0) throw new Error(`${city}: add at least one distance slab.`);
            if (seen.has(city.toLowerCase())) throw new Error(`${city} is added more than once.`);
            seen.add(city.toLowerCase());
            rules.push({ city, enabled: rule.enabled, slabs: slabs.sort((a, b) => a.toKm - b.toKm) });
        }
        return rules;
    };

    const updateCityRule = (index, patch) =>
        setCityRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

    const updateCitySlab = (ruleIndex, slabIndex, field, value) =>
        setCityRules((prev) =>
            prev.map((r, i) =>
                i === ruleIndex
                    ? { ...r, slabs: r.slabs.map((sl, j) => (j === slabIndex ? { ...sl, [field]: value } : sl)) }
                    : r
            )
        );

    const handleSave = async () => {
        let cityDeliverySlabs;
        try {
            cityDeliverySlabs = buildCityDeliverySlabs();
        } catch (validationError) {
            showToast(validationError.message, 'error');
            return;
        }
        try {
            setIsSaving(true);
            await Promise.all([
                adminApi.updatePlatformSettings({
                    returnDeliveryCommission,
                }),
                adminApi.updateDeliveryFinanceSettings({
                    deliveryPricingMode: deliveryMode === 'fixed' ? 'fixed_price' : 'distance_based',
                    customerBaseDeliveryFee: config.baseCharge,
                    riderBasePayout: config.riderBasePayout,
                    baseDeliveryCharge: config.baseCharge,
                    baseDistanceCapacityKm: config.baseDistance,
                    incrementalKmSurcharge: config.extraPerKm,
                    deliveryPartnerRatePerKm: config.deliveryPartnerRatePerKm,
                    fleetCommissionRatePerKm: config.deliveryPartnerRatePerKm,
                    fixedDeliveryFee: config.fixedCharge,
                    freeDeliveryThreshold: Number(config.freeDeliveryThreshold) || 0,
                    minimumOrderValue: Number(config.minimumOrderValue) || 0,
                    handlingFeeStrategy: config.handlingFeeStrategy,
                    codEnabled: config.codEnabled,
                    onlineEnabled: config.onlineEnabled,
                    cityDeliverySlabs,
                }),
            ]);

            showToast('Delivery finance settings updated', 'success');
        } catch (error) {
            console.error('Failed to update platform settings', error);
            showToast('Failed to update fees settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="admin-h1 flex items-center gap-3">
                        Fees & Charges
                        <div className="p-2 bg-red-100 rounded-xl">
                            <RotateCcw className="h-5 w-5 text-red-600" />
                        </div>
                    </h1>
                    <p className="admin-description mt-1">Set up delivery fees, platform charges, and free delivery limits.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-white ring-1 ring-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                        <History className="h-4 w-4 text-slate-400" />
                        AUDIT LOGS
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-100 active:scale-95",
                            isSaving ? "opacity-70 cursor-wait" : "hover:bg-brand-700"
                        )}
                    >
                        {isSaving ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>


            <div className="max-w-4xl mx-auto text-left">
                {/* Main Configuration Core */}
                <div className="space-y-8">
                    {/* Delivery Slot Management Quick Link Banner */}
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FDCE04] text-black flex items-center justify-center font-bold shadow-xs">
                                <Truck size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Express Surcharge & Slot Management</p>
                                <p className="text-[11px] text-slate-600 font-medium">Centrally manage Express delivery fees, time slots, advance horizons, and slot booking limits.</p>
                            </div>
                        </div>
                        <a
                            href="/admin/delivery-management"
                            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                        >
                            Open Slots & Charges &rarr;
                        </a>
                    </div>

                    {/* General Financial Thresholds */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <Settings className="h-4 w-4 text-slate-400" />
                                Main Charges
                            </h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Platform/Handling Fee (₹)
                                    <Info className="h-3 w-3 opacity-50" />
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-300 group-focus-within:text-red-500 transition-colors">₹</span>
                                    <input
                                        type="number"
                                        value={config.platformFee}
                                        onChange={(e) => handleInputChange('platformFee', e.target.value)}
                                        className="w-full pl-10 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 italic">Fee added to every order.</p>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Free Delivery Minimum (₹)
                                    <Zap className="h-3 w-3 text-amber-500" />
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-300 group-focus-within:text-red-500 transition-colors">₹</span>
                                    <input
                                        type="number"
                                        value={config.freeDeliveryThreshold}
                                        onChange={(e) => handleInputChange('freeDeliveryThreshold', e.target.value)}
                                        className="w-full pl-10 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 italic">Orders above this amount will have free delivery.</p>
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Minimum Order Value (₹)
                                    <Info className="h-3 w-3 opacity-50" />
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-300 group-focus-within:text-red-500 transition-colors">₹</span>
                                    <input
                                        type="number"
                                        value={config.minimumOrderValue}
                                        onChange={(e) => handleInputChange('minimumOrderValue', e.target.value)}
                                        className="w-full pl-10 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
                                        placeholder="0 for no minimum"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 italic">Customers cannot checkout if their cart is below this amount. Set to 0 to disable.</p>
                            </div>
                        </div>
                    </Card>

                    {/* Delivery Fee Settings */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <Truck className="h-4 w-4 text-brand-500" />
                                Delivery Fee Settings
                            </h3>
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setDeliveryMode('fixed')}
                                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", deliveryMode === 'fixed' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                >Fixed Price</button>
                                <button
                                    onClick={() => setDeliveryMode('distance')}
                                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", deliveryMode === 'distance' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                >Distance Based</button>
                            </div>
                        </div>
                        <div className="p-8">
                            {deliveryMode === 'distance' ? (
                                <>
                                    <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-8 flex gap-4">
                                        <MapPin className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-brand-900 uppercase tracking-tight">Location Accuracy</p>
                                            <p className="text-[10px] font-bold text-brand-700 leading-relaxed italic">Requires Google Maps API. Without it, the system will use straight-line distance.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Delivery Charge (₹)</label>
                                            <input
                                                type="number"
                                                value={config.baseCharge}
                                                onChange={(e) => handleInputChange('baseCharge', e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 italic">Customer-facing minimum fee for first X kms.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rider Base Payout (₹)</label>
                                            <input
                                                type="number"
                                                value={config.riderBasePayout}
                                                onChange={(e) => handleInputChange('riderBasePayout', e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 italic">Base payout for delivery partner within base radius.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Distance Capacity (km)</label>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={config.baseDistance}
                                                    onChange={(e) => handleInputChange('baseDistance', e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">km</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 italic">Radius covered by the base charge.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incremental Km Surcharge (₹)</label>
                                            <input
                                                type="number"
                                                value={config.extraPerKm}
                                                onChange={(e) => handleInputChange('extraPerKm', e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 italic">Charged for every km beyond base radius.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Partner Rate (₹/km)</label>
                                            <input
                                                type="number"
                                                value={config.deliveryPartnerRatePerKm}
                                                onChange={(e) => handleInputChange('deliveryPartnerRatePerKm', e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 italic">Net payout to delivery partner per km.</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-base font-bold text-slate-900">Fixed Delivery Charge (₹)</label>
                                        <div className="relative group max-w-md">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-300 group-focus-within:text-slate-900 transition-colors">₹</span>
                                            <input
                                                type="number"
                                                value={config.fixedCharge}
                                                onChange={(e) => handleInputChange('fixedCharge', e.target.value)}
                                                className="w-full pl-10 pr-5 py-4 bg-white ring-1 ring-slate-200 border-none rounded-xl text-base font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                                            />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">Flat fee charged for all deliveries below threshold.</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-dashed border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Return Delivery Commission (per pickup)
                                    </label>
                                    <div className="relative group max-w-md">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-300 group-focus-within:text-slate-900 transition-colors">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={returnDeliveryCommission}
                                            onChange={(e) =>
                                                setReturnDeliveryCommission(Number(e.target.value) || 0)
                                            }
                                            className="w-full pl-10 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Flat amount paid to delivery partner for each approved return pickup (deducted from seller earnings).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* City-wise Distance Charges (Normal + Scheduled) */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-brand-500" />
                                    City-wise Delivery Charges
                                </h3>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    For Normal &amp; Scheduled delivery only (Express keeps its own charge). Distance is from the serving store to the customer&apos;s address. Always added on top of the product total; beyond the last slab the standard delivery fee above applies.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setCityRules((prev) => [
                                        ...prev,
                                        { city: '', enabled: true, slabs: [{ fromKm: '0', toKm: '', fee: '' }] },
                                    ])
                                }
                                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add City
                            </button>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            {cityRules.length === 0 && (
                                <p className="text-xs font-bold text-slate-400 italic">
                                    No city-specific charges. All cities use the standard delivery fee above.
                                </p>
                            )}
                            {cityRules.map((rule, ruleIndex) => (
                                <div key={ruleIndex} className="rounded-2xl ring-1 ring-slate-200 p-4 sm:p-5 space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="City (e.g. Kolhapur)"
                                            value={rule.city}
                                            onChange={(e) => updateCityRule(ruleIndex, { city: e.target.value })}
                                            className="flex-1 min-w-[160px] px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10"
                                        />
                                        <label className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={rule.enabled}
                                                onChange={(e) => updateCityRule(ruleIndex, { enabled: e.target.checked })}
                                                className="rounded border-slate-300"
                                            />
                                            Active
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setCityRules((prev) => prev.filter((_, i) => i !== ruleIndex))}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            title="Remove city"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            <span>From (km)</span>
                                            <span>To (km)</span>
                                            <span>Charge (₹)</span>
                                            <span className="w-8" />
                                        </div>
                                        {rule.slabs.map((slab, slabIndex) => (
                                            <div key={slabIndex} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                                                {['fromKm', 'toKm', 'fee'].map((field) => (
                                                    <input
                                                        key={field}
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        value={slab[field]}
                                                        onChange={(e) => updateCitySlab(ruleIndex, slabIndex, field, e.target.value)}
                                                        className="w-full min-w-0 px-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10"
                                                    />
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateCityRule(ruleIndex, {
                                                            slabs: rule.slabs.filter((_, j) => j !== slabIndex),
                                                        })
                                                    }
                                                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
                                                    title="Remove slab"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const last = rule.slabs[rule.slabs.length - 1];
                                                updateCityRule(ruleIndex, {
                                                    slabs: [...rule.slabs, { fromKm: last?.toKm || '0', toKm: '', fee: '' }],
                                                });
                                            }}
                                            className="flex items-center gap-1 text-[11px] font-black text-slate-700 hover:text-black uppercase tracking-wider pt-1"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add Slab
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default BillingCharges;
