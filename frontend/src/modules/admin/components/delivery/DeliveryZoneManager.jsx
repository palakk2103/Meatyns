import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  Marker,
} from "@react-google-maps/api";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  Sliders,
  Eye,
  Info,
  Undo2,
  RotateCcw,
  ShieldCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@shared/components/ui/Toast";
import { adminApi } from "../../services/adminApi";
import Modal from "@shared/components/ui/Modal";
import Button from "@shared/components/ui/Button";

const libraries = ["places", "drawing"];
const mapContainerStyle = {
  width: "100%",
  height: "360px",
  borderRadius: "1rem",
};

const defaultCenter = {
  lat: 25.5941, // Patna, Bihar (Meatyns primary cluster)
  lng: 85.1376,
};

const DeliveryZoneManager = () => {
  const { showToast } = useToast();
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmZone, setDeleteConfirmZone] = useState(null);
  const [coordInputMode, setCoordInputMode] = useState("map"); // 'map' | 'manual'

  // Zone Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: 0,
    deliveryFee: "",
    minOrderValue: "",
    surcharge: "",
    expressAvailable: true,
    isActive: true,
    coordinates: [], // [{ lat, lng }]
    manualCoordsText: "",
  });

  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-zone-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const fetchZones = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getDeliveryZones({
        search: searchQuery,
        status: statusFilter,
      });
      if (res.data?.success && res.data.result) {
        setZones(res.data.result.zones || []);
      }
    } catch (err) {
      console.error("Failed to load delivery zones:", err);
      showToast(err.response?.data?.message || "Failed to load delivery zones", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchZones();
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingZoneId(null);
    setFormData({
      name: "",
      description: "",
      priority: 0,
      deliveryFee: "",
      minOrderValue: "",
      surcharge: "",
      expressAvailable: true,
      isActive: true,
      coordinates: [],
      manualCoordsText: "",
    });
    setCoordInputMode("map");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (zone) => {
    setIsEditing(true);
    setEditingZoneId(zone._id);

    // Normalize coordinates from GeoJSON [[[lng, lat], ...]] to [{ lat, lng }]
    const rawRings = zone.polygon?.coordinates || [];
    const outerRing = rawRings[0] || [];
    // Skip duplicate last closing point for editing markers
    const editablePoints = outerRing.slice(0, outerRing.length > 3 ? outerRing.length - 1 : outerRing.length).map((pt) => ({
      lat: pt[1],
      lng: pt[0],
    }));

    setFormData({
      name: zone.name || "",
      description: zone.description || "",
      priority: zone.priority ?? 0,
      deliveryFee: zone.deliveryFee != null ? String(zone.deliveryFee) : "",
      minOrderValue: zone.minOrderValue != null ? String(zone.minOrderValue) : "",
      surcharge: zone.surcharge != null ? String(zone.surcharge) : "",
      expressAvailable: zone.expressAvailable !== false,
      isActive: zone.isActive !== false,
      coordinates: editablePoints,
      manualCoordsText: JSON.stringify(
        editablePoints.map((p) => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]),
        null,
        2
      ),
    });
    setCoordInputMode("map");
    setIsModalOpen(true);
  };

  const handleMapClick = useCallback((e) => {
    if (!e.latLng) return;
    const newPt = {
      lat: Number(e.latLng.lat().toFixed(6)),
      lng: Number(e.latLng.lng().toFixed(6)),
    };
    setFormData((prev) => {
      const updated = [...prev.coordinates, newPt];
      return {
        ...prev,
        coordinates: updated,
        manualCoordsText: JSON.stringify(
          updated.map((p) => [p.lng, p.lat]),
          null,
          2
        ),
      };
    });
  }, []);

  const handleUndoPoint = () => {
    setFormData((prev) => {
      const updated = prev.coordinates.slice(0, -1);
      return {
        ...prev,
        coordinates: updated,
        manualCoordsText: JSON.stringify(
          updated.map((p) => [p.lng, p.lat]),
          null,
          2
        ),
      };
    });
  };

  const handleClearPoints = () => {
    setFormData((prev) => ({
      ...prev,
      coordinates: [],
      manualCoordsText: "[]",
    }));
  };

  const handleManualCoordsChange = (text) => {
    setFormData((prev) => ({ ...prev, manualCoordsText: text }));
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const ring = Array.isArray(parsed[0]) && Array.isArray(parsed[0][0]) ? parsed[0] : parsed;
        const validPts = ring
          .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
          .map((p) => ({ lat: Number(p[1]), lng: Number(p[0]) }));
        setFormData((prev) => ({ ...prev, coordinates: validPts, manualCoordsText: text }));
      }
    } catch {
      // Allow user to continue typing invalid JSON
    }
  };

  const handleToggleStatus = async (zone) => {
    try {
      const newStatus = !zone.isActive;
      await adminApi.toggleDeliveryZoneStatus(zone._id, newStatus);
      setZones((prev) =>
        prev.map((z) => (z._id === zone._id ? { ...z, isActive: newStatus } : z))
      );
      showToast(`Zone '${zone.name}' ${newStatus ? "activated" : "deactivated"}`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const handleDeleteZone = async () => {
    if (!deleteConfirmZone) return;
    try {
      await adminApi.deleteDeliveryZone(deleteConfirmZone._id);
      setZones((prev) => prev.filter((z) => z._id !== deleteConfirmZone._id));
      showToast(`Zone '${deleteConfirmZone.name}' deleted successfully`, "success");
      setDeleteConfirmZone(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete zone", "error");
    }
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Zone name is required", "error");
      return;
    }

    if (formData.coordinates.length < 3) {
      showToast("A delivery zone requires at least 3 points on the map to form a polygon.", "error");
      return;
    }

    // Convert coordinates to GeoJSON format [[ [lng, lat], ... ]]
    const ringCoords = formData.coordinates.map((pt) => [pt.lng, pt.lat]);
    // Ensure closure
    const first = ringCoords[0];
    const last = ringCoords[ringCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ringCoords.push([first[0], first[1]]);
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      priority: Number(formData.priority || 0),
      deliveryFee: formData.deliveryFee !== "" ? Number(formData.deliveryFee) : null,
      minOrderValue: formData.minOrderValue !== "" ? Number(formData.minOrderValue) : null,
      surcharge: formData.surcharge !== "" ? Number(formData.surcharge) : 0,
      expressAvailable: formData.expressAvailable,
      isActive: formData.isActive,
      polygon: {
        type: "Polygon",
        coordinates: [ringCoords],
      },
    };

    try {
      setIsSaving(true);
      if (isEditing) {
        const res = await adminApi.updateDeliveryZone(editingZoneId, payload);
        if (res.data?.success) {
          showToast("Delivery zone updated successfully!", "success");
          setIsModalOpen(false);
          fetchZones();
        }
      } else {
        const res = await adminApi.createDeliveryZone(payload);
        if (res.data?.success) {
          showToast("Delivery zone created successfully!", "success");
          setIsModalOpen(false);
          fetchZones();
        }
      }
    } catch (err) {
      console.error("Save zone error:", err);
      showToast(err.response?.data?.message || "Failed to save delivery zone", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Center coordinate for map view
  const mapCenter = formData.coordinates.length > 0 ? formData.coordinates[0] : defaultCenter;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-black text-white rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <MapPin size={20} />
            </span>
            <h2 className="text-base font-black tracking-tight uppercase">
              Polygon Delivery Service Zones
            </h2>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            Define exact geographic boundaries where customers are eligible for delivery and custom locality rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchZones}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            <Plus size={15} strokeWidth={3} />
            Create Zone
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search zone by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Zones ({zones.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Active ({zones.filter((z) => z.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              statusFilter === "inactive"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Inactive ({zones.filter((z) => !z.isActive).length})
          </button>
        </div>
      </div>

      {/* Zones Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-amber-500" />
            <span className="text-xs font-bold">Loading delivery zones...</span>
          </div>
        ) : zones.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3">
              <MapPin size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Delivery Zones Configured</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              When no delivery zones are active, the store service radius applies as fallback. Create custom polygon zones to restrict service boundaries.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white font-bold rounded-xl text-xs transition-all hover:bg-slate-800"
            >
              <Plus size={14} /> Create First Zone
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Zone Name & Priority</th>
                  <th className="py-3 px-4">Rate & Fee Overrides</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Express Status</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((zone) => {
                  const pointsCount = zone.polygon?.coordinates?.[0]?.length || 0;
                  return (
                    <tr key={zone._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {zone.name}
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-mono font-bold">
                            P{zone.priority || 0}
                          </span>
                        </div>
                        {zone.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {zone.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-700">
                            Fee: {zone.deliveryFee != null ? `₹${zone.deliveryFee}` : "Platform Default"}
                          </div>
                          {zone.surcharge > 0 && (
                            <div className="text-[10px] text-amber-600 font-bold">
                              +₹{zone.surcharge} surcharge
                            </div>
                          )}
                          {zone.minOrderValue != null && (
                            <div className="text-[10px] text-slate-400">
                              Min Order: ₹{zone.minOrderValue}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">
                          <Layers size={11} />
                          {pointsCount > 0 ? `${pointsCount} vertices` : "No points"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {zone.expressAvailable ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 size={12} /> Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                            <XCircle size={12} /> Disabled
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(zone)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                            zone.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", zone.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                          {zone.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(zone)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Zone"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmZone(zone)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Zone"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Edit Delivery Zone" : "Create Polygon Delivery Zone"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveZone} className="space-y-4 pt-2">
          {/* General Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Zone Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Central Patna Cluster 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Priority
                <span className="text-[10px] text-slate-400 font-normal">(Higher wins)</span>
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. High-density coverage zone covering Bailey Road to Kankarbagh"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950"
            />
          </div>

          {/* Pricing & Surcharge Overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">
                Zone Delivery Fee (₹)
              </label>
              <input
                type="number"
                placeholder="Leave blank for default"
                value={formData.deliveryFee}
                onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400">Overrides normal delivery fee</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">
                Locality Surcharge (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.surcharge}
                onChange={(e) => setFormData({ ...formData, surcharge: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400">Added to normal/express fee</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">
                Min Order Value (₹)
              </label>
              <input
                type="number"
                placeholder="Default"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400">Zone-specific order floor</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 text-xs font-bold text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Zone is Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.expressAvailable}
                onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Allow Express Delivery in this Zone</span>
            </label>
          </div>

          {/* Polygon Drawing Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <MapPin size={14} className="text-amber-500" />
                  Polygon Service Boundary
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                    formData.coordinates.length >= 3
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  )}
                >
                  {formData.coordinates.length} points {formData.coordinates.length >= 3 ? "• Valid Polygon" : "• Min 3 needed"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCoordInputMode(coordInputMode === "map" ? "manual" : "map")}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline"
                >
                  {coordInputMode === "map" ? "Switch to Text / JSON" : "Switch to Visual Map"}
                </button>
                {coordInputMode === "map" && (
                  <>
                    <button
                      type="button"
                      onClick={handleUndoPoint}
                      disabled={formData.coordinates.length === 0}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold disabled:opacity-40"
                    >
                      <Undo2 size={12} /> Undo
                    </button>
                    <button
                      type="button"
                      onClick={handleClearPoints}
                      disabled={formData.coordinates.length === 0}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold disabled:opacity-40"
                    >
                      <RotateCcw size={12} /> Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {coordInputMode === "map" ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 font-medium">
                  💡 Click on the map to place perimeter vertices. The polygon automatically connects vertices and closes the perimeter.
                </p>
                {loadError ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Google Maps API Key Not Available
                    </p>
                    <p className="mt-1 text-slate-600">
                      Please use the <strong>Text / JSON</strong> mode above to enter or paste coordinate vertices.
                    </p>
                  </div>
                ) : !isLoaded ? (
                  <div className="h-[360px] bg-slate-100 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400">
                    <RefreshCw size={18} className="animate-spin text-amber-500 mr-2" />
                    Loading interactive map...
                  </div>
                ) : (
                  <div className="relative border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={12}
                      onClick={handleMapClick}
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                      options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                      }}
                    >
                      {/* Render markers for each clicked vertex */}
                      {formData.coordinates.map((pt, idx) => (
                        <Marker
                          key={`${idx}-${pt.lat}-${pt.lng}`}
                          position={pt}
                          label={{
                            text: String(idx + 1),
                            color: "#FFFFFF",
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}
                        />
                      ))}

                      {/* Render preview polygon if 3+ points */}
                      {formData.coordinates.length >= 3 && (
                        <Polygon
                          paths={formData.coordinates}
                          options={{
                            fillColor: "#DC2626",
                            fillOpacity: 0.35,
                            strokeColor: "#991B1B",
                            strokeOpacity: 0.9,
                            strokeWeight: 2.5,
                          }}
                        />
                      )}
                    </GoogleMap>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] text-slate-500">
                  Paste JSON array of [longitude, latitude] coordinate pairs, e.g. <code>[[85.11, 25.59], [85.15, 25.59], [85.13, 25.62]]</code>:
                </p>
                <textarea
                  rows={7}
                  value={formData.manualCoordsText}
                  onChange={(e) => handleManualCoordsChange(e.target.value)}
                  placeholder="[[85.1234, 25.5678], [85.1345, 25.5789], [85.1456, 25.5678]]"
                  className="w-full p-3 bg-slate-900 text-amber-400 font-mono text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || formData.coordinates.length < 3}
              className={cn(
                "flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95",
                isSaving || formData.coordinates.length < 3 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-800"
              )}
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} strokeWidth={3} />
              )}
              {isSaving ? "Saving..." : isEditing ? "Update Zone" : "Create Zone"}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmZone)}
        onClose={() => setDeleteConfirmZone(null)}
        title="Confirm Zone Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete delivery zone <strong>{deleteConfirmZone?.name}</strong>?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <strong>Data Integrity Safeguard:</strong> This zone will be deactivated and archived. Existing historical orders referencing this zone will preserve their pricing audit trail.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setDeleteConfirmZone(null)}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteZone}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeliveryZoneManager;
