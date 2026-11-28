import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAlerts } from '../../services/alertsService';
import { SeverityBadge, StatusBadge, ValidationTag } from '../alerts/alertLabels';
import Card from '../../components/ui/Card';

// Menampilkan peringatan yang masih terbuka untuk anak ini. Kegagalan memuat tidak mengganggu halaman.
export default function ChildAlertsCard({ childId, refreshKey }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getAlerts({ child_id: childId, limit: 20 })
      .then((res) => setAlerts(res.data.filter((a) => a.status !== 'ditutup')))
      .catch(() => setAlerts([]));
  }, [childId, refreshKey]);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-amber-600">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Peringatan yang masih terbuka</h2>
        <ValidationTag validated={alerts.every((a) => a.is_validated)} />
      </div>
      <ul className="mt-3 divide-y divide-garis">
        {alerts.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
            <Link to={`/peringatan/${a.id}`} className="max-w-md hover:underline">{a.message}</Link>
            <span className="flex gap-2"><SeverityBadge severity={a.severity} /><StatusBadge status={a.status} /></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}