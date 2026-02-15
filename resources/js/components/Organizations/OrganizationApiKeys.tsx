import { useState, useEffect } from 'react';
import api from '@/lib/axios';

interface ApiKey {
    id: number;
    name: string;
    prefix: string;
    last_used_at: string | null;
    created_at: string;
    creator: {
        id: number;
        name: string;
    };
}

interface OrganizationApiKeysProps {
    organizationId: number;
}

export default function OrganizationApiKeys({ organizationId }: OrganizationApiKeysProps) {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyPrefix, setNewKeyPrefix] = useState('trk_live_');
    const [generatedKey, setGeneratedKey] = useState('');

    useEffect(() => {
        loadApiKeys();
    }, [organizationId]);

    const loadApiKeys = async () => {
        try {
            const response = await api.get(`/organizations/${organizationId}/api-keys`);
            setApiKeys(response.data.data);
        } catch (error) {
            console.error('Failed to load API keys:', error);
            alert('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post(`/organizations/${organizationId}/api-keys`, {
                name: newKeyName,
                prefix: newKeyPrefix,
            });

            setGeneratedKey(response.data.plain_key);
            setShowCreateModal(false);
            setShowKeyModal(true);
            setNewKeyName('');
            setNewKeyPrefix('trk_live_');
            loadApiKeys();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create API key');
        }
    };

    const handleRevokeKey = async (keyId: number, keyName: string) => {
        if (!confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/organizations/${organizationId}/api-keys/${keyId}`);
            alert('API key revoked successfully');
            loadApiKeys();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to revoke API key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('API key copied to clipboard!');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return <div className="text-center py-8">Loading API keys...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Manage API keys for GPS trackers and mobile apps
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                    Generate New Key
                </button>
            </div>

            {apiKeys.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new API key.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {apiKeys.map((key) => (
                        <div
                            key={key.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    <div className="font-medium text-gray-900">{key.name}</div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {key.prefix.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-500">
                                    Created by {key.creator.name} on {formatDate(key.created_at)}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Last used: {formatDate(key.last_used_at)}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRevokeKey(key.id, key.name)}
                                className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Key Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Generate New API Key</h3>
                        <form onSubmit={handleCreateKey} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Key Name
                                </label>
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="e.g., Mobile App, Production Trackers"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Give this key a descriptive name to help you identify it later
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Key Type
                                </label>
                                <select
                                    value={newKeyPrefix}
                                    onChange={(e) => setNewKeyPrefix(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="trk_live_">Live (trk_live_)</option>
                                    <option value="trk_test_">Test (trk_test_)</option>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Live keys for production, test keys for development
                                </p>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ The API key will be shown only once. Make sure to copy and save it securely.
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewKeyName('');
                                        setNewKeyPrefix('trk_live_');
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Generate Key
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Show Generated Key Modal */}
            {showKeyModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <div className="flex items-center mb-4">
                            <svg
                                className="h-6 w-6 text-green-600 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <h3 className="text-lg font-semibold">API Key Created Successfully</h3>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                            <p className="text-sm font-medium text-red-800 mb-2">
                                ⚠️ Important: Copy this key now!
                            </p>
                            <p className="text-sm text-red-700">
                                For security reasons, you won't be able to see this key again. Store it somewhere safe.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                                YOUR API KEY
                            </label>
                            <div className="flex items-center space-x-2">
                                <code className="flex-1 text-sm font-mono bg-white px-3 py-2 border border-gray-300 rounded overflow-x-auto">
                                    {generatedKey}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(generatedKey)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm whitespace-nowrap"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                            <p className="font-medium mb-2">How to use this key:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Mobile App: Enter during organization selection</li>
                                <li>GPS Device: Send in X-API-Key header</li>
                                <li>API Request: Include as <code className="bg-gray-100 px-1">X-API-Key</code> header</li>
                            </ul>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setShowKeyModal(false);
                                    setGeneratedKey('');
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                I've Saved the Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
