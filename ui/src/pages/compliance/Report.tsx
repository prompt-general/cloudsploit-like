import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Download, 
  Shield,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../lib/api';

const ComplianceReport: React.FC = () => {
  const [searchParams] = useSearchParams();
  const frameworkId = searchParams.get('framework') || '';
  const accountId = searchParams.get('accountId') || '';
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['compliance-report', frameworkId, accountId, format],
    queryFn: () => api.get(`/compliance/export/${frameworkId}/${accountId}?format=${format}`).then(res => res.data),
    enabled: !!(frameworkId && accountId),
  });

  const { data: framework } = useQuery({
    queryKey: ['compliance-framework', frameworkId],
    queryFn: () => api.get(`/compliance/frameworks/${frameworkId}`).then(res => res.data),
    enabled: !!frameworkId,
  });

  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => api.get(`/accounts/${accountId}`).then(res => res.data),
    enabled: !!accountId,
  });

  const handleDownload = () => {
    if (!report) return;

    const filename = `compliance-report-${frameworkId}-${accountId}.${format}`;
    const content = format === 'json' ? JSON.stringify(report, null, 2) : report;
    
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (!frameworkId || !accountId) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Missing Parameters</h3>
        <p className="text-gray-600 mb-6">
          Both framework and account ID are required to generate a report.
        </p>
        <Link
          to="/compliance/assess"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Go to Assessment
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
        <p className="text-gray-600">
          Failed to generate compliance report. Please try again.
        </p>
      </div>
    );
  }

  const assessment = report?.assessment;
  const gapAnalysis = report?.gapAnalysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Report</h1>
          <p className="text-gray-600 mt-2">
            {framework?.name} v{framework?.version} - {account?.name}
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'json' | 'csv' | 'pdf')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>

      {assessment && (
        <>
          {/* Executive Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Executive Summary</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreBg(assessment.complianceScore)}`}>
                    <span className={`text-2xl font-bold ${getScoreColor(assessment.complianceScore)}`}>
                      {Math.round(assessment.complianceScore)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">Overall Score</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                    <span className="text-2xl font-bold text-green-600">
                      {assessment.implementedControls}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">Implemented</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
                    <span className="text-2xl font-bold text-yellow-600">
                      {assessment.partiallyImplementedControls}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">Partial</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                    <span className="text-2xl font-bold text-red-600">
                      {assessment.notImplementedControls}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">Not Implemented</p>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-600">
                <p>
                  <strong>Assessment Date:</strong> {new Date(assessment.assessmentDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Total Controls:</strong> {assessment.totalControls} ({assessment.applicableControls} applicable)
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Gaps */}
          {gapAnalysis && gapAnalysis.gaps && gapAnalysis.gaps.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Compliance Gaps ({gapAnalysis.totalGaps})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {gapAnalysis.gaps.map((gap: any, index: number) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {gap.controlId} - {gap.controlTitle}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            gap.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            gap.severity === 'high' ? 'bg-red-100 text-red-800' :
                            gap.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {gap.severity}
                          </span>
                        </div>
                        
                        <p className="mt-2 text-sm text-gray-600">
                          {gap.affectedResources?.length || 0} resources affected
                        </p>

                        {gap.implementationGuidance && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-md">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Implementation Guidance</h4>
                            <p className="text-sm text-blue-800">{gap.implementationGuidance}</p>
                          </div>
                        )}

                        {gap.remediationSteps && gap.remediationSteps.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Remediation Steps</h4>
                            <div className="text-sm text-gray-700 space-y-2">
                              {gap.remediationSteps.map((step: string, stepIndex: number) => (
                                <p key={stepIndex}>{step}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Control Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Control Details</h2>
            </div>
            
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Control ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Findings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Assessed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessment.controls?.map((control: any) => (
                    <tr key={control.controlId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {control.controlId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          control.status === 'implemented' ? 'bg-green-100 text-green-800' :
                          control.status === 'partially_implemented' ? 'bg-yellow-100 text-yellow-800' :
                          control.status === 'not_implemented' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {control.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {control.findings?.length || 0} findings
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(control.lastAssessed).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ComplianceReport;
