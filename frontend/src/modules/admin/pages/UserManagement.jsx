import React, { useState, useEffect, useMemo } from 'react';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import Badge from '@shared/components/ui/Badge';
import Modal from '@shared/components/ui/Modal';
import { useToast } from '@shared/components/ui/Toast';
import { useAuth } from '@core/context/AuthContext';
import { adminApi } from '../services/adminApi';
import {
    ShieldCheck,
    UserPlus,
    UserCheck,
    UserX,
    Lock,
    Mail,
    Phone,
    User,
    RotateCw,
    AlertTriangle,
    KeyRound
} from 'lucide-react';

const ROLE_OPTIONS = [
    { value: 'super_admin', label: 'Super Admin', description: 'Full platform access including staff, finance & settings' },
    { value: 'order_manager', label: 'Order Manager', description: 'Order processing, customer support, and order refunds' },
    { value: 'inventory_manager', label: 'Inventory Manager', description: 'Product catalog, categories, stock, and moderation' },
    { value: 'delivery_manager', label: 'Delivery Manager', description: 'Driver fleet, order dispatch, and cash collection' },
    { value: 'marketing_manager', label: 'Marketing Manager', description: 'Coupons, promotions, banners, and push alerts' },
];

const ROLE_BADGE_VARIANTS = {
    super_admin: { label: 'Super Admin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    admin: { label: 'Super Admin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    order_manager: { label: 'Order Manager', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
    inventory_manager: { label: 'Inventory Manager', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    delivery_manager: { label: 'Delivery Manager', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    marketing_manager: { label: 'Marketing Manager', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const UserManagement = () => {
    const { user: currentAdmin } = useAuth();
    const { showToast } = useToast();

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'order_manager',
    });

    const [editForm, setEditForm] = useState({
        role: 'order_manager',
        isActive: true,
    });

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const { data } = await adminApi.getStaff();
            if (data?.success) {
                setStaffList(data.result || []);
            }
        } catch (error) {
            console.error('Failed to fetch staff members:', error);
            showToast(error.response?.data?.message || 'Failed to load staff list', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleOpenCreateModal = () => {
        setCreateForm({
            name: '',
            email: '',
            phone: '',
            password: '',
            role: 'order_manager',
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
            showToast('Please provide name, email and initial password', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const { data } = await adminApi.createStaff(createForm);
            if (data?.success) {
                showToast('New staff member onboarded successfully', 'success');
                setIsCreateModalOpen(false);
                fetchStaff();
            }
        } catch (error) {
            console.error('Error creating staff:', error);
            showToast(error.response?.data?.message || 'Failed to onboard staff member', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEditModal = (staff) => {
        setSelectedStaff(staff);
        setEditForm({
            role: staff.normalizedRole || staff.role || 'order_manager',
            isActive: staff.isActive !== false,
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateRoleAndStatus = async (e) => {
        e.preventDefault();
        if (!selectedStaff) return;

        try {
            setSubmitting(true);
            // Update role if changed
            if (editForm.role !== selectedStaff.role && editForm.role !== selectedStaff.normalizedRole) {
                await adminApi.updateStaffRole(selectedStaff._id, { role: editForm.role });
            }
            // Update active status if changed
            if (editForm.isActive !== selectedStaff.isActive) {
                await adminApi.toggleStaffStatus(selectedStaff._id, { isActive: editForm.isActive });
            }

            showToast('Staff member details updated successfully', 'success');
            setIsEditModalOpen(false);
            setSelectedStaff(null);
            fetchStaff();
        } catch (error) {
            console.error('Error updating staff member:', error);
            showToast(error.response?.data?.message || 'Failed to update staff member', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const isCurrentLoggedInUser = (staff) => {
        if (!currentAdmin || !staff) return false;
        const currentId = currentAdmin._id || currentAdmin.id;
        return String(currentId) === String(staff._id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="admin-h1 flex items-center gap-3">
                        Platform Staff & RBAC
                        <span className="p-1.5 bg-indigo-100 rounded-xl">
                            <ShieldCheck className="h-5 w-5 text-indigo-600" />
                        </span>
                    </h1>
                    <p className="admin-description mt-1">
                        Manage administrative roles and configure department access permissions.
                    </p>
                </div>
                <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Onboard Staff Member
                </Button>
            </div>

            <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="ds-table-header-cell text-slate-500">Staff Member</th>
                                <th className="ds-table-header-cell text-slate-500">Role</th>
                                <th className="ds-table-header-cell text-slate-500">Contact</th>
                                <th className="ds-table-header-cell text-slate-500">Status</th>
                                <th className="ds-table-header-cell text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RotateCw className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Loading Staff Directory...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : staffList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                        No staff members found.
                                    </td>
                                </tr>
                            ) : (
                                staffList.map((staff) => {
                                    const badgeInfo = ROLE_BADGE_VARIANTS[staff.role] || ROLE_BADGE_VARIANTS.order_manager;
                                    const isSelf = isCurrentLoggedInUser(staff);

                                    return (
                                        <tr key={staff._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-sm">
                                                        {staff.name ? staff.name[0].toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900 text-sm">{staff.name || 'Staff'}</p>
                                                            {isSelf && (
                                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400">{staff.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badgeInfo.color}`}>
                                                    {badgeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                                {staff.phone || '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {staff.isActive !== false ? (
                                                    <Badge variant="success">Active</Badge>
                                                ) : (
                                                    <Badge variant="danger">Deactivated</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleOpenEditModal(staff)}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-primary-600 hover:bg-primary-50 transition-all"
                                                >
                                                    Manage Role
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Staff Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Onboard New Staff Member"
            >
                <form onSubmit={handleCreateStaff} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" /> Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={createForm.name}
                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                            placeholder="e.g. Ramesh Kumar"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={createForm.email}
                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            placeholder="ramesh@meatyns.com"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone Number (Optional)
                        </label>
                        <input
                            type="tel"
                            value={createForm.phone}
                            onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                            placeholder="+91 9876543210"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <KeyRound className="h-3.5 w-3.5 text-slate-400" /> Initial Password
                        </label>
                        <input
                            type="password"
                            required
                            value={createForm.password}
                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            placeholder="Minimum 6 characters"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Department Role
                        </label>
                        <select
                            value={createForm.role}
                            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                            {ROLE_OPTIONS.find((r) => r.value === createForm.role)?.description}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Creating Staff...' : 'Onboard Staff'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Staff Role Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStaff(null);
                }}
                title={selectedStaff ? `Manage ${selectedStaff.name}` : 'Manage Staff Member'}
            >
                {selectedStaff && (
                    <form onSubmit={handleUpdateRoleAndStatus} className="space-y-5">
                        {isCurrentLoggedInUser(selectedStaff) && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Protected Account:</strong> You are currently logged in as this administrator. Role self-demotion and account self-deactivation are restricted.
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Staff Role</label>
                            <select
                                value={editForm.role}
                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                disabled={isCurrentLoggedInUser(selectedStaff)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {ROLE_OPTIONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1 italic">
                                {ROLE_OPTIONS.find((r) => r.value === editForm.role)?.description}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Account Active Status</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="isActive"
                                        checked={editForm.isActive === true}
                                        onChange={() => setEditForm({ ...editForm, isActive: true })}
                                        disabled={isCurrentLoggedInUser(selectedStaff)}
                                        className="h-4 w-4 text-primary"
                                    />
                                    Active
                                </label>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="isActive"
                                        checked={editForm.isActive === false}
                                        onChange={() => setEditForm({ ...editForm, isActive: false })}
                                        disabled={isCurrentLoggedInUser(selectedStaff)}
                                        className="h-4 w-4 text-red-600"
                                    />
                                    Deactivated
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setSelectedStaff(null);
                                }}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || isCurrentLoggedInUser(selectedStaff)}
                            >
                                {submitting ? 'Saving Changes...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default UserManagement;
