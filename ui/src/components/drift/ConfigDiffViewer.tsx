import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, Edit } from 'lucide-react';

interface DiffViewerProps {
  oldConfig: any;
  newConfig: any;
}

const ConfigDiffViewer: React.FC<DiffViewerProps> = ({ oldConfig, newConfig }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const generateDiff = (oldObj: any, newObj: any, path: string = ''): any[] => {
    const diffs: any[] = [];
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {})
    ]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];

      if (oldVal === undefined && newVal !== undefined) {
        // Added
        diffs.push({
          path: currentPath,
          type: 'added',
          value: newVal,
          level: currentPath.split('.').length,
        });
      } else if (oldVal !== undefined && newVal === undefined) {
        // Removed
        diffs.push({
          path: currentPath,
          type: 'removed',
          value: oldVal,
          level: currentPath.split('.').length,
        });
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
          // Nested object with changes
          diffs.push({
            path: currentPath,
            type: 'modified',
            level: currentPath.split('.').length,
            hasChildren: true,
          });
          
          if (expandedPaths.has(currentPath)) {
            const nestedDiffs = generateDiff(oldVal, newVal, currentPath);
            diffs.push(...nestedDiffs);
          }
        } else {
          // Simple value change
          diffs.push({
            path: currentPath,
            type: 'modified',
            oldValue: oldVal,
            newValue: newVal,
            level: currentPath.split('.').length,
          });
        }
      } else if (typeof oldVal === 'object' && oldVal !== null) {
        // Object without changes (collapsible)
        diffs.push({
          path: currentPath,
          type: 'unchanged',
          level: currentPath.split('.').length,
          hasChildren: true,
        });
        
        if (expandedPaths.has(currentPath)) {
          const nestedDiffs = generateDiff(oldVal, newVal, currentPath);
          diffs.push(...nestedDiffs);
        }
      }
    }

    return diffs;
  };

  const diffs = generateDiff(oldConfig, newConfig);

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') {
      if (value.length > 50) {
        return `"${value.substring(0, 50)}..."`;
      }
      return `"${value}"`;
    }
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'removed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'modified':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-900">Configuration Differences</span>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                <span className="text-xs text-gray-600">Added</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                <span className="text-xs text-gray-600">Removed</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                <span className="text-xs text-gray-600">Modified</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpandedPaths(new Set())}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {diffs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No differences found between configurations
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {diffs.map((diff, idx) => {
              const pathParts = diff.path.split('.');
              const name = pathParts[pathParts.length - 1];
              const isExpandable = diff.hasChildren;
              const isExpanded = expandedPaths.has(diff.path);

              return (
                <div
                  key={`${diff.path}-${idx}`}
                  className={`px-4 py-3 ${getTypeClass(diff.type)}`}
                  style={{ paddingLeft: `${diff.level * 20}px` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isExpandable ? (
                        <button
                          onClick={() => togglePath(diff.path)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <div className="w-4"></div>
                      )}
                      {getTypeIcon(diff.type)}
                      <span className="font-mono text-sm">{name}</span>
                      {diff.type === 'unchanged' && (
                        <span className="text-xs text-gray-500">(unchanged)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {diff.type === 'added' && (
                        <span className="text-sm">{formatValue(diff.value)}</span>
                      )}
                      {diff.type === 'removed' && (
                        <span className="text-sm line-through">{formatValue(diff.value)}</span>
                      )}
                      {diff.type === 'modified' && (
                        <div className="text-sm">
                          <span className="line-through text-red-600 mr-2">
                            {formatValue(diff.oldValue)}
                          </span>
                          <span className="text-green-600">→ {formatValue(diff.newValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigDiffViewer;
