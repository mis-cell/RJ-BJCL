import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { Clock } from 'lucide-react';
import { BAR_COLORS } from './types';

interface PurchaseOrderSummaryChartsProps {
  activePoReportKey: string;
  r1ChartMetric: 'combo' | 'weight' | 'capital' | 'count';
  chartType: 'area' | 'bar' | 'hbar' | 'pie' | 'half_circle' | 'line' | 'composed';
  chartData: any[];
}

export const PurchaseOrderSummaryCharts: React.FC<PurchaseOrderSummaryChartsProps> = ({
  activePoReportKey,
  r1ChartMetric,
  chartType,
  chartData
}) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-gray-400 bg-slate-50 border border-dashed border-gray-200 min-h-[220px]">
        <Clock className="h-7 w-7 text-slate-300 animate-pulse mb-1.5" />
        <span className="text-[9.5px]">No matching data points located within chosen filters scope.</span>
      </div>
    );
  }

  return (
    <div className="h-56 mt-2 font-mono text-[9px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
        {activePoReportKey === 'r1' ? (
          <React.Fragment>
            {r1ChartMetric === 'combo' && (
              <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="poColorComboArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis yAxisId="left" stroke="#4f46e5" tick={{ fontSize: 8 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 8 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === "estimatedValue") return [`Rs. ${Math.round(value).toLocaleString('en-IN')}`, "Est. Capital Required"];
                    if (name === "weight") return [`${value.toFixed(3)} MT`, "Volume Sourced"];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '8px' }} />
                <Area yAxisId="left" type="monotone" dataKey="weight" name="weight" stroke="#4f46e5" fill="url(#poColorComboArea)" strokeWidth={1.5} />
                <Line yAxisId="right" type="monotone" dataKey="estimatedValue" name="estimatedValue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            )}

            {r1ChartMetric === 'weight' && (
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="poColorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip formatter={(value: any) => [`${value.toFixed(3)} MT`, `Weight Volume (MT)`]} />
                <Area type="monotone" dataKey="weight" stroke="#2563eb" fill="url(#poColorWeight)" strokeWidth={1.5} />
              </AreaChart>
            )}

            {r1ChartMetric === 'capital' && (
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="poColorCapital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip formatter={(value: any) => [`Rs. ${Math.round(value).toLocaleString('en-IN')}`, `Capital Outlay`]} />
                <Area type="monotone" dataKey="estimatedValue" stroke="#10b981" fill="url(#poColorCapital)" strokeWidth={1.5} />
              </AreaChart>
            )}

            {r1ChartMetric === 'count' && (
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip formatter={(value: any) => [value, `Contracts Count`]} />
                <Bar dataKey="count" fill="#4f46e5" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </React.Fragment>
        ) : (
          <React.Fragment>
            {chartType === 'area' && (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="poColorArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip />
                <Area type="monotone" dataKey="weight" stroke="#4f46e5" fillOpacity={1} fill="url(#poColorArea)" strokeWidth={1.5} />
              </AreaChart>
            )}

            {chartType === 'bar' && (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip />
                <Bar dataKey="weight" fill="#0f766e" radius={[2, 2, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}

            {chartType === 'hbar' && (
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 7.5 }} width={70} />
                <Tooltip />
                <Bar dataKey="weight" fill="#312e81" radius={[0, 2, 2, 0]} />
              </BarChart>
            )}

            {chartType === 'pie' && (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}

            {chartType === 'half_circle' && (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="90%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '8px' }} />
              </PieChart>
            )}

            {chartType === 'line' && (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '8.5px' }} />
                <Line type="monotone" dataKey="baseRate" stroke="#10b981" name="B-Rate (Base)" strokeWidth={2} />
                <Line type="monotone" dataKey="actualRate" stroke="#f43f5e" name="Invoice Actual Qtl" strokeWidth={2} />
              </LineChart>
            )}

            {chartType === 'composed' && (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 8 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '9px' }} />
                <CartesianGrid stroke="#f1f5f9" />
                <Bar dataKey="lorries" name="Lorries Dispatched" fill="#0284c7" barSize={20} radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="payload" name="Payload Capacity (MT)" stroke="#ff7300" strokeWidth={2} />
              </ComposedChart>
            )}
          </React.Fragment>
        )}
      </ResponsiveContainer>
    </div>
  );
};
