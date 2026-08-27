import { Modal } from "@/components/forms";
import { PaymentList } from "@/components/payment-list";
import { Shell } from "@/components/shell";
import { PaymentForm } from "@/components/studio-forms";
import { PlaidConnect } from "@/components/plaid-connect";
import { StudentBalances } from "@/components/student-balances";
import { OutstandingLedger } from "@/components/outstanding-ledger";
import { Card } from "@/components/ui";
import { monthKey } from "@/lib/dates";
import { readStudio } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { monthBookedCents, monthReceivedCents, paymentsByStatus } from "@/lib/queries";
import { plaidConfigured, readPlaidConnection } from "@/lib/plaid";
import { dataOwnerId } from "@/lib/auth";

export default async function MoneyPage() {
  const ownerId = await dataOwnerId();
  const studio = readStudio(ownerId);
  const students = Object.fromEntries(studio.students.map((student) => [student.id, student]));
  const active = studio.students.filter((student) => student.status !== "archived");
  const missing = paymentsByStatus(studio, "missing");
  const upcoming = paymentsByStatus(studio, "upcoming");
  const received = studio.payments
    .filter((payment) => payment.status === "received")
    .sort((a, b) => (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""));
  const month = monthKey();
  const plaid = readPlaidConnection(ownerId);

  return (
    <Shell
      eyebrow="Ledger"
      title="Zelle"
      actions={
        <Modal title="Log a payment" label="Log payment">
          <PaymentForm students={active} />
        </Modal>
      }
    >
      <PlaidConnect configured={plaidConfigured()} connected={Boolean(plaid)} institutionName={plaid?.institutionName} lastSyncedAt={plaid?.lastSyncedAt} reconciliationLog={plaid?.reconciliationLog} />
      <div className="stat-strip mb-16 grid sm:grid-cols-3">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Missing</p>
          <p className="mt-2 font-serif text-3xl">
            {formatMoney(missing.reduce((sum, payment) => sum + payment.amountCents, 0))}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Upcoming</p>
          <p className="mt-2 font-serif text-3xl">
            {formatMoney(upcoming.reduce((sum, payment) => sum + payment.amountCents, 0))}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Received this month</p>
          <p className="mt-2 font-serif text-3xl">{formatMoney(monthReceivedCents(studio, month))}</p>
          <p className="text-sm text-mute">booked {formatMoney(monthBookedCents(studio, month))}</p>
        </Card>
      </div>

      <div className="content-flow">
        <StudentBalances students={active} payments={studio.payments} />

        <OutstandingLedger missing={missing} upcoming={upcoming} students={students} zelleHandle={studio.settings.zelleHandle} />

      <Card className="content-section">
        <h2 className="mb-3 font-serif text-2xl">Received</h2>
        <PaymentList payments={received} students={students} zelleHandle={studio.settings.zelleHandle} defaultSort="due-desc" pageSize={8} emptyTitle="No received payments" emptyBody="Mark a transfer received when it hits Zelle." />
      </Card>
      </div>
    </Shell>
  );
}
