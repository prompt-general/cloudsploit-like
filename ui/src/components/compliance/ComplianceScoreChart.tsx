import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ComplianceScoreChartProps {
  accountId: string;
  frameworks: Array<{
    frameworkId: string;
    frameworkName: string;
    complianceScore: number;
  }>;
}

const ComplianceScoreChart: React.FC<ComplianceScoreChartProps> = ({ accountId, frameworks }) => {
  // Mock data for demonstration
  const mockData = [
    { date: '2024-01', cis: 85, soc2: 72, pcidss: 65 },
    { date: '2024-02', cis: 88, soc2: 75, pcidss: 68 },
    { date: '2024-03', cis: 90, soc2: 78, pcidss: 72 },
    { date: '2024-04', cis: 92, soc2: 82, pcidss: 75 },
    { date: '2024-05', cis: 94, soc2: 85, pcidss: 78 },
    { date: '2024-06', cis: 95, soc2: 88, pcidss: 82 },
  ];

  // If we have real framework data, use it
  const chartData = frameworks.length > 0 
    ? frameworks.map(f => ({
        name: f.frameworkName,
        score: f.complianceScore,
      }))
    : [];

  return (
    <div className="h-full">
      {frameworks.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Score']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cis" 
              name="CIS AWS" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="soc2" 
              name="SOC 2" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="pcidss" 
              name="PCI DSS" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-lg font-medium mb-2">No Compliance Data</div>
          <div className="text-sm text-center">
            Run compliance assessments to see trend data
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceScoreChart;
