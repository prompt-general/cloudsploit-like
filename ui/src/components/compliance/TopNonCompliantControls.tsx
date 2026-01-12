import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';

const TopNonCompliantControls: React.FC = () => {
  const { data: criticalIssues, isLoading } = useQuery({
    queryKey: ['compliance-critical-issues'],
    queryFn: () => api.get('/compliance/critical-issues').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const issues = criticalIssues || [];

  if (issues.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p className="text-sm">No critical compliance issues found</p>
      </div>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  return (
    <div className="space-y-3">
      {issues.slice(0, 5).map((issue: any, index: number) => (
        <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                {getSeverityIcon(issue.severity)}
                <span className="ml-2 font-medium text-sm capitalize">{issue.severity}</span>
              </div>
              <h4 className="font-medium text-sm mb-1">{issue.controlId}</h4>
              <p className="text-xs opacity-90">{issue.controlTitle}</p>
              {issue.affectedResources && (
                <p className="text-xs mt-1 opacity-75">
                  {issue.affectedResources} resources affected
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{issue.failures}</div>
              <div className="text-xs opacity-75">failures</div>
            </div>
          </div>
        </div>
      ))}
      
      {issues.length > 5 && (
        <div className="text-center pt-2">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all {issues.length} issues →
          </button>
        </div>
      )}
    </div>
  );
};

export default TopNonCompliantControls;
