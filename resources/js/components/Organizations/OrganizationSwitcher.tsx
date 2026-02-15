import { useAuth } from '../../contexts/AuthContext';

export default function OrganizationSwitcher() {
    const { user, currentOrganization, setCurrentOrganization } = useAuth();

    // Only show if user has multiple organizations
    if (!user || !user.organizations || user.organizations.length <= 1) {
        return null;
    }

    return (
        <div className="relative inline-block text-left">
            <select
                value={currentOrganization?.id || ''}
                onChange={(e) => {
                    const org = user.organizations.find((o) => o.id === parseInt(e.target.value));
                    if (org) setCurrentOrganization(org);
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
                {user.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                        {org.name} ({org.role})
                    </option>
                ))}
            </select>
        </div>
    );
}
