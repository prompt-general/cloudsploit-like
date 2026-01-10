import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Shield, 
  Key, 
  Network, 
  Tag, 
  Settings, 
  Clock, 
  ChevronRight
} from 'lucide-react';

const getChangeTypeIcon = (changeType: string) => {
  switch (changeType) {
    case 'security':
      return <Shield className="h-5 w-5 text-red-500" />;
    case 'access':
      return <Key className="h-5 w-5 text-orange-500" />;
    case 'encryption':
      return <AlertTriangle className="h-5 w-5 text-purple-500" />;
    case 'network':
      return <Network className="h-5 w-5 text-blue-500" />;
    case 'metadata':
      return <Tag className="h-5 w-5 text-green-500" />;
    default:
      return <Settings className="h-5 w-5 text-gray-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  const styles = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[severity as keyof typeof styles] || styles.low}`}>
      {severity}
    </span>
  );
};

interface DriftEventCardProps {
  event: any;
}

const DriftEventCard: React.FC<DriftEventCardProps> = ({ event }) => {
  const requiresAttention = event.requiresAttention || event.severity === 'high' || event.severity === 'critical';

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${
      requiresAttention ? 'border-red-500' : 'border-blue-500'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-2 rounded-lg bg-gray-100">
              {getChangeTypeIcon(event.changeType)}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {event.asset?.resourceId || 'Unknown Asset'}
              </h3>
              <p className="text-sm text-gray-600">
                {event.asset?.service} • {event.asset?.region}
              </p>
              <div className="mt-2 flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  {event.changeType} change detected
                </span>
                {getSeverityBadge(event.analysis?.severity || 'low')}
                {requiresAttention && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Requires Review
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            to={`/drift/assets/${event.assetId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Detected</p>
            <p className="text-lg font-medium text-gray-900">
              {new Date(event.detectedAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(event.detectedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Change Type</p>
          <p className="text-lg font-medium capitalize">{event.changeType}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Severity</p>
          <p className="text-lg font-medium capitalize">{event.analysis?.severity || 'low'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Security Impact</p>
          <p className="text-lg font-medium capitalize">
            {event.analysis?.impact?.split(':')[0] || 'Unknown'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Affected Paths</p>
          <p className="text-lg font-medium">
            {event.diff ? Object.keys(event.diff).length : 0} paths
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="flex space-x-3">
          <Link
            to={`/drift/compare/${event.oldConfigId}/${event.newConfigId}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View Configuration Diff
          </Link>
          <Link
            to={`/assets/${event.assetId}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            View Asset Details
          </Link>
        </div>
        {requiresAttention && (
          <button className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">
            Mark as Reviewed
          </button>
        )}
      </div>
    </div>
  );
};

export default DriftEventCard;
