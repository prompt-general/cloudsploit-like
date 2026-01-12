import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  Download,
  BarChart3,
  List,
  Filter,
  Search
} from 'lucide-react';
import { api } from '../../lib/api';
import ControlStatusChart from '../../components/compliance/ControlStatusChart';

const FrameworkDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'controls' | 'mappings' | 'assessments'>('overview');
  const [controlSearch, setControlSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: framework, isLoading } = useQuery({
    queryKey: ['framework-details', id],
    queryFn: () => api.get(`/compliance/frameworks/${id}`).then(res => res.data),
  });

  const { data: gapAnalysis } = useQuery({
    queryKey: ['gap-analysis', id],
    queryFn: () => api.get(`/compliance/gap-analysis/${id}/default-account`).then(res => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Framework not found</h3>
        <p className="text-gray-600">The requested compliance framework does not exist.</p>
        <Link to="/compliance/frameworks" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to Frameworks
        </Link>
      </div>
    );
  }

  const controls = framework.controls || [];
  const coverage = framework.coverage || {};
  const isPredefined = framework.isPredefined;

  // Filter controls
  const filteredControls = controls.filter((control: any) => {
    const matchesSearch = 
      control.controlId.toLowerCase().includes(controlSearch.toLowerCase()) ||
      control.title.toLowerCase().includes(controlSearch.toLowerCase()) ||
      control.description?.toLowerCase().includes(controlSearch.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'mapped' && control._count?.ruleMappings > 0) ||
      (statusFilter === 'unmapped' && control._count?.ruleMappings === 0);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/compliance/frameworks" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2">
            ← Back to Frameworks
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {framework.name}
          </h1>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-gray-600">v{framework.version}</span>
            {isPredefined && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Predefined Framework
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <Link
            to={`/compliance/assess?framework=${id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Shield className="h-4 w-4 mr-2" />
            Assess Compliance
          </Link>
        </div>
      </div>

      {/* Description */}
      {framework.description && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">{framework.description}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Coverage</p>
              <p className="text-2xl font-bold">{coverage.coveragePercentage?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">{coverage.coverageLevel || 'No data'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <List className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Controls</p>
              <p className="text-2xl font-bold">{controls.length}</p>
              <p className="text-xs text-gray-500">
                {controls.filter((c: any) => c._count?.ruleMappings > 0).length} mapped
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Rule Mappings</p>
              <p className="text-2xl font-bold">{coverage.totalMappings || 0}</p>
              <p className="text-xs text-gray-500">{coverage.mappedRules || 0} unique rules</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Gaps</p>
              <p className="text-2xl font-bold">{gapAnalysis?.totalGaps || 0}</p>
              <p className="text-xs text-gray-500">
                {gapAnalysis?.gaps?.filter((g: any) => g.severity === 'high' || g.severity === 'critical').length || 0} critical
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
            onClick={() => setActiveTab('controls')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'controls'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Controls ({controls.length})
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mappings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rule Mappings
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assessments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Assessments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Coverage Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Analysis</h3>
              <div className="h-64">
                <ControlStatusChart controls={controls} />
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {controls.filter((c: any) => c._count?.ruleMappings > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Mapped Controls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {controls.filter((c: any) => c._count?.ruleMappings === 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Unmapped Controls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {coverage.mappedRules || 0}
                  </div>
                  <div className="text-sm text-gray-600">Mapped Rules</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {coverage.totalMappings || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Mappings</div>
                </div>
              </div>
            </div>

            {/* Gap Analysis */}
            {gapAnalysis && gapAnalysis.totalGaps > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Compliance Gaps</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {gapAnalysis.gaps.slice(0, 5).map((gap: any, idx: number) => (
                      <div key={idx} className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{gap.controlTitle}</h4>
                            <p className="text-sm text-gray-600 mt-1">{gap.controlId}</p>
                            <div className="flex items-center mt-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                gap.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                gap.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {gap.severity}
                              </span>
                              <span className="ml-2 text-sm text-gray-600">
                                Affects {gap.totalResources} resources
                              </span>
                            </div>
                          </div>
                          <Link
                            to={`/compliance/controls/${gap.controlId}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  {gapAnalysis.totalGaps > 5 && (
                    <Link
                      to={`/compliance/gap-analysis/${id}`}
                      className="block text-center mt-4 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all {gapAnalysis.totalGaps} gaps →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="bg-white rounded-lg shadow">
            {/* Controls Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <h3 className="text-lg font-semibold text-gray-900">Controls</h3>
                <div className="flex space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search controls..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={controlSearch}
                      onChange={(e) => setControlSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="mapped">Mapped</option>
                    <option value="unmapped">Unmapped</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Controls List */}
            <div className="divide-y divide-gray-200">
              {filteredControls.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <List className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No controls found matching your criteria</p>
                </div>
              ) : (
                filteredControls.map((control: any) => (
                  <div key={control.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                            control._count?.ruleMappings > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {control._count?.ruleMappings > 0 ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <XCircle className="h-5 w-5" />
                            )}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {control.controlId}: {control.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {control.description}
                            </p>
                            <div className="flex items-center mt-2 space-x-3">
                              {control.category && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {control.category}
                                </span>
                              )}
                              {control.severity && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  control.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  control.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                  control.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {control.severity}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {control._count?.ruleMappings || 0} rule mappings
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/compliance/controls/${control.id}`}
                        className="ml-4 text-blue-600 hover:text-blue-800"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'mappings' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Rule Mappings</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Rule mapping interface coming soon</p>
                <p className="text-sm mt-2">
                  View and manage mappings between security rules and compliance controls
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Assessments</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No assessments available</p>
                <p className="text-sm mt-2">
                  Run a compliance assessment to see results here
                </p>
                <Link
                  to={`/compliance/assess?framework=${id}`}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Run Assessment
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrameworkDetails;
