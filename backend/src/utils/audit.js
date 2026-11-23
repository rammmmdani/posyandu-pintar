import { query } from '../config/db.js';

// Mencatat aktivitas penting. Jangan pernah mengirim password atau token ke sini.
export async function logAudit({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
  ip = null,
}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ip,
      ]
    );
  } catch (err) {
    // Kegagalan audit tidak boleh menggagalkan permintaan utama, tapi harus terlihat di log.
    console.error('Gagal menulis audit log:', err.message);
  }
}