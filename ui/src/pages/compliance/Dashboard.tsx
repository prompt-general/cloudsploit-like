import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  FileText,
  Target,
  Users
} from 'lucide-react';
import { api } from '../../lib/api';
import ComplianceScoreChart from '../../components/compliance/ComplianceScoreChart';
import FrameworkCoverage from '../../components/compliance/FrameworkCoverage';
import TopNonCompliantControls from '../../components/compliance/TopNonCompliantControls';

const ComplianceDashboard: React.FC = () => {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => api.get('/compliance/dashboard').then(res => res.data),
  });

  const { data: frameworks, isLoading: frameworksLoading } = useQuery({
    queryKey: ['compliance-frameworks'],
    queryFn: () => api.get('/compliance/frameworks').then(res => res.data),
  });

  if (isLoading || frameworksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const accountSummary = dashboardData?.accountSummary;
  const overallScore = accountSummary?.overallComplianceScore || 0;
  const frameworksData = frameworks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage compliance across industry standards and frameworks
        </p>
      </div>

      {/* Overall Compliance Score */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Overall Compliance Score</h2>
            <p className="text-blue-100 mt-2">
              {accountSummary ? 
                `Based on ${accountSummary.frameworksAssessed} of ${accountSummary.totalFrameworks} frameworks` :
                'No compliance assessments available'
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{overallScore.toFixed(1)}%</div>
            <div className="text-blue-100 mt-2">
              {overallScore >= 90 ? 'Excellent' : 
               overallScore >= 70 ? 'Good' : 
               overallScore >= 50 ? 'Fair' : 'Needs Improvement'}
            </div>
          </div>
        </div>
        
        {/* Score breakdown */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-300 mr-2" />
              <div>
                <p className="text-sm text-blue-100">Frameworks</p>
                <p className="text-xl font-bold">{frameworksData.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <div className="flex items-center">
              <Target className="h-6 w-6 text-yellow-300 mr-2" />
              <div>
                <p className="text-sm text-blue-100">Total Controls</p>
                <p className="text-xl font-bold">{dashboardData?.controls || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-purple-300 mr-2" />
              <div>
                <p className="text-sm text-blue-100">Coverage</p>
                <p className="text-xl font-bold">
                  {frameworksData.length > 0 
                    ? `${Math.round(frameworksData.reduce((sum: number, f: any) => sum + (f.coverage?.coveragePercentage || 0), 0) / frameworksData.length)}%` 
                    : '0%'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-blue-300 mr-2" />
              <div>
                <p className="text-sm text-blue-100">Accounts Assessed</p>
                <p className="text-xl font-bold">
                  {accountSummary ? 1 : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Framework List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Framework Coverage */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Framework Coverage</h3>
            </div>
            <div className="p-6">
              <FrameworkCoverage frameworks={frameworksData} />
            </div>
          </div>

          {/* Compliance Trends */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Trends</h3>
            </div>
            <div className="p-6">
              {accountSummary ? (
                <div className="h-64">
                  <ComplianceScoreChart 
                    accountId={accountSummary.accountId}
                    frameworks={accountSummary.frameworks}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No compliance data available</p>
                  <p className="text-sm mt-2">Run a compliance assessment to see trends</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-3">
              <Link
                to="/compliance/assess"
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-blue-900">Run Compliance Assessment</span>
                </div>
                <span className="text-blue-600">→</span>
              </Link>
              
              <Link
                to="/compliance/reports"
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-green-900">Generate Reports</span>
                </div>
                <span className="text-green-600">→</span>
              </Link>
              
              <Link
                to="/compliance/frameworks"
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="font-medium text-purple-900">View Frameworks</span>
                </div>
                <span className="text-purple-600">→</span>
              </Link>
            </div>
          </div>

          {/* Top Non-Compliant Controls */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Critical Issues</h3>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="p-4">
              <TopNonCompliantControls />
            </div>
          </div>

          {/* Compliance Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Framework Status</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {frameworksData.slice(0, 3).map((framework: any) => (
                  <div key={framework.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{framework.name}</p>
                      <p className="text-sm text-gray-500">v{framework.version}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        (framework.coverage?.coveragePercentage || 0) >= 70 ? 'text-green-600' :
                        (framework.coverage?.coveragePercentage || 0) >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {framework.coverage?.coveragePercentage?.toFixed(0) || 0}%
                      </div>
                      <p className="text-xs text-gray-500">Coverage</p>
                    </div>
                  </div>
                ))}
              </div>
              {frameworksData.length > 3 && (
                <Link
                  to="/compliance/frameworks"
                  className="block text-center mt-4 text-sm text-blue-600 hover:text-blue-800"
                >
                  View all {frameworksData.length} frameworks →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Assessments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Framework
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData?.recentAssessments?.map((assessment: any) => (
                <tr key={assessment.scanId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {assessment.accountName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {assessment.accountId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Multiple Frameworks</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: '75%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(assessment.completedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/compliance/reports/${assessment.scanId}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
