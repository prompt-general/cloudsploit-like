import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { api } from '../../lib/api';

const ComplianceFrameworks: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: frameworks, isLoading, refetch } = useQuery({
    queryKey: ['compliance-frameworks'],
    queryFn: () => api.get('/compliance/frameworks').then(res => res.data),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/compliance/seed'),
    onSuccess: () => {
      refetch();
      alert('Frameworks seeded successfully!');
    },
    onError: (error) => {
      alert(`Failed to seed frameworks: ${error.message}`);
    },
  });

  const filteredFrameworks = frameworks?.filter((framework: any) => {
    const matchesSearch = 
      framework.name.toLowerCase().includes(search.toLowerCase()) ||
      framework.description?.toLowerCase().includes(search.toLowerCase());
    
    // Note: We don't have category in framework data, so we'll skip category filter for now
    return matchesSearch;
  });

  const handleSeedFrameworks = () => {
    if (confirm('This will seed predefined compliance frameworks (CIS, SOC2, PCI-DSS). Continue?')) {
      seedMutation.mutate();
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Frameworks</h1>
          <p className="text-gray-600 mt-2">
            Manage and assess against industry compliance standards
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSeedFrameworks}
            disabled={seedMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${seedMutation.isPending ? 'animate-spin' : ''}`} />
            {seedMutation.isPending ? 'Seeding...' : 'Seed Frameworks'}
          </button>
          <Link
            to="/compliance/assess"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Shield className="h-4 w-4 mr-2" />
            Run Assessment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search frameworks..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 h-5 w-5" />
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="security">Security</option>
                <option value="privacy">Privacy</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Frameworks</p>
              <p className="text-2xl font-bold">{frameworks?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Controls</p>
              <p className="text-2xl font-bold">
                {frameworks?.reduce((sum: number, f: any) => sum + (f._count?.controls || 0), 0) || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Avg. Coverage</p>
              <p className="text-2xl font-bold">
                {frameworks?.length > 0 
                  ? `${Math.round(frameworks.reduce((sum: number, f: any) => sum + (f.coverage?.coveragePercentage || 0), 0) / frameworks.length)}%` 
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Needs Mapping</p>
              <p className="text-2xl font-bold">
                {frameworks?.filter((f: any) => (f.coverage?.coveragePercentage || 0) < 50).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frameworks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFrameworks?.map((framework: any) => (
          <div key={framework.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {framework.name}
                    </h3>
                    <p className="text-sm text-gray-500">v{framework.version}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  (framework.coverage?.coveragePercentage || 0) >= 70 ? 'bg-green-100 text-green-800' :
                  (framework.coverage?.coveragePercentage || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {framework.coverage?.coveragePercentage?.toFixed(0) || 0}% coverage
                </span>
              </div>

              <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                {framework.description || 'No description available'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Controls</p>
                  <p className="text-lg font-semibold">{framework._count?.controls || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mapped Rules</p>
                  <p className="text-lg font-semibold">{framework.coverage?.mappedRules || 0}</p>
                </div>
              </div>

              {/* Coverage Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Rule Coverage</span>
                  <span>{framework.coverage?.coveragePercentage?.toFixed(1) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (framework.coverage?.coveragePercentage || 0) >= 70 ? 'bg-green-600' :
                      (framework.coverage?.coveragePercentage || 0) >= 50 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${framework.coverage?.coveragePercentage || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {framework.coverage?.coverageLevel || 'No coverage data'}
                </p>
              </div>

              <div className="mt-6 flex justify-between">
                <Link
                  to={`/compliance/frameworks/${framework.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View Details
                </Link>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Implement export functionality
                      alert(`Exporting ${framework.name} report...`);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                    title="Export Report"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/compliance/assess?framework=${framework.id}`}
                    className="text-sm font-medium text-green-600 hover:text-green-800"
                  >
                    Assess
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFrameworks?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No frameworks found</h3>
          <p className="text-gray-600 mb-6">
            {frameworks?.length === 0 
              ? 'No compliance frameworks are configured. Click "Seed Frameworks" to add predefined frameworks.'
              : 'No frameworks match your search criteria.'
            }
          </p>
          {frameworks?.length === 0 && (
            <button
              onClick={handleSeedFrameworks}
              disabled={seedMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${seedMutation.isPending ? 'animate-spin' : ''}`} />
              {seedMutation.isPending ? 'Seeding...' : 'Seed Predefined Frameworks'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplianceFrameworks;
