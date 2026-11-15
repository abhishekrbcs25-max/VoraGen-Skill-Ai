import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  RefreshCw,
  RotateCcw,
  Tag,
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  buildGstInvoiceHtml,
  calculateSubscriptionCheckout,
} from '../utils/platformEngines';
import type { BillingTransaction, SubscriptionPlanId, UserProfile } from '../types';

interface PricingBillingViewProps {
  profile: UserProfile;
  sessionToken?: string;
  onUpdateProfile: (next: UserProfile) => void;
  onRequireAuth: (reason: string) => boolean;
}

export function PricingBillingView({
  profile,
  sessionToken,
  onUpdateProfile,
  onRequireAuth,
}: PricingBillingViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('pro-monthly');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const checkoutSummary = useMemo(
    () => calculateSubscriptionCheckout(selectedPlan, couponCode),
    [selectedPlan, couponCode],
  );

  useEffect(() => {
    if (!sessionToken) return;
    fetch('/api/billing/history', {
      headers: { 'x-voragen-token': sessionToken },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { transactions?: BillingTransaction[] } | null) => {
        if (d?.transactions) setTransactions(d.transactions);
      })
      .catch(() => {});
  }, [sessionToken]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('upgrade or purchase a VoraGen plan')) return;
    setProcessing(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod,
          couponCode,
          simulateFailure,
        }),
      });
      const data = (await res.json()) as {
        transaction?: BillingTransaction;
        activePlan?: SubscriptionPlanId;
        error?: string;
      };
      if (data.transaction) {
        setTransactions((prev) => [data.transaction!, ...prev]);
      }
      if (res.ok && data.activePlan) {
        onUpdateProfile({
          ...profile,
          subscriptionPlan: data.activePlan,
          autoRenewSubscription: true,
        });
        setStatusMessage(`Payment verified! Active Plan: ${checkoutSummary.plan.name}.`);
      } else {
        setStatusMessage(data.error || 'Payment could not be completed — retry with another method.');
      }
    } catch {
      setStatusMessage('Billing network unavailable.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadInvoice = (tx: BillingTransaction) => {
    const html = buildGstInvoiceHtml(tx);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tx.invoiceNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefund = async (txId: string) => {
    if (!onRequireAuth('request a subscription refund')) return;
    try {
      const res = await fetch(`/api/billing/transactions/${txId}/refund`, {
        method: 'POST',
        headers: sessionToken ? { 'x-voragen-token': sessionToken } : {},
      });
      const data = (await res.json()) as { transaction?: BillingTransaction };
      if (res.ok && data.transaction) {
        setTransactions((prev) => prev.map((t) => (t.id === txId ? data.transaction! : t)));
        onUpdateProfile({ ...profile, subscriptionPlan: 'free', autoRenewSubscription: false });
        setStatusMessage('Refund processed cleanly and subscription returned to Starter Free.');
      }
    } catch {
      // Ignore
    }
  };

  const activePlan = profile.subscriptionPlan || 'free';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Subscription Plans, Checkout & GST Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Transparent pricing for students, job seekers, and scholarship cohorts with UPI, Cards, promo coupons, and automated GST billing.
          </p>
        </div>

        <div className="text-xs font-semibold text-emerald-700 dark:text-amber-400">
          Active Plan: <span className="uppercase">{activePlan}</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isCurrent = activePlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-[#0B2545] dark:border-amber-400 bg-[#F4F7FB] dark:bg-[#0F213E]'
                  : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628]'
              }`}
            >
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-emerald-700 dark:text-amber-400">
                  {plan.audience}
                </p>
                <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                  {plan.name}
                </h2>
                <p className="font-mono text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
                  INR {plan.priceInr}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {plan.billingCycle}
                  </span>
                </p>
                <ul className="space-y-1.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full py-2 rounded-lg text-xs font-semibold ${
                  isCurrent
                    ? 'bg-emerald-600 text-white'
                    : isSelected
                      ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                      : 'border border-slate-300 dark:border-[#1E3A5F]/70 text-[#0B2545] dark:text-white'
                }`}
              >
                {isCurrent ? 'Current Plan' : isSelected ? 'Selected for Checkout' : 'Choose Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-900 dark:text-amber-200"
        >
          {statusMessage}
        </div>
      )}

      {/* Checkout & Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCheckout}
          className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4 text-xs"
        >
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <span>Secure Checkout ({checkoutSummary.plan.name})</span>
          </h2>

          <div className="grid grid-cols-3 gap-2">
            {(['UPI', 'Card', 'NetBanking'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-2 rounded-lg font-semibold border ${
                  paymentMethod === m
                    ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8]'
                    : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="promo-coupon" className="font-semibold flex items-center gap-1.5 mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Coupon / Referral Code (Try VORAGEN20, STUDENT50, REFER10)</span>
            </label>
            <input
              id="promo-coupon"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white uppercase font-mono"
            />
          </div>

          <div className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-1.5 font-mono tabular-nums">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>INR {checkoutSummary.subtotalInr}</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
              <span>Discount {checkoutSummary.couponLabel ? `(${checkoutSummary.couponLabel})` : ''}</span>
              <span>-INR {checkoutSummary.discountInr}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%)</span>
              <span>INR {checkoutSummary.gstInr}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-slate-200 dark:border-white/10 pt-1.5 text-[#0B2545] dark:text-white">
              <span>Total Payable</span>
              <span>INR {checkoutSummary.totalInr}</span>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span>Simulate bank gateway failure (for retry test)</span>
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="w-4 h-4 accent-[#0B2545]"
            />
          </label>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {processing
              ? 'Processing...'
              : simulateFailure
                ? 'Test Payment Failure'
                : `Pay INR ${checkoutSummary.totalInr} via ${paymentMethod}`}
          </button>

          {activePlan !== 'free' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() =>
                  onUpdateProfile({
                    ...profile,
                    autoRenewSubscription: !profile.autoRenewSubscription,
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto-Renew: {profile.autoRenewSubscription ? 'On' : 'Paused'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateProfile({
                    ...profile,
                    subscriptionPlan: 'free',
                    autoRenewSubscription: false,
                  })
                }
                className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </form>

        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4 text-xs">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            Payment History & Downloadable GST Invoices ({transactions.length})
          </h2>

          {transactions.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No transactions yet. Complete checkout to generate verifiable GST invoices and manage refunds.
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-[#0B2545] dark:text-white">
                      {tx.invoiceNumber} · {tx.planName} ({tx.status})
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                      INR {tx.totalInr} (incl. INR {tx.gstInr} GST) · {tx.paymentMethod} · {tx.createdAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(tx)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B2545] text-white dark:bg-[#1D4ED8] font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>GST Invoice</span>
                    </button>
                    {tx.status === 'Paid' && (
                      <button
                        type="button"
                        onClick={() => handleRefund(tx.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/45 text-amber-800 dark:text-amber-300 font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Refund</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
