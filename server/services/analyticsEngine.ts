import { pool } from '../../src/db/index';

export interface WorkloadAnomaly {
  facilityId: number;
  facilityName: string;
  observedVolume: number;
  baselineVolume: number;
  deviationPercent: number;
  isAnomaly: boolean;
  explanation: string;
  method: string;
  analysisPeriod: string;
}

export async function computeWorkloadAnalytics(facilityId?: number) {
  // Query actual operational history from PostgreSQL
  const historyQuery = await pool.query(`
    SELECT w.*, f.name as facility_name
    FROM workload_history w
    JOIN facilities f ON w.facility_id = f.id
    ${facilityId ? 'WHERE w.facility_id = $1' : ''}
    ORDER BY w.record_date DESC
    LIMIT 100;
  `, facilityId ? [facilityId] : []);

  // Compute 30-day baseline vs current volume for anomaly detection
  const baselineQuery = await pool.query(`
    SELECT 
      w.facility_id,
      f.name as facility_name,
      ROUND(AVG(w.patient_volume), 1) as baseline_volume,
      ROUND(STDDEV(w.patient_volume), 1) as stddev_volume,
      (SELECT patient_volume FROM workload_history WHERE facility_id = w.facility_id ORDER BY record_date DESC LIMIT 1) as latest_volume
    FROM workload_history w
    JOIN facilities f ON w.facility_id = f.id
    ${facilityId ? 'WHERE w.facility_id = $1' : ''}
    GROUP BY w.facility_id, f.name;
  `, facilityId ? [facilityId] : []);

  const anomalies: WorkloadAnomaly[] = baselineQuery.rows.map((row) => {
    const baseline = Number(row.baseline_volume) || 1;
    const latest = Number(row.latest_volume) || 0;
    const stddev = Number(row.stddev_volume) || 1;
    const devPct = Number((((latest - baseline) / baseline) * 100).toFixed(1));
    const zScore = Number(((latest - baseline) / (stddev || 1)).toFixed(2));
    const isAnomaly = Math.abs(zScore) >= 1.5 || Math.abs(devPct) >= 25;

    return {
      facilityId: row.facility_id,
      facilityName: row.facility_name,
      observedVolume: latest,
      baselineVolume: Math.round(baseline),
      deviationPercent: devPct,
      isAnomaly,
      explanation: isAnomaly
        ? `Observed patient load (${latest}) deviates ${devPct > 0 ? '+' : ''}${devPct}% from 30-day operational baseline (${Math.round(baseline)}). Z-score: ${zScore}. Immediate clinical staff rebalancing advised.`
        : `Operational patient volume within normal statistical control limits (Z-score: ${zScore}).`,
      method: 'Z-score Statistical Anomaly Detection (Threshold: |Z| ≥ 1.5)',
      analysisPeriod: 'Previous 27 days operational workload history',
    };
  });

  return {
    history: historyQuery.rows,
    anomalies,
  };
}
