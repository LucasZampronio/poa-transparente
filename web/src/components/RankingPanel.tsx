import type { RankingRow } from '../lib/api';

type Props = {
  title: string;
  rows: RankingRow[];
  labelKey: 'company_name' | 'agency';
  valueKey: 'total_received' | 'total_spent';
};

export default function RankingPanel({ title, rows, labelKey, valueKey }: Props) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <ol className="ranking-list">
        {rows.map((row, idx) => (
          <li key={`${row[labelKey]}-${idx}`}>
            <span>{row[labelKey]}</span>
            <strong>R$ {Number(row[valueKey] ?? 0).toLocaleString('pt-BR')}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}
