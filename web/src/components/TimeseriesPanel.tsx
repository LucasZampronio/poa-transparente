import { formatCurrency, type TimeseriesRow } from '../lib/api';

type Props = {
  rows: TimeseriesRow[];
};

export default function TimeseriesPanel({ rows }: Props) {
  const max = Math.max(...rows.map((row) => Number(row.total_spent)), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">Evolucao Mensal de Despesas</h2>
      </div>
      <div className="p-6">
        <div className="flex items-end justify-between gap-2 h-48">
          {rows.length === 0 ? (
            <div className="w-full flex items-center justify-center text-slate-400 text-sm italic">
              Aguardando dados historicos...
            </div>
          ) : (
            rows.map((row) => {
              const height = (Number(row.total_spent) / max) * 100;
              return (
                <div key={row.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600 cursor-help min-h-[4px]" 
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {row.month}: {formatCurrency(row.total_spent)}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {row.month.slice(2)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
