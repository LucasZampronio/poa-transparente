import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { MapPoint } from '../lib/api';

type Props = {
  points: MapPoint[];
};

export default function MapPanel({ points }: Props) {
  return (
    <div className="panel">
      <h2>Mapa de Investimentos</h2>
      <MapContainer center={[-30.03, -51.23]} zoom={11} style={{ height: 420, width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, index) => (
          <CircleMarker
            key={`${point.district}-${index}`}
            center={[point.latitude, point.longitude]}
            radius={Math.min(18, Math.max(4, Number(point.contract_value) / 80000))}
            pathOptions={{ color: '#0b69ff', fillOpacity: 0.4 }}
          >
            <Popup>
              <strong>{point.company_name}</strong>
              <br />
              Órgão: {point.agency}
              <br />
              Bairro: {point.district}
              <br />
              Valor: R$ {Number(point.contract_value).toLocaleString('pt-BR')}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
