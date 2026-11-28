
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssessment, getGrowth } from '../../services/growthService';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import GrowthChart from '../growth/GrowthChart';
import GrowthTable from '../growth/GrowthTable';
import { toneForCategory } from '../growth/growthStatus';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

export function AssessmentSummary({ assessment }) {
  const rows = Object.entries(assessment.indicators);

  return (
    <Card>
      <h3 className="font-semibold">
        Hasil penilaian terbaru
      </h3>

      <p className="mt-1 text-xs text-redam">
        Referensi {assessment.reference_version}, perhitungan v
        {assessment.calculation_version},{' '}
        {formatDate(assessment.assessed_at)}
      </p>

      <ul className="mt-3 divide-y divide-garis">
        {rows.map(([key, ind]) => (
          <li key={key} className="py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{ind.label}</span>

              {ind.status === 'dihitung' ? (
                <span className="flex items-center gap-2">
                  <b>
                    z = {String(ind.zscore).replace('.', ',')}
                  </b>

                  {ind.category ? (
                    <Badge tone={toneForCategory(ind.category.code, ind.category.label)}>
                      {ind.category.label}
                    </Badge>
                  ) : (
                    <Badge tone="netral">
                      Kategori belum tersedia
                    </Badge>
                  )}
                </span>
              ) : (
                <Badge tone="netral">
                  Belum dapat dihitung
                </Badge>
              )}
            </div>

            {ind.reason && (
              <p className="mt-1 text-xs text-redam">
                {ind.reason}
              </p>
            )}
          </li>
        ))}
      </ul>

      {assessment.overall_note && (
        <p className="mt-3 text-xs text-redam">
          {assessment.overall_note}
        </p>
      )}
    </Card>
  );
}

export default function ChildGrowthSection({ childId, latest }) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    growth: null,
    assessment: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const growth = await getGrowth(childId);

        let assessment = null;

        if (latest) {
          try {
            assessment = (await getAssessment(latest.id)).data;
          } catch (err) {
            if (err.response?.status !== 404) {
              throw err;
            }
          }
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            growth: growth.data,
            assessment,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: getErrorMessage(err),
            growth: null,
            assessment: null,
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [childId, latest?.id]);

  if (state.loading) {
    return <Spinner />;
  }

  if (state.error) {
    return <Alert tone="error">{state.error}</Alert>;
  }

  const { growth, assessment } = state;

  if (growth.points.length === 0) {
    return (
      <Card>
        <h2 className="font-semibold">
          Pengukuran
        </h2>

        <p className="mt-2 text-sm text-redam">
          Belum ada pengukuran. Klik “Tambah pengukuran”
          untuk mencatat yang pertama.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">
        Pertumbuhan dan riwayat pengukuran
      </h2>

      {latest?.validity_status === 'perlu_diperiksa' && (
        <Alert
          tone="warning"
          title="Pengukuran terakhir perlu diperiksa"
        >
          Data berada di luar batas kewajaran sementara dan
          tidak dipakai untuk penilaian. Periksa ulang
          pengukurannya.{' '}
          <Link
            to={`/balita/${childId}/pengukuran/baru`}
            className="underline"
          >
            Catat ulang
          </Link>
        </Alert>
      )}

      {assessment && (
        <AssessmentSummary assessment={assessment} />
      )}

      <GrowthChart points={growth.points} />

      <GrowthTable points={growth.points} />
    </section>
  );
}
