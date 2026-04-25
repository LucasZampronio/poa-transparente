import { formatCurrency, type RankingRow } from '../lib/api';

type Props = {
  title: string;
  rows: RankingRow[];
  labelKey: 'company_name' | 'agency';
  valueKey: 'total_received' | 'total_spent';
};

export default function RankingPanel({ title, rows, labelKey, valueKey }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      <div className="p-0">
        <ul className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <li className="p-8 text-center text-slate-400 text-sm">Nenhum dado encontrado para este ranking.</li>
          ) : (
            rows.map((row, idx) => (
              <li key={`${row[labelKey]}-${idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                    {row[labelKey]}
                  </span>
                </div>
                <strong className="text-sm font-black text-slate-900 ml-4 tabular-nums">
                  {formatCurrency(row[valueKey] ?? 0)}
                </strong>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
