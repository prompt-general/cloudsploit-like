import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Shield, 
  Play, 
  Download, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { api } from '../../lib/api';

const ComplianceAssessment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const frameworkId = searchParams.get('framework');
  const [selectedFramework, setSelectedFramework] = useState<string>(frameworkId || '');
  const [accountId, setAccountId] = useState<string>('');

  const { data: frameworks, isLoading: frameworksLoading } = useQuery({
    queryKey: ['compliance-frameworks'],
    queryFn: () => api.get('/compliance/frameworks').then(res => res.data),
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(res => res.data),
  });

  const assessMutation = useMutation({
    mutationFn: ({ frameworkId, accountId }: { frameworkId: string; accountId: string }) =>
      api.post(`/compliance/assess/${frameworkId}/${accountId}`),
    onSuccess: (data) => {
      alert('Compliance assessment completed!');
      console.log('Assessment result:', data);
    },
    onError: (error) => {
      alert(`Assessment failed: ${error.message}`);
    },
  });

  const handleRunAssessment = () => {
    if (!selectedFramework || !accountId) {
      alert('Please select both a framework and an account');
      return;
    }

    if (confirm(`Run compliance assessment for ${selectedFramework} on account ${accountId}?`)) {
      assessMutation.mutate({ frameworkId: selectedFramework, accountId });
    }
  };

  const getFrameworkScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFrameworkScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (frameworksLoading || accountsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Assessment</h1>
          <p className="text-gray-600 mt-2">
            Run compliance assessments against industry frameworks
          </p>
        </div>
        <Link
          to="/compliance/frameworks"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700"
        >
          <Shield className="h-4 w-4 mr-2" />
          Manage Frameworks
        </Link>
      </div>

      {/* Assessment Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Run New Assessment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Framework
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
            >
              <option value="">Select a framework...</option>
              {frameworks?.map((framework: any) => (
                <option key={framework.id} value={framework.id}>
                  {framework.name} v{framework.version}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Select an account...</option>
              {accounts?.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.accountId})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Link
            to={`/compliance/report?framework=${selectedFramework}&accountId=${accountId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Link>
          <button
            onClick={handleRunAssessment}
            disabled={!selectedFramework || !accountId || assessMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className={`h-4 w-4 mr-2 ${assessMutation.isPending ? 'animate-pulse' : ''}`} />
            {assessMutation.isPending ? 'Running...' : 'Run Assessment'}
          </button>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Assessments</h2>
        </div>
        
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
            <p className="text-gray-600">
              Run your first compliance assessment using the form above.
            </p>
          </div>
        </div>
      </div>

      {/* Framework Overview */}
      {frameworks && frameworks.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Available Frameworks</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {frameworks.map((framework: any) => (
              <div key={framework.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {framework.name}
                      </h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        v{framework.version}
                      </span>
                    </div>
                    
                    <p className="mt-2 text-sm text-gray-600">
                      {framework.description || 'No description available'}
                    </p>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Controls</p>
                        <p className="text-lg font-semibold">{framework._count?.controls || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <p className={`text-lg font-semibold ${getFrameworkScoreColor(framework.coverage?.coveragePercentage || 0)}`}>
                          {framework.coverage?.coveragePercentage?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Mapped Rules</p>
                        <p className="text-lg font-semibold">{framework.coverage?.mappedRules || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFrameworkScoreBg(framework.coverage?.coveragePercentage || 0)} ${getFrameworkScoreColor(framework.coverage?.coveragePercentage || 0)}`}>
                          {framework.coverage?.coverageLevel || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex space-x-2">
                    <button
                      onClick={() => setSelectedFramework(framework.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Assess
                    </button>
                    <Link
                      to={`/compliance/frameworks/${framework.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceAssessment;
