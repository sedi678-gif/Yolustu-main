"use client";

import { useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';
import AppBottomNav from '@/app/components/AppBottomNav';
import AppLink from '@/app/components/AppLink';
import {
  USER_PLAN_LABELS,
  VIP_PRO_PRICE_AZN,
  canAccessAllFeatures,
  canEarnXp,
  canViewAnalytics,
  normalizeUserPlanState,
  purchaseVipProPlan,
  setProPanelActive,
  shouldShowAds,
} from '@/app/lib/userPlan';

export default function PlanDashboard() {
  const { userId, manat, playerProfile } = useUser();
  const plan = useMemo(
    () => normalizeUserPlanState(playerProfile as unknown as Record<string, unknown> | null),
    [playerProfile]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showAds = shouldShowAds(plan);
  const analyticsOpen = canViewAnalytics(plan);
  const allToolsOpen = canAccessAllFeatures(plan);
  const xpOn = canEarnXp(plan);

  const run = async (fn: () => Promise<unknown>) => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Əməliyyat alınmadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      <header className="border-b border-white/10 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Pano</p>
        <h1 className="mt-1 text-2xl font-black">Professional Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paket: <span className="font-bold text-white">{USER_PLAN_LABELS[plan.userPlan]}</span>
          {' · '}
          {xpOn ? 'XP açıqdır' : 'Sosial rejim — oyun/izləmə XP-si sönülüdür'}
        </p>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
        {showAds ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Reklam</p>
            <p className="mt-1 text-sm text-amber-50">
              VIP Professional (30 AZN, bir dəfə) alanda bütün reklamlar həmişəlik sönür.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            VIP Pass aktivdir — reklam yoxdur.
          </section>
        )}

        {error ? <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold">İzləmələr</h2>
          <p className="mt-1 text-sm text-slate-400">Hər kəsə açıqdır. Öz izləyici və izləmə statistikası.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-xs text-slate-400">İzləyicilər</p>
              <p className="text-2xl font-black">—</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-xs text-slate-400">İzləmələr</p>
              <p className="text-2xl font-black">—</p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold">Dərin Analitika</h2>
          <p className="mt-1 text-sm text-slate-400">Yalnız Adi Professional və VIP Professional.</p>
          {analyticsOpen ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>Oyun və izləmə trendi, günlük aktivlik, paketinə uyğun hesabat.</p>
              <p className="text-cyan-300">Analitika açıqdır.</p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="pointer-events-none select-none blur-sm">
                <p className="text-sm">Gizli qrafiklər · retention · conversion</p>
                <div className="mt-2 h-16 rounded-xl bg-gradient-to-r from-cyan-700 to-indigo-700" />
              </div>
              <p className="mt-3 text-sm font-semibold text-amber-200">Kilitlidir — Professional Pano açın.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold">Bütün Sayt Alətləri</h2>
          <p className="mt-1 text-sm text-slate-400">Yalnız VIP Professional.</p>
          {allToolsOpen ? (
            <p className="mt-3 text-sm text-emerald-200">Bütün alətlər açıqdır.</p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => purchaseVipProPlan(userId))}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
            >
              {busy ? 'Gözləyin…' : `${VIP_PRO_PRICE_AZN} AZN — VIP Professional al`}
            </button>
          )}
          <p className="mt-2 text-xs text-slate-500">Balans: {manat.toLocaleString('az-AZ')} ₼</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className={`rounded-2xl border p-4 ${plan.userPlan === 'FREE' ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10 bg-slate-900/80'}`}>
            <h3 className="font-black">Adi Pano</h3>
            <p className="mt-1 text-xs text-slate-400">Pulsuz · reklam var · əsas funksiyalar</p>
            <p className="mt-3 text-lg font-black">0 AZN</p>
          </article>
          <article className={`rounded-2xl border p-4 ${plan.userPlan === 'PRO' ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10 bg-slate-900/80'}`}>
            <h3 className="font-black">Adi Professional</h3>
            <p className="mt-1 text-xs text-slate-400">Pulsuz · öz analitikan · reklam var · XP sönür</p>
            <p className="mt-3 text-lg font-black">0 AZN</p>
          </article>
          <article className={`rounded-2xl border p-4 ${plan.userPlan === 'VIP_PRO' ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-slate-900/80'}`}>
            <h3 className="font-black">VIP Professional</h3>
            <p className="mt-1 text-xs text-slate-400">Birdəfəlik · bütün alətlər · həmişəlik VIP Pass</p>
            <p className="mt-3 text-lg font-black">{VIP_PRO_PRICE_AZN} AZN</p>
          </article>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => setProPanelActive(userId, !plan.proPanelActive))}
            className="flex-1 rounded-xl border border-white/15 bg-slate-800 px-4 py-3 text-sm font-bold"
          >
            {plan.proPanelActive ? 'Sosial rejimi bağla (XP açılacaq)' : 'Sosial rejimi aç (XP sönəcək)'}
          </button>
          <AppLink href="/profile" className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-bold">
            Profilə qayıt
          </AppLink>
        </div>
      </main>

      <AppBottomNav activeTab="profile" />
    </div>
  );
}
