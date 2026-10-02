import { writeAuditLog } from '../services/audit.service.js';
import { revalidateFrontend } from './revalidate.js';

// Call only after the mutation commits. An audit outage must still invalidate
// public views; its original error remains visible to the caller.
export async function auditPublicMutation(audit: Parameters<typeof writeAuditLog>[0], paths: string[]): Promise<void> {
    try {
        await writeAuditLog(audit);
    } finally {
        if (paths.length) await revalidateFrontend(paths);
    }
}
