import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FrameworkCoverageProps {
  frameworks: Array<{
    id: string;
    name: string;
    version: string;
    coverage?: {
      coveragePercentage: number;
      coverageLevel: string;
    };
    _count?: {
      controls: number;
    };
  }>;
}

const FrameworkCoverage: React.FC<FrameworkCoverageProps> = ({ frameworks }) => {
  // Prepare data for chart
  const chartData = frameworks
    .filter(f => f.coverage)
    .map(framework => ({
      name: framework.name.length > 15 ? `${framework.name.substring(0, 15)}...` : framework.name,
      fullName: framework.name,
      coverage: framework.coverage?.coveragePercentage || 0,
      controls: framework._count?.controls || 0,
      level: framework.coverage?.coverageLevel || 'Unknown',
      id: framework.id,
    }))
    .sort((a, b) => b.coverage - a.coverage);

  const getBarColor = (coverage: number) => {
    if (coverage >= 80) return '#10b981'; // green
    if (coverage >= 60) return '#f59e0b'; // yellow
    if (coverage >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div>
      {frameworks.length > 0 ? (
        <div className="space-y-6">
          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#666"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'coverage') return [`${value}%`, 'Coverage'];
                    if (name === 'controls') return [value, 'Controls'];
                    return [value, name];
                  }}
                  labelFormatter={(label, items) => {
                    const item = items?.[0];
                    return item?.payload?.fullName || label;
                  }}
                />
                <Bar 
                  dataKey="coverage" 
                  name="Coverage"
                  fill={(entry) => getBarColor(entry.coverage)}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Framework List */}
          <div className="space-y-4">
            {chartData.slice(0, 5).map((framework) => (
              <Link
                key={framework.id}
                to={`/compliance/frameworks/${framework.id}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{framework.fullName}</h4>
                    <p className="text-sm text-gray-600">
                      {framework.controls} controls • {framework.level} coverage
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      framework.coverage >= 80 ? 'text-green-600' :
                      framework.coverage >= 60 ? 'text-yellow-600' :
                      framework.coverage >= 40 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {framework.coverage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Coverage</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${framework.coverage}%`,
                      backgroundColor: getBarColor(framework.coverage),
                    }}
                  ></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No compliance frameworks configured</p>
          <p className="text-sm mt-2">Seed frameworks to get started with compliance assessments</p>
        </div>
      )}
    </div>
  );
};

export default FrameworkCoverage;
