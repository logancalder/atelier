import type { Payment, Session, Studio } from './types';
export const eligibleSession = (session: Session | undefined) => !!session && (session.status === 'scheduled' || session.status === 'completed');
export const cancelledSession = (session: Session | undefined) => session?.status === 'cancelled' || session?.status === 'late_cancel';
export function eligiblePayment(studio: Studio, payment: Payment) {
  if (payment.status === 'cancelled') return false;
  if (!payment.sessionId) return payment.kind !== 'session';
  return eligibleSession(studio.sessions.find(s=>s.id === payment.sessionId));
}
/** Preserve receipt IDs and bank references while releasing cancelled associations.
 * Reuse equal-value credit on the next unpaid eligible session; otherwise retain credit. */
export function reconcileCancelledPayments(studio: Studio) {
  for (const payment of studio.payments) {
    const session=studio.sessions.find(s=>s.id === payment.sessionId);
    if (!cancelledSession(session)) continue;
    if (payment.status === 'received' || payment.receivedAt || payment.plaidTransactionId) {
      payment.originalSessionId ||= payment.sessionId;
      payment.originalDueDate ||= payment.dueDate;
      payment.sessionId=null;
      payment.status='received';
    } else { payment.status='cancelled'; }
  }
  const consumed = new Set<string>();
  for (const credit of studio.payments) {
    if (credit.status !== 'received' || credit.sessionId || !credit.originalSessionId) continue;
    const candidates=studio.payments.filter(p=>p.id !== credit.id && !consumed.has(p.id) && p.studentId === credit.studentId && p.sessionId && eligiblePayment(studio,p) && (p.status === 'missing' || p.status === 'upcoming') && p.amountCents === credit.amountCents && p.dueDate >= (credit.originalDueDate || credit.dueDate)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id));
    const target=candidates[0];
    if (!target) continue;
    credit.sessionId=target.sessionId; credit.dueDate=target.dueDate;
    consumed.add(target.id);
  }
  studio.payments=studio.payments.filter(p=>!consumed.has(p.id));
}
