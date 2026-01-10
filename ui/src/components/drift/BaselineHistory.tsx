import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, User, Tag, Copy } from 'lucide-react';
import { api } from '../../lib/api';

interface BaselineHistoryProps {
  assetId: string;
}

const BaselineHistory: React.FC<BaselineHistoryProps> = ({ assetId }) => {
  const [showSetBaseline, setShowSetBaseline] = useState(false);

  const { data: baselines, isLoading, refetch } = useQuery({
    queryKey: ['baselines', assetId],
    queryFn: () => api.get(`/drift/baseline/${assetId}`).then(res => res.data),
  });

  const setBaselineMutation = useMutation({
    mutationFn: (data: any) => api.post('/drift/baseline', data),
    onSuccess: () => {
      refetch();
      setShowSetBaseline(false);
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
    const comment = prompt('Enter comment for baseline:') || '';
    const tagsInput = prompt('Enter tags (comma-separated):') || '';
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

    setBaselineMutation.mutate({
      assetId,
      approvedBy: 'user',
      comment,
      tags,
    });
  };

  const handleRevert = (baselineId: string) => {
    if (confirm('Are you sure you want to revert to this baseline?')) {
      revertMutation.mutate(baselineId);
    }
  };

  const handleCopyConfig = (config: any) => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert('Configuration copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Set Baseline Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSetBaseline}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          disabled={setBaselineMutation.isPending}
        >
          {setBaselineMutation.isPending ? (
            'Setting Baseline...'
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Set New Baseline
            </>
          )}
        </button>
      </div>

      {/* Baselines List */}
      {baselines?.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No baselines set for this asset.</p>
          <p className="text-sm text-gray-500 mt-2">
            Set a baseline to start tracking configuration drift.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {baselines?.map((baseline: any) => (
            <div
              key={baseline.id}
              className={`bg-white rounded-lg shadow border ${
                baseline.isCurrent ? 'border-blue-500 border-l-4' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      {baseline.isCurrent ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Current Baseline
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          <Clock className="h-4 w-4 mr-1" />
                          Historical
                        </span>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-1" />
                        {baseline.approvedBy}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Configuration Hash: {baseline.config?.configHash?.slice(0, 16)}...
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <Clock className="inline h-4 w-4 mr-1" />
                        Set on {new Date(baseline.approvedAt).toLocaleString()}
                      </p>
                      {baseline.comment && (
                        <p className="text-sm text-gray-700 mt-2">{baseline.comment}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCopyConfig(baseline.config?.rawConfig)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      title="Copy configuration"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {!baseline.isCurrent && (
                      <button
                        onClick={() => handleRevert(baseline.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        Revert to This
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {baseline.comment?.includes('Tags:') && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {baseline.comment
                      .split('Tags:')[1]
                      ?.split(',')
                      .map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                )}

                {/* Config Preview */}
                <div className="mt-4">
                  <details className="border border-gray-200 rounded-lg">
                    <summary className="px-4 py-3 bg-gray-50 cursor-pointer text-sm font-medium text-gray-900">
                      View Configuration
                    </summary>
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <pre className="text-xs text-gray-700 overflow-x-auto max-h-48">
                        {JSON.stringify(baseline.config?.rawConfig, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Baselines</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Baselines represent approved, known-good configurations</p>
              <p>• Drift is detected by comparing current configurations against baseline</p>
              <p>• You can have multiple historical baselines for comparison</p>
              <p>• Reverting to a baseline provides instructions to restore the approved state</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaselineHistory;
