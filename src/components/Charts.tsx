import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Transaction } from '../types';
import { getCategorySummary, getMonthlySummary } from '../utils/transactionParser';

interface ChartsProps {
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Charts({ transactions }: ChartsProps) {
  const categoryData = useMemo(() => getCategorySummary(transactions), [transactions]);
  const monthlyData = useMemo(() => getMonthlySummary(transactions), [transactions]);

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Pie Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Rashodi po kategorijama</h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={3}
                dataKey="total"
                nameKey="category"
                label={({ category, percentage }) => `${category} (${percentage.toFixed(0)}%)`}
                labelLine={true}
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value) + ' RSD'}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Nema podataka za prikaz
          </div>
        )}
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Mesečni pregled</h3>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value) + ' RSD'}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="income" name="Prihodi" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Rashodi" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Nema podataka za prikaz
          </div>
        )}
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Detaljan pregled kategorija</h3>
        {categoryData.length > 0 ? (
          <div className="space-y-3">
            {categoryData.map((cat, index) => (
              <div key={cat.category} className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(cat.total)} RSD</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{cat.count} transakcija</span>
                    <span className="text-xs text-gray-500">{cat.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Nema podataka o kategorijama</p>
        )}
      </div>
    </div>
  );
}
