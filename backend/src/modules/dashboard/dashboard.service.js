import * as repo from "./dashboard.repository.js";
import { buildDistribution } from "./stats.js";

export async function getSummary(user) {
  const pid = user.posyandu_id;
  const [posyandu, c, bySeverity, attention, latest] = await Promise.all([
    repo.posyandu(pid),
    repo.counts(pid),
    repo.openAlertsBySeverity(pid),
    repo.attentionList(pid, 10),
    repo.latestAssessments(pid, { activeOnly: true }),
  ]);

  return {
    posyandu,
    totals: {
      children_active: c.children_active,
      children_inactive: c.children_inactive,
      measurements_this_month: c.measurements_this_month,
      children_measured_this_month: c.children_measured_this_month,
      alerts_unhandled: c.alerts_baru + c.alerts_dilihat,
      alerts_baru: c.alerts_baru,
      alerts_in_progress: c.alerts_ditindaklanjuti,
      follow_ups_this_month: c.follow_ups_this_month,
    },
    open_alerts_by_severity: bySeverity,
    attention: attention.map((a) => ({
      alert_id: a.id,
      child: { id: a.child_id, name: a.child_name },
      severity: a.severity,
      status: a.status,
      message: a.message,
      days_open: a.days_open,
    })),
    category_distribution: buildDistribution(latest),
    generated_at: new Date().toISOString(),
  };
}
