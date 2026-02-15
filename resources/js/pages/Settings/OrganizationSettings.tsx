import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useOrganizationUsers } from '../../hooks/useOrganizations';
import OrganizationApiKeys from '../../components/Organizations/OrganizationApiKeys';

export default function OrganizationSettings() {
    const { currentOrganization } = useAuth();
    const { createOrganization, updateOrganization } = useOrganizations();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [selectedTab, setSelectedTab] = useState<'info' | 'users' | 'api-keys'>('info');

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createOrganization(newOrgName);
            setNewOrgName('');
            setShowCreateModal(false);
        } catch (error) {
            alert('Failed to create organization');
        }
    };

    if (!currentOrganization) {
        return <div>No organization selected</div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Organization Settings</h2>
                <p className="text-gray-600 mt-1">Manage your organization details and team members</p>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="border-b border-gray-200">
                    <div className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setSelectedTab('info')}
                            className={`${
                                selectedTab === 'info'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Information
                        </button>
                        <button
                            onClick={() => setSelectedTab('users')}
                            className={`${
                                selectedTab === 'users'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Users
                        </button>
                        <button
                            onClick={() => setSelectedTab('api-keys')}
                            className={`${
                                selectedTab === 'api-keys'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            API Keys
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {selectedTab === 'info' && <OrganizationInfo organization={currentOrganization} onUpdate={updateOrganization} />}
                    {selectedTab === 'users' && <OrganizationUsers organizationId={currentOrganization.id} />}
                    {selectedTab === 'api-keys' && <OrganizationApiKeys organizationId={currentOrganization.id} />}
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Create New Organization
                </button>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Create New Organization</h3>
                        <form onSubmit={handleCreateOrganization}>
                            <input
                                type="text"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                placeholder="Organization Name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                            <div className="mt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrganizationInfo({ organization, onUpdate }: any) {
    const [name, setName] = useState(organization.name);
    const [editing, setEditing] = useState(false);

    const handleSave = async () => {
        try {
            await onUpdate(organization.id, { name });
            setEditing(false);
        } catch (error) {
            alert('Failed to update organization');
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                {editing ? (
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                            Save
                        </button>
                        <button onClick={() => setEditing(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-lg">{organization.name}</span>
                        <button onClick={() => setEditing(true)} className="text-blue-600 hover:text-blue-700">
                            Edit
                        </button>
                    </div>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Role</label>
                <span className="text-lg capitalize">{organization.role || organization.pivot?.role}</span>
            </div>
        </div>
    );
}

function OrganizationUsers({ organizationId }: { organizationId: number }) {
    const { users, loading, updateRole, removeUser } = useOrganizationUsers(organizationId);

    if (loading) {
        return <div>Loading users...</div>;
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Organization Members</h3>
            <div className="space-y-3">
                {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <select
                                value={user.organizations?.[0]?.pivot?.role || 'viewer'}
                                onChange={(e) => updateRole(user.id, e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="viewer">Viewer</option>
                            </select>
                            <button
                                onClick={() => removeUser(user.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
