import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, Database, User, Server } from 'lucide-react';
import { assetsApi } from '../lib/api';

const Assets: React.FC = () => {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.getAssets().then(res => res.data),
  });

  const filteredAssets = assets?.filter((asset: any) => {
    const matchesSearch = 
      asset.resourceId.toLowerCase().includes(search.toLowerCase()) ||
      asset.service.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = providerFilter === 'all' || asset.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 's3':
        return <Database className="h-5 w-5 text-blue-600" />;
      case 'iam':
        return <User className="h-5 w-5 text-green-600" />;
      default:
        return <Server className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
        <p className="text-gray-600 mt-2">View and manage cloud assets</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search assets..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 h-5 w-5" />
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="all">All Providers</option>
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">GCP</option>
                <option value="oci">OCI</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets?.map((asset: any) => {
          const latestFinding = asset.findings?.[0];
          const configCount = asset.configs?.length || 0;
          
          return (
            <Link
              key={asset.id}
              to={`/assets/${asset.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getServiceIcon(asset.service)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {asset.resourceId}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {asset.service} • {asset.region}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      asset.provider === 'aws'
                        ? 'bg-orange-100 text-orange-800'
                        : asset.provider === 'azure'
                        ? 'bg-blue-100 text-blue-800'
                        : asset.provider === 'gcp'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {asset.provider}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Configurations</p>
                    <p className="text-lg font-semibold">{configCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Latest Finding</p>
                    <div className="flex items-center space-x-1">
                      {latestFinding ? (
                        <>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              latestFinding.status === 'pass'
                                ? 'bg-green-500'
                                : latestFinding.status === 'fail'
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                            }`}
                          />
                          <span className="text-sm capitalize">
                            {latestFinding.status}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No findings</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Type: {asset.resourceType}</span>
                    <span>View Details →</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Assets;
