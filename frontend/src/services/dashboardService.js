import { getChildren } from './childrenService';
import { getAlerts } from './alertsService';
import { getNotifications } from './notificationsService';
import { getUsers } from './usersService';

const totalOf = (res) => Number(res?.meta?.total ?? 0);

export async function getDashboardData() {
  const [active, inactive, newAlerts, followedUp, recentAlerts, notifications, users] =
    await Promise.all([
      getChildren({ limit: 1, status: 'aktif' }),
      getChildren({ limit: 1, status: 'nonaktif' }),
      getAlerts({ limit: 1, status: 'baru' }),
      getAlerts({ limit: 1, status: 'ditindaklanjuti' }),
      getAlerts({ limit: 5, status: 'baru' }),
      getNotifications({ limit: 1 }),
      getUsers({ limit: 1 }),
    ]);

  return {
    totals: {
      children_active: totalOf(active),
      children_inactive: totalOf(inactive),
      alerts_baru: totalOf(newAlerts),
      alerts_ditindaklanjuti: totalOf(followedUp),
      notifications_unread: Number(notifications?.meta?.unread_count ?? 0),
      users: totalOf(users),
    },
    recent_alerts: recentAlerts?.data ?? [],
  };
}
