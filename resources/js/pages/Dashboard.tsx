import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { t } = useTranslation();

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('dashboard.title')}</h2>
            <p className="text-gray-600">
                {t('dashboard.welcome')}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900">Vehicles</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">-</p>
                    <p className="text-sm text-blue-700 mt-1">Total tracked vehicles</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-900">Active Now</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">-</p>
                    <p className="text-sm text-green-700 mt-1">Currently moving</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-900">Trips Today</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-2">-</p>
                    <p className="text-sm text-purple-700 mt-1">Completed trips</p>
                </div>
            </div>
        </div>
    );
}
