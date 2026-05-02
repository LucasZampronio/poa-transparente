import { formatCurrency, type RankingRow } from '../services/api';
import { cn } from '../lib/utils';

type Props = {
  title: string;
  rows: any[];
  labelKey: 'company_name' | 'agency' | 'description';
  valueKey: 'total_received' | 'total_spent';
  onRowClick?: (row: any) => void;
};

export default function RankingPanel({ title, rows, labelKey, valueKey, onRowClick }: Props) {
  return (
    <div className="flex flex-col h-full pointer-events-auto">
      <div className="mb-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {rows.length === 0 ? (
          <div className="py-4 text-white/20 text-[10px] font-medium uppercase tracking-widest">No data available</div>
        ) : (
          rows.map((row, idx) => (
            <div 
              key={`${row[labelKey]}-${idx}`} 
              className={cn(
                "pro-card group cursor-pointer active:scale-95 transition-all",
                onRowClick && "hover:border-blue-500/30"
              )}
              onClick={() => onRowClick?.(row)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-500/80 uppercase">TOP {idx + 1}</span>
                  {row.type && (
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                      row.type === 'OBRA' ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {row.type}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-black text-white tabular-nums">
                  {formatCurrency(row[valueKey] ?? 0)}
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 truncate group-hover:text-white transition-colors uppercase tracking-tight">
                {row[labelKey]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
