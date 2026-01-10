import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  History, 
  Shield, 
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  GitCompare,
  Calendar
} from 'lucide-react';
import { api } from '../../lib/api';
import ConfigDiffViewer from '../../components/drift/ConfigDiffViewer';
import BaselineHistory from '../../components/drift/BaselineHistory';
import DriftTimelineChart from '../../components/drift/DriftTimelineChart';

const AssetDrift: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'baselines' | 'compare'>('overview');

  const { data: assetData, isLoading: assetLoading } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => api.get(`/assets/${assetId}`).then(res => res.data),
  });

  const { data: driftStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['asset-drift-status', assetId],
    queryFn: () => api.get(`/drift/asset/${assetId}`).then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['asset-drift-timeline', assetId],
    queryFn: () => api.get(`/drift/asset/${assetId}/timeline?days=30`).then(res => res.data),
  });

  const setBaselineMutation = useMutation({
    mutationFn: (data: any) => api.post('/drift/baseline', data),
    onSuccess: () => {
      // Refresh data
      window.location.reload();
    },
  });

  const revertMutation = useMutation({
    mutationFn: (baselineId: string) => 
      api.post(`/drift/revert/${assetId}/${baselineId}`),
    onSuccess: (data) => {
      alert(`Revert instructions:\n\n${JSON.stringify(data, null, 2)}`);
    },
  });

  const handleSetBaseline = () => {
    const comment = prompt('Enter comment for baseline (optional):');
    const tagsInput = prompt('Enter tags (comma-separated, optional):');
    
    if (driftStatus?.latestConfig?.id) {
      setBaselineMutation.mutate({
        assetId,
        configId: driftStatus.latestConfig.id,
        approvedBy: 'user', // In real app, get from auth
        comment: comment || undefined,
        tags: tagsInput ? tagsInput.split(',').map(t => t.trim()) : undefined,
      });
    }
  };

  const handleRevert = (baselineId: string) => {
    if (confirm('Are you sure you want to revert to this baseline?')) {
      revertMutation.mutate(baselineId);
    }
  };

  const asset = assetData;
  const status = driftStatus;
  const timeline = timelineData?.timeline || [];

  const hasBaseline = status?.baseline;
  const isInCompliance = status?.inCompliance;
  const latestDrift = status?.recentDrifts?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/drift/assets" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Assets
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {asset?.resourceId}
          </h1>
          <div className="flex items-center space-x-4 mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {asset?.service}
            </span>
            <span className="text-gray-600">{asset?.region}</span>
            <span className="text-gray-600">Type: {asset?.resourceType}</span>
          </div>
        </div>
        <div className="flex space-x-3">
          {!hasBaseline && (
            <button
              onClick={handleSetBaseline}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Set Baseline
            </button>
          )}
          {hasBaseline && !isInCompliance && (
            <button
              onClick={() => handleRevert(status.baseline.id)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Revert to Baseline
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Compliance Status */}
        <div className={`rounded-lg shadow p-6 ${
          isInCompliance ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${isInCompliance ? 'bg-green-100' : 'bg-red-100'}`}>
              {isInCompliance ? (
                <Shield className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Status</p>
              <p className={`text-2xl font-semibold ${isInCompliance ? 'text-green-900' : 'text-red-900'}`}>
                {isInCompliance ? 'In Compliance' : 'Out of Compliance'}
              </p>
            </div>
          </div>
          {!isInCompliance && latestDrift && (
            <div className="mt-4 text-sm text-red-700">
              Last drift: {new Date(latestDrift.detectedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Baseline Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Baseline Status</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hasBaseline ? 'Established' : 'Not Set'}
              </p>
            </div>
          </div>
          {hasBaseline && (
            <div className="mt-4 text-sm text-gray-600">
              Set by: {status.baseline.approvedBy}
              <br />
              On: {new Date(status.baseline.approvedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Drift History */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Drift Events (30d)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {status?.recentDrifts?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('baselines')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'baselines'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Baselines
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compare'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Compare
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current Drift Analysis */}
            {status?.driftAnalysis?.driftDetected && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Drift Analysis</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Change Type:</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {status.driftAnalysis.driftEvent?.changeType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Severity:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        status.driftAnalysis.driftEvent?.severity === 'high' ? 'bg-red-100 text-red-800' :
                          status.driftAnalysis.driftEvent?.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                        {status.driftAnalysis.driftEvent?.severity}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Summary:</span>
                      <p className="mt-1 text-sm text-gray-600">
                        {status.driftAnalysis.driftEvent?.summary}
                      </p>
                    </div>
                    {status.driftAnalysis.driftEvent?.affectedPaths && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Affected Paths:</span>
                        <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                          {status.driftAnalysis.driftEvent.affectedPaths.slice(0, 5).map((path: string, idx: number) => (
                            <li key={idx}>{path}</li>
                          ))}
                          {status.driftAnalysis.driftEvent.affectedPaths.length > 5 && (
                            <li>...and {status.driftAnalysis.driftEvent.affectedPaths.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Comparison */}
            {status?.driftAnalysis?.driftDetected && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Differences</h3>
                </div>
                <div className="p-6">
                  <ConfigDiffViewer 
                    oldConfig={status.driftAnalysis.baselineConfig?.rawConfig}
                    newConfig={status.driftAnalysis.currentConfig?.rawConfig}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Drift Timeline (Last 30 Days)</h3>
            <div className="h-96 overflow-y-auto">
              <DriftTimelineChart timeline={timeline} />
            </div>
          </div>
        )}

        {activeTab === 'baselines' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Baseline History</h3>
            <BaselineHistory assetId={assetId!} />
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Compare Configurations</h3>
            <p className="text-gray-600 mb-4">
              Select two configurations to compare. This helps identify exactly what changed between scans.
            </p>
            
            {asset?.configs && asset.configs.length >= 2 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Configuration
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      {asset.configs.map((config: any) => (
                        <option key={config.id} value={config.id}>
                          {new Date(config.collectedAt).toLocaleString()} ({config.configHash.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Second Configuration
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      {asset.configs.map((config: any) => (
                        <option key={config.id} value={config.id}>
                          {new Date(config.collectedAt).toLocaleString()} ({config.configHash.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare Configurations
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Need at least two configurations to compare.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDrift;
