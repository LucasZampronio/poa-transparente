import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { formatCategoryLabel, type MapCategory, type MapPoint } from '../lib/api';

type Props = {
  points: MapPoint[];
  categories: MapCategory[];
  selectedCategories: string[];
  loading: boolean;
  error: string | null;
  onToggleCategory: (category: string) => void;
  onClearCategories: () => void;
};

const palette = ['#2563eb', '#059669', '#ea580c', '#7c3aed', '#dc2626', '#0f766e'];

function getCategoryColor(category: string, categories: MapCategory[]) {
  const index = categories.findIndex((item) => item.category === category);
  return palette[index >= 0 ? index % palette.length : 0];
}

export default function MapPanel({
  points,
  categories,
  selectedCategories,
  loading,
  error,
  onToggleCategory,
  onClearCategories,
}: Props) {
  const totalVisibleValue = points.reduce((total, point) => total + Number(point.contract_value), 0);
  const hasFilters = selectedCategories.length > 0;

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <h2>Mapa de investimentos</h2>
          <p className="panel-copy">
            Filtre por setor para isolar os contratos exibidos no mapa.
          </p>
        </div>
        <div className="map-kpi">
          <strong>{points.length}</strong>
          <span>pontos visiveis</span>
        </div>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`filter-chip ${!hasFilters ? 'is-active' : ''}`}
          onClick={onClearCategories}
        >
          Todos os setores
        </button>

        {categories.map((category) => {
          const active = selectedCategories.includes(category.category);
          const color = getCategoryColor(category.category, categories);

          return (
            <button
              key={category.category}
              type="button"
              className={`filter-chip ${active ? 'is-active' : ''}`}
              onClick={() => onToggleCategory(category.category)}
              style={
                active
                  ? {
                      borderColor: color,
                      backgroundColor: `${color}18`,
                      color,
                    }
                  : undefined
              }
            >
              <span>{formatCategoryLabel(category.category)}</span>
              <small>{Number(category.expenses_count).toLocaleString('pt-BR')}</small>
            </button>
          );
        })}
      </div>

      <div className="map-summary">
        <span>{hasFilters ? `${selectedCategories.length} setor(es) selecionado(s)` : 'Mostrando todos os setores'}</span>
        <strong>R$ {totalVisibleValue.toLocaleString('pt-BR')}</strong>
      </div>

      {error && <div className="map-message error">{error}</div>}
      {!error && !loading && points.length === 0 && (
        <div className="map-message">Nenhum ponto encontrado para os filtros selecionados.</div>
      )}

      <div className="map-shell">
        {loading && <div className="map-overlay">Atualizando mapa...</div>}

        <MapContainer center={[-30.03, -51.23]} zoom={11} style={{ height: 420, width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((point, index) => {
            const color = getCategoryColor(point.category, categories);

            return (
              <CircleMarker
                key={`${point.district}-${point.company_name}-${index}`}
                center={[point.latitude, point.longitude]}
                radius={Math.min(18, Math.max(4, Number(point.contract_value) / 80000))}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.45 }}
              >
                <Popup>
                  <strong>{point.company_name}</strong>
                  <br />
                  Setor: {formatCategoryLabel(point.category)}
                  <br />
                  Orgao: {point.agency}
                  <br />
                  Bairro: {point.district}
                  <br />
                  Valor: R$ {Number(point.contract_value).toLocaleString('pt-BR')}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
