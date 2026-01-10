import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  History, 
  TrendingUp, 
  Shield, 
  RefreshCw,
  ArrowUpDown,
  Clock
} from 'lucide-react';
import { api } from '../../lib/api';
import DriftTimeline from '../../components/drift/DriftTimeline';
import DriftSeverityChart from '../../components/drift/DriftSeverityChart';
import RecentDriftsTable from '../../components/drift/RecentDriftsTable';

const DriftDashboard: React.FC = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['drift-summary'],
    queryFn: () => api.get('/drift/summary').then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: assetsWithDrift } = useQuery({
    queryKey: ['assets-with-drift'],
    queryFn: () => api.get('/drift/assets/with-drift').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = summary?.statistics || { totalDrifts: 0, byType: {}, bySeverity: {} };
  const recentDrifts = summary?.recentDrifts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Drift Detection Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor configuration changes and detect drift from approved baselines
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Drifts (24h)</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalDrifts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Severity</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.bySeverity?.high || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <RefreshCw className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Assets with Drift</p>
              <p className="text-2xl font-semibold text-gray-900">{assetsWithDrift?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Compliance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {assetsWithDrift ? 
                  `${Math.round(((assetsWithDrift.length || 0) / (assetsWithDrift.length || 1)) * 100)}%` : 
                  '100%'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drift Severity Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Drift Severity Distribution</h3>
          <div className="h-64">
            <DriftSeverityChart data={stats} />
          </div>
        </div>

        {/* Drift Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Drift Timeline</h3>
          <div className="h-64 overflow-y-auto">
            <DriftTimeline drifts={recentDrifts.slice(0, 5)} />
          </div>
        </div>
      </div>

      {/* Assets with Recent Drift */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Assets with Recent Drift</h3>
            <Link 
              to="/drift/assets" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Drift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drift Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Baseline Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assetsWithDrift?.slice(0, 5).map((assetData: any) => (
                <tr key={assetData.asset.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ArrowUpDown className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {assetData.asset.resourceId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assetData.asset.service} • {assetData.asset.region}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {new Date(assetData.latestDrift.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(assetData.latestDrift.detectedAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      {assetData.driftCount} drifts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {assetData.baseline ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Baseline set
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        No baseline
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/drift/assets/${assetData.asset.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View Details
                    </Link>
                    <button className="text-gray-600 hover:text-gray-900">
                      Set Baseline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Drifts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Drift Events</h3>
            <Link 
              to="/drift/events" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
        </div>
        <RecentDriftsTable drifts={recentDrifts.slice(0, 10)} />
      </div>
    </div>
  );
};

export default DriftDashboard;
