'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';


// ── Types ────────────────────────────────────────────────────────────────────
interface UnifiedUser {
    id: string;
    email: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    role: 'IT_ADMIN' | 'ADMIN' | 'NUTRITIONIST' | 'COACH' | 'ATHLETE' | 'DASHBOARD';
    ics_role: string | null;
    ics_permissions: string[] | null;
    is_admin: boolean;
    is_nutritionist: boolean;
    is_it_admin: boolean;
    is_active: boolean;
    is_email_verified: boolean;
    has_nutritionist_profile: boolean;
    created_at: string;
    last_login: string | null;
    updated_at: string;
}

interface AuditLog {
    id: string;
    user_id: string;
    table_name: string;
    record_id: string;
    action: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    changed_on: string;
}

type View = 'list' | 'detail';

// ── Constants ────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
    IT_ADMIN: 'IT Admin',
    ADMIN: 'Admin',
    NUTRITIONIST: 'Nutritionist',
    COACH: 'Coach',
    ATHLETE: 'Athlete',
    DASHBOARD: 'Dashboard',
};

const ROLE_COLORS: Record<string, string> = {
    IT_ADMIN: 'bg-red-100 text-red-800',
    ADMIN: 'bg-purple-100 text-purple-800',
    NUTRITIONIST: 'bg-blue-100 text-blue-800',
    COACH: 'bg-green-100 text-green-800',
    ATHLETE: 'bg-yellow-100 text-yellow-800',
    DASHBOARD: 'bg-gray-100 text-gray-800',
};

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');

    // Normalize: PUT → PATCH (NOMS uses PATCH)
    const method = options.method === 'PUT' ? 'PATCH' : options.method;

    const res = await fetch(`/noms/api/admin${path}`, {
        ...options,
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
}

function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-SG', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function formatDateTime(dateString: string | null) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-SG', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function displayName(user: UnifiedUser) {
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function UnifiedUserManagementPage() {
    const { user, loading } = useAuth();
    const [view, setView] = useState<View>('list');
    const [selectedUser, setSelected] = useState<UnifiedUser | null>(null);

    const isITAdmin = user?.role === 'IT_ADMIN';
    const isAdmin = user?.role === 'ADMIN' || isITAdmin;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isAdmin) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">Admin access required.</p>
                </div>
            </DashboardLayout>
        );
    }

    if (view === 'detail' && selectedUser) {
        return (
            <DashboardLayout>
                <UserDetail
                    user={selectedUser}
                    isITAdmin={isITAdmin}
                    onBack={() => { setView('list'); setSelected(null); }}
                    onUpdated={() => { setView('list'); setSelected(null); }}
                    onDeleted={() => { setView('list'); setSelected(null); }}
                />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <UserList
                isITAdmin={isITAdmin}
                onSelect={user => { setSelected(user); setView('detail'); }}
            />
        </DashboardLayout>
    );
}

// ============================================================================
// USER LIST
// ============================================================================
function UserList({ isITAdmin, onSelect }: { isITAdmin: boolean; onSelect: (u: UnifiedUser) => void }) {
    const [users, setUsers] = useState<UnifiedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRole] = useState('');
    const [statusFilter, setStatus] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCreate, setCreate] = useState(false);

    const loadUsers = useCallback(async (q = search, r = roleFilter, s = statusFilter) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set('search', q.trim());
            if (r) params.set('role', r);
            if (s) params.set('is_active', s);
            const data = await apiFetch(`/users?${params}`);
            setUsers(data.users || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage users across AEMS, ICS and NOMS</p>
                </div>
                <button
                    onClick={() => setCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                    + Create User
                </button>
            </div>

            {/* Alerts */}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    {success}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Search name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadUsers(search, roleFilter, statusFilter)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    value={roleFilter}
                    onChange={e => { setRole(e.target.value); loadUsers(search, e.target.value, statusFilter); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Roles</option>
                    <option value="IT_ADMIN">IT Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="NUTRITIONIST">Nutritionist</option>
                    <option value="COACH">Coach</option>
                    <option value="ATHLETE">Athlete</option>
                    <option value="DASHBOARD">Dashboard</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={e => { setStatus(e.target.value); loadUsers(search, roleFilter, e.target.value); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>
                <button
                    onClick={() => loadUsers(search, roleFilter, statusFilter)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition"
                >
                    Search
                </button>
                {(search || roleFilter || statusFilter) && (
                    <button
                        onClick={() => { setSearch(''); setRole(''); setStatus(''); loadUsers('', '', ''); }}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-lg text-sm"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">NOMS Role</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">ICS Role</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-400">No users found</td>
                                </tr>
                            ) : users.map(user => (
                                <tr
                                    key={user.id}
                                    onClick={() => onSelect(user)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {displayName(user)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                                            {ROLE_LABELS[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{user.ics_role || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.last_login)}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                        {users.length} user{users.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <CreateUserModal
                    isITAdmin={isITAdmin}
                    onClose={() => setCreate(false)}
                    onSuccess={msg => {
                        setCreate(false);
                        setSuccess(msg || 'User created');
                        loadUsers();
                        setTimeout(() => setSuccess(''), 4000);
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// USER DETAIL
// ============================================================================
function UserDetail({
    user, isITAdmin, onBack, onUpdated, onDeleted,
}: {
    user: UnifiedUser;
    isITAdmin: boolean;
    onBack: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
}) {
    const [detail, setDetail] = useState<UnifiedUser | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [userRes, logsRes] = await Promise.all([
                    apiFetch(`/users/${user.id}`),
                    apiFetch(`/audit-logs?user_id=${user.id}&limit=30`),
                ]);
                setDetail(userRes.user);
                setAuditLogs(logsRes.logs || []);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                setLoading(false);
            }
        })();
    }, [user.id]);

    const handleDelete = async () => {
        if (!confirm(`Delete ${displayName(user)}? This cannot be undone.`)) return;
        try {
            await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
            onDeleted();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const canModify = isITAdmin || (detail && !['IT_ADMIN', 'ADMIN'].includes(detail.role));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="p-6">
                <p className="text-red-500">{error || 'User not found'}</p>
                <button onClick={onBack} className="mt-4 text-sm text-blue-600 hover:underline">← Back</button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-4 block">
                ← Back to users
            </button>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* User Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">User Details</h2>
                    <dl className="space-y-3">
                        {[
                            ['Name', displayName(detail)],
                            ['Email', detail.email],
                            ['NOMS Role', ROLE_LABELS[detail.role] || detail.role],
                            ['ICS Role', detail.ics_role || '—'],
                            ['Status', detail.is_active ? 'Active' : 'Inactive'],
                            ['Email Verified', detail.is_email_verified ? 'Yes' : 'No'],
                            ['Nutritionist Profile', detail.has_nutritionist_profile ? 'Yes' : 'No'],
                            ['Created', formatDateTime(detail.created_at)],
                            ['Last Login', formatDateTime(detail.last_login)],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-sm">
                                <dt className="text-gray-500">{label}</dt>
                                <dd className="text-gray-900 font-medium">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Role breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Flags</h2>
                    <dl className="space-y-3">
                        {[
                            ['is_it_admin', detail.is_it_admin],
                            ['is_admin', detail.is_admin],
                            ['is_nutritionist', detail.is_nutritionist],
                        ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between text-sm">
                                <dt className="text-gray-500 font-mono">{String(label)}</dt>
                                <dd>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                        {String(val)}
                                    </span>
                                </dd>
                            </div>
                        ))}
                        <div className="pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-400 mb-2">ICS Permissions ({detail.ics_permissions?.length || 0})</div>
                            <div className="flex flex-wrap gap-1">
                                {(detail.ics_permissions || []).slice(0, 6).map(p => (
                                    <span key={p} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p}</span>
                                ))}
                                {(detail.ics_permissions || []).length > 6 && (
                                    <span className="text-xs text-gray-400">+{(detail.ics_permissions || []).length - 6} more</span>
                                )}
                            </div>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Audit Log */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h2>
                {auditLogs.length === 0 ? (
                    <p className="text-sm text-gray-400">No audit records found</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {auditLogs.map(log => (
                            <div key={log.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded font-medium ${log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>{log.action}</span>
                                    <span className="text-gray-500 font-mono">{log.table_name}</span>
                                </div>
                                <span className="text-gray-400">{formatDateTime(log.changed_on)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                {canModify && (
                    <button
                        onClick={() => setShowEdit(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                    >
                        Edit User
                    </button>
                )}
                {isITAdmin && (
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition"
                    >
                        Delete User
                    </button>
                )}
                <button
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
                >
                    Cancel
                </button>
            </div>

            {showEdit && (
                <EditUserModal
                    user={detail}
                    isITAdmin={isITAdmin}
                    onClose={() => setShowEdit(false)}
                    onSuccess={async () => {
                        setShowEdit(false);
                        setSuccess('User updated');
                        // Reload detail
                        const res = await apiFetch(`/users/${user.id}`);
                        setDetail(res.user);
                        setTimeout(() => setSuccess(''), 4000);
                        onUpdated();
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// CREATE USER MODAL
// ============================================================================
function CreateUserModal({
    isITAdmin,
    onClose,
    onSuccess,
}: {
    isITAdmin: boolean;
    onClose: () => void;
    onSuccess: (msg?: string) => void;
}) {
    const [form, setForm] = useState({
        email: '', pin: '', first_name: '', last_name: '', role: 'DASHBOARD',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{6}$/.test(form.pin)) { setError('PIN must be exactly 6 digits'); return; }

        try {
            setLoading(true);
            await apiFetch('/users', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    // full_name: `${form.first_name} ${form.last_name}`.trim(),
                }),
            });
            onSuccess('User created successfully');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Create failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell title="Create User" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name *">
                        <input type="text" required value={form.first_name}
                            onChange={e => setForm({ ...form, first_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </Field>
                    <Field label="Last Name *">
                        <input type="text" required value={form.last_name}
                            onChange={e => setForm({ ...form, last_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </Field>
                </div>
                <Field label="Email *">
                    <input type="email" required value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </Field>
                <Field label="PIN (6 digits) *" hint="Used for AEMS and ICS login">
                    <input type="text" inputMode="numeric" maxLength={6} required value={form.pin}
                        onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                        placeholder="123456"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </Field>
                <Field label="Role *">
                    <select value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="DASHBOARD">Dashboard</option>
                        <option value="NUTRITIONIST">Nutritionist</option>
                        {isITAdmin && <option value="ADMIN">Admin</option>}
                        {isITAdmin && <option value="IT_ADMIN">IT Admin</option>}
                    </select>
                </Field>
                <ModalActions onCancel={onClose} loading={loading} submitLabel="Create User" />
            </form>
        </ModalShell>
    );
}

// ============================================================================
// EDIT USER MODAL
// ============================================================================
function EditUserModal({
    user, isITAdmin, onClose, onSuccess,
}: {
    user: UnifiedUser;
    isITAdmin: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email,
        pin: '',
        role: user.role,
        is_active: user.is_active,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (form.pin && !/^\d{6}$/.test(form.pin)) { setError('PIN must be 6 digits'); return; }

        const updates: Record<string, unknown> = {
            first_name: form.first_name,
            last_name: form.last_name,
            // full_name: `${form.first_name} ${form.last_name}`.trim(),
            email: form.email,
            is_active: form.is_active,
        };
        if (isITAdmin) updates.role = form.role;
        if (form.pin) updates.pin = form.pin;

        try {
            setLoading(true);
            await apiFetch(`/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
            onSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell title="Edit User" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name">
                        <input type="text" value={form.first_name}
                            onChange={e => setForm({ ...form, first_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </Field>
                    <Field label="Last Name">
                        <input type="text" value={form.last_name}
                            onChange={e => setForm({ ...form, last_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </Field>
                </div>
                <Field label="Email *">
                    <input type="email" required value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </Field>
                <Field label="New PIN" hint="Leave blank to keep current">
                    <input type="text" inputMode="numeric" maxLength={6} value={form.pin}
                        onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                        placeholder="Leave blank to keep"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </Field>
                <Field label="Status">
                    <div className="flex gap-4">
                        {[true, false].map(val => (
                            <label key={String(val)} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_active" checked={form.is_active === val}
                                    onChange={() => setForm({ ...form, is_active: val })}
                                    className="text-blue-600"
                                />
                                <span className={val ? 'text-green-700' : 'text-red-700'}>
                                    {val ? 'Active' : 'Inactive'}
                                </span>
                            </label>
                        ))}
                    </div>
                </Field>
                {isITAdmin ? (
                    <Field label="Role" hint="Updating role syncs AEMS and ICS access automatically">
                        <select value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value as UnifiedUser['role'] })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="DASHBOARD">Dashboard</option>
                            <option value="NUTRITIONIST">Nutritionist</option>
                            <option value="ADMIN">Admin</option>
                            <option value="IT_ADMIN">IT Admin</option>
                        </select>
                    </Field>
                ) : (
                    <Field label="Role" hint="Only IT Admins can change roles">
                        <input type="text" value={ROLE_LABELS[form.role] || form.role} disabled
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
                        />
                    </Field>
                )}
                <ModalActions onCancel={onClose} loading={loading} submitLabel="Save Changes" />
            </form>
        </ModalShell>
    );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

function ModalActions({ onCancel, loading, submitLabel }: { onCancel: () => void; loading: boolean; submitLabel: string }) {
    return (
        <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition disabled:opacity-50"
            >
                Cancel
            </button>
            <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50"
            >
                {loading ? 'Saving...' : submitLabel}
            </button>
        </div>
    );
}