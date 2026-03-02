import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizations, useOrganizationUsers } from '../../hooks/useOrganizations';
import OrganizationApiKeys from '../../components/Organizations/OrganizationApiKeys';
import api from '../../lib/axios';

const ROLES = [
    { value: 'owner', label: 'Owner', description: 'Full access including billing and deletion', color: 'purple' },
    { value: 'admin', label: 'Admin', description: 'Manage users, vehicles and settings', color: 'blue' },
    { value: 'manager', label: 'Manager', description: 'View and edit vehicles and trackers', color: 'green' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access to tracking data', color: 'gray' },
] as const;

type Role = typeof ROLES[number]['value'];

export default function OrganizationSettings() {
    const { currentOrganization, setCurrentOrganization, user } = useAuth();
    const { createOrganization, updateOrganization } = useOrganizations();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [selectedTab, setSelectedTab] = useState<'info' | 'users' | 'api-keys' | 'danger'>('info');

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createOrganization(newOrgName);
            setNewOrgName('');
            setShowCreateModal(false);
            toast.success('Organization created successfully');
        } catch {
            toast.error('Failed to create organization');
        }
    };

    if (!currentOrganization) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">🏢</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No organization selected</h3>
                <p className="text-gray-500 mb-4">Create an organization to get started.</p>
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Create Organization
                </button>
            </div>
        );
    }

    const myRole = currentOrganization.role || currentOrganization.pivot?.role;
    const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

    const tabs = [
        { id: 'info', label: 'Information' },
        { id: 'users', label: 'Members' },
        { id: 'api-keys', label: 'API Keys' },
        ...(myRole === 'owner' ? [{ id: 'danger', label: 'Danger Zone' }] : []),
    ] as const;

    return (
        <div>
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Organization Settings</h2>
                    <p className="text-gray-600 mt-1">Manage your organization details and team members</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                    + New Organization
                </button>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="border-b border-gray-200">
                    <div className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setSelectedTab(tab.id as any)}
                                className={`${selectedTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${tab.id === 'danger' ? 'text-red-500 hover:text-red-600' : ''}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {selectedTab === 'info' && <OrganizationInfo organization={currentOrganization} myRole={myRole} onUpdate={updateOrganization} onUpdated={setCurrentOrganization} />}
                    {selectedTab === 'users' && <OrganizationUsers organizationId={currentOrganization.id} myRole={myRole} />}
                    {selectedTab === 'api-keys' && <OrganizationApiKeys organizationId={currentOrganization.id} />}
                    {selectedTab === 'danger' && <DangerZone organization={currentOrganization} />}
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Create New Organization</h3>
                        <form onSubmit={handleCreateOrganization}>
                            <input type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)}
                                placeholder="Organization Name" className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                            <div className="mt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrganizationInfo({ organization, myRole, onUpdate, onUpdated }: any) {
    const [name, setName] = useState(organization.name);
    const [description, setDescription] = useState(organization.description || '');
    const [timezone, setTimezone] = useState(organization.timezone || '');
    const [speedUnit, setSpeedUnit] = useState<'mph' | 'kmh'>(organization.settings?.speed_unit || 'mph');
    const [saving, setSaving] = useState(false);

    const canEdit = myRole === 'owner' || myRole === 'admin';

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await onUpdate(organization.id, {
                name,
                description: description || null,
                timezone: timezone || null,
                settings: { speed_unit: speedUnit },
            });
            onUpdated?.(updated);
            toast.success('Organization settings saved');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const roleBadge = ROLES.find(r => r.value === myRole);

    return (
        <div className="space-y-6 max-w-lg">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Your role in this organization</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-${roleBadge?.color ?? 'gray'}-100 text-${roleBadge?.color ?? 'gray'}-700 capitalize`}>
                    {roleBadge?.label ?? myRole}
                </span>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                {canEdit ? (
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                ) : (
                    <p className="text-gray-900">{name}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {canEdit ? (
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                        placeholder="Optional description for this organization..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none" />
                ) : (
                    <p className="text-gray-600 text-sm">{description || '—'}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                {canEdit ? (
                    <input value={timezone} onChange={e => setTimezone(e.target.value)}
                        placeholder="e.g. Europe/London, America/New_York"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                ) : (
                    <p className="text-gray-600 text-sm">{timezone || '—'}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Speed Unit</label>
                <div className="flex items-center space-x-4">
                    {(['mph', 'kmh'] as const).map(unit => (
                        <label key={unit} className={`flex items-center space-x-2 ${canEdit ? 'cursor-pointer' : ''}`}>
                            <input type="radio" name="speed_unit" value={unit} checked={speedUnit === unit}
                                onChange={() => canEdit && setSpeedUnit(unit)} disabled={!canEdit} className="text-blue-600" />
                            <span className="text-sm">{unit === 'mph' ? 'MPH (miles per hour)' : 'KM/H (kilometres per hour)'}</span>
                        </label>
                    ))}
                </div>
            </div>

            {canEdit && (
                <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            )}
        </div>
    );
}

function OrganizationUsers({ organizationId, myRole }: { organizationId: number; myRole: string }) {
    const { users, loading, updateRole, removeUser, addUser } = useOrganizationUsers(organizationId);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('viewer');
    const [inviteSearchResult, setInviteSearchResult] = useState<{ id: number; name: string; email: string; already_member: boolean } | null>(null);
    const [inviteSearching, setInviteSearching] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<any>(null);

    const canManage = myRole === 'owner' || myRole === 'admin';

    const searchUser = async () => {
        if (!inviteEmail) return;
        setInviteSearching(true);
        setInviteSearchResult(null);
        try {
            const { data } = await api.get(`/organizations/${organizationId}/users/search`, { params: { email: inviteEmail } });
            setInviteSearchResult(data);
        } catch (err: any) {
            if (err.response?.status === 404) {
                toast.error('No user found with that email address.');
            } else {
                toast.error('Search failed');
            }
        } finally {
            setInviteSearching(false);
        }
    };

    const handleAddUser = async () => {
        if (!inviteSearchResult || inviteSearchResult.already_member) return;
        try {
            await addUser(inviteSearchResult.id, inviteRole);
            toast.success(`${inviteSearchResult.name} added as ${inviteRole}`);
            setShowInvite(false);
            setInviteEmail('');
            setInviteSearchResult(null);
        } catch {
            toast.error('Failed to add user');
        }
    };

    const handleUpdateRole = async (userId: number, role: string) => {
        try {
            await updateRole(userId, role);
            toast.success('Role updated');
        } catch {
            toast.error('Failed to update role');
        }
    };

    const handleRemove = async () => {
        if (!confirmRemove) return;
        try {
            await removeUser(confirmRemove.id);
            toast.success(`${confirmRemove.name} removed`);
            setConfirmRemove(null);
        } catch {
            toast.error('Failed to remove user');
        }
    };

    if (loading) return <div className="text-gray-500 text-sm">Loading members…</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Members <span className="text-sm font-normal text-gray-500">({users.length})</span></h3>
                {canManage && (
                    <button onClick={() => setShowInvite(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700">
                        + Add Member
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {users.map(user => {
                    const userRole: Role = user.organizations?.[0]?.pivot?.role || user.pivot?.role || 'viewer';
                    const roleMeta = ROLES.find(r => r.value === userRole);
                    return (
                        <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div>
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{roleMeta?.description}</div>
                            </div>
                            <div className="flex items-center space-x-3">
                                {canManage ? (
                                    <select value={userRole} onChange={e => handleUpdateRole(user.id, e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm">
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${roleMeta?.color ?? 'gray'}-100 text-${roleMeta?.color ?? 'gray'}-700`}>
                                        {roleMeta?.label ?? userRole}
                                    </span>
                                )}
                                {canManage && userRole !== 'owner' && (
                                    <button onClick={() => setConfirmRemove(user)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Member Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Add Member by Email</h3>
                        <div className="flex gap-2 mb-4">
                            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchUser()}
                                placeholder="user@example.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                            <button onClick={searchUser} disabled={inviteSearching}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm disabled:opacity-50">
                                {inviteSearching ? '…' : 'Search'}
                            </button>
                        </div>

                        {inviteSearchResult && (
                            <div className={`p-3 rounded-lg mb-4 ${inviteSearchResult.already_member ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                                <div className="font-medium text-gray-900">{inviteSearchResult.name}</div>
                                <div className="text-sm text-gray-600">{inviteSearchResult.email}</div>
                                {inviteSearchResult.already_member && <div className="text-xs text-yellow-700 mt-1">Already a member of this organization.</div>}
                            </div>
                        )}

                        {inviteSearchResult && !inviteSearchResult.already_member && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteSearchResult(null); }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            {inviteSearchResult && !inviteSearchResult.already_member && (
                                <button onClick={handleAddUser} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Member</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Confirm Modal */}
            {confirmRemove && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-2">Remove Member</h3>
                        <p className="text-gray-600 mb-4">Remove <strong>{confirmRemove.name}</strong> from this organization?</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmRemove(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleRemove} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DangerZone({ organization }: any) {
    const { updateOrganization, deleteOrganization } = useOrganizations();
    const { setCurrentOrganization } = useAuth();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== organization.name) return;
        setDeleting(true);
        try {
            await deleteOrganization(organization.id);
            toast.success('Organization deleted');
            window.location.href = '/';
        } catch {
            toast.error('Failed to delete organization');
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="border border-red-200 rounded-lg p-5">
                <h4 className="text-base font-semibold text-red-700 mb-1">Delete Organization</h4>
                <p className="text-sm text-gray-600 mb-4">
                    Permanently delete <strong>{organization.name}</strong> and all its data including vehicles, trackers, trips and locations.
                    This action cannot be undone.
                </p>
                <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                    Delete Organization
                </button>
            </div>

            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Delete Organization</h3>
                        <p className="text-gray-600 mb-4">Type <strong>{organization.name}</strong> to confirm deletion.</p>
                        <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                            placeholder={organization.name} className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setConfirmDelete(false); setConfirmText(''); }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleDelete} disabled={confirmText !== organization.name || deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-40">
                                {deleting ? 'Deleting…' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
