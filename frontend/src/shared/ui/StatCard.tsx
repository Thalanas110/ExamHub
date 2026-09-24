import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  subtitle?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, trend, subtitle, onClick, iconColor, iconBg }: StatCardProps) {
  const trendPositive = (trend?.value ?? 0) >= 0;

  return (
    <div
      data-ui="stat-card"
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_38px_-34px_rgba(50,28,10,0.75)] ${
        onClick ? 'cursor-pointer transition-transform duration-200 hover:-translate-y-1' : ''
      }`}
      onClick={onClick}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-700 via-orange-500 to-teal-600 opacity-85" />

      <div className="flex items-start justify-between mb-4 mt-1">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg ?? 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${iconColor ?? 'text-gray-700'}`} />
        </div>

        {trend && (
          <div
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              trendPositive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {trendPositive ? '+' : '-'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="text-3xl font-semibold text-gray-900 mb-0.5 tracking-tight leading-none">{value}</div>
      <div className="text-[11px] text-gray-600 font-semibold uppercase tracking-[0.16em] mt-2">{title}</div>

      {subtitle && <div className="text-xs text-gray-500 mt-1.5">{subtitle}</div>}
      {trend && <div className="text-xs text-gray-500 mt-1.5">{trend.label}</div>}
    </div>
  );
}
