import type { TimeseriesRow } from '../lib/api';

type Props = {
  rows: TimeseriesRow[];
};

export default function TimeseriesPanel({ rows }: Props) {
  const max = Math.max(...rows.map((row) => Number(row.total_spent)), 1);

  return (
    <div className="panel">
      <h2>Evolução de Despesas</h2>
      <div className="bar-chart">
        {rows.map((row) => {
          const height = (Number(row.total_spent) / max) * 180;
          return (
            <div key={row.month} className="bar-item">
              <div className="bar" style={{ height }} title={`${row.month} - ${row.total_spent}`} />
              <small>{row.month.slice(2)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
