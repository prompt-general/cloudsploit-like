import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, TestTube, Cloud } from 'lucide-react';
import { api } from '../lib/api';

interface CloudConfig {
  id: string;
  name: string;
  provider: 'aws' | 'azure' | 'gcp' | 'oci';
  credentials: {
    // AWS
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    // Azure
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    subscriptionId?: string;
    // GCP
    projectId?: string;
    keyFilename?: string;
    // Common
    status: 'connected' | 'disconnected' | 'error';
  };
  lastTested?: string;
  createdAt: string;
}

const Settings: React.FC = () => {
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['cloud-configs'],
    queryFn: () => api.get('/cloud-configs').then(res => res.data),
  });

  const testMutation = useMutation({
    mutationFn: (configId: string) => api.post(`/cloud-configs/${configId}/test`),
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (configId: string) => api.delete(`/cloud-configs/${configId}`),
    onSuccess: () => {
      refetch();
      setSelectedConfig('');
    },
  });

  const handleTestConnection = (configId: string) => {
    testMutation.mutate(configId);
  };

  const handleDeleteConfig = (configId: string) => {
    if (confirm('Are you sure you want to delete this cloud configuration?')) {
      deleteMutation.mutate(configId);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws':
        return '🟠';
      case 'azure':
        return '🔵';
      case 'gcp':
        return '🟢';
      case 'oci':
        return '🔴';
      default:
        return '☁️';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'aws':
        return 'text-orange-600';
      case 'azure':
        return 'text-blue-600';
      case 'gcp':
        return 'text-green-600';
      case 'oci':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cloud Configuration</h1>
        <p className="text-gray-600 mt-2">
          Manage cloud provider connections and credentials
        </p>
      </div>

      {/* Add New Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Cloud Connections</h2>
          <button
            onClick={() => setSelectedConfig('new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </button>
        </div>

        {/* Configuration List */}
        <div className="space-y-4">
          {configs?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Cloud className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Cloud Configurations</h3>
              <p className="text-sm">Add your first cloud provider connection to get started</p>
            </div>
          ) : (
            configs.map((config: CloudConfig) => (
              <div
                key={config.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedConfig === config.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedConfig(config.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getProviderIcon(config.provider)}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                      <p className={`text-sm font-medium ${getProviderColor(config.provider)}`}>
                        {config.provider.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {config.credentials.region || config.credentials.subscriptionId || config.credentials.projectId || 'No region'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        config.credentials.status === 'connected'
                          ? 'bg-green-100 text-green-800'
                          : config.credentials.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {config.credentials.status}
                    </span>
                    
                    {config.credentials.status === 'connected' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(config.id);
                        }}
                        disabled={testMutation.isPending}
                        className="p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        title="Test Connection"
                      >
                        <TestTube className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConfig(config.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Delete Configuration"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {config.lastTested && (
                  <div className="mt-3 text-xs text-gray-500">
                    Last tested: {new Date(config.lastTested).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Configuration Form Modal/Panel */}
      {selectedConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedConfig === 'new' ? 'Add Cloud Connection' : 'Edit Configuration'}
            </h2>
            <button
              onClick={() => setSelectedConfig('')}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Configure your cloud provider credentials. All sensitive data is encrypted and stored securely.
          </div>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cloud Provider</label>
            <div className="grid grid-cols-4 gap-4">
              {['aws', 'azure', 'gcp', 'oci'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    provider === 'aws'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : provider === 'azure'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : provider === 'gcp'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-red-500 bg-red-50 text-red-700'
                  }`}
                >
                  <span className="text-2xl mb-2">{getProviderIcon(provider)}</span>
                  <div className="text-sm font-medium">{provider.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-gray-500">
            <Save className="h-4 w-4 inline mr-2" />
            Configuration form would be implemented here
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
