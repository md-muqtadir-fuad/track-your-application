import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Award } from 'lucide-react';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { CountdownBadge } from '../ui/CountdownBadge';
import type { Offer, Application, University } from '../../lib/db/schema';

export const OffersView: React.FC = () => {
  const { repos, userTz, version, refresh } = useDatabase();
  const { showToast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [allOffers, allApps, allUnis] = await Promise.all([
      repos.offers.listAll(),
      repos.applications.list(),
      repos.universities.list(),
    ]);
    setOffers(allOffers);
    setApplications(allApps);
    setUniversities(allUnis);
  }, [repos]);

  useEffect(() => {
    loadData();
  }, [loadData, version]);

  const uniMap = useMemo(() => {
    const map = new Map<string, University>();
    for (const u of universities) {
      map.set(u.id, u);
    }
    return map;
  }, [universities]);

  // Admitted applications or applications with an offer
  const admittedOrOfferedApps = useMemo(() => {
    return applications.filter(
      (a) => a.status === 'Admitted' || offers.some((o) => o.application_id === a.id),
    );
  }, [applications, offers]);

  const handleDecisionChange = async (
    offer: Offer,
    decision: 'pending' | 'accepted' | 'declined',
  ) => {
    if (!repos) return;
    await repos.offers.upsert({
      ...offer,
      decision,
    });
    showToast({ message: `Offer response updated to ${decision}.` });
    refresh();
  };

  const normaliseAnnualStipend = (amount?: number | null, period?: string): number => {
    if (!amount) return 0;
    if (period === 'month') return amount * 12;
    if (period === 'semester') return amount * 2;
    return amount;
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
          <Award className="h-5 w-5 text-amber-500" />
          <span>Council of Graduate Schools (CGS) April 15 Resolution</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Under the CGS agreement, you are under no obligation to respond to offers of financial
          support prior to April 15. The deadline is 11:59 PM on April 15 in the offering school's
          time zone.
        </p>
      </div>

      {/* Offers side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admittedOrOfferedApps.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
            No admitted programs or funding offers recorded yet. When you receive admission or
            funding, record offer terms here to compare them side by side.
          </div>
        ) : (
          admittedOrOfferedApps.map((app) => {
            const uni = uniMap.get(app.university_id);
            const offer = offers.find((o) => o.application_id === app.id);
            const annualStipend = normaliseAnnualStipend(
              offer?.stipend_amount,
              offer?.stipend_period,
            );

            return (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {uni?.name}
                      </h4>
                      <p className="text-xs text-slate-500">{app.program}</p>
                    </div>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Admitted
                    </span>
                  </div>

                  {offer ? (
                    <div className="mt-4 space-y-3 text-xs">
                      {/* Stipend */}
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                        <span className="text-[11px] text-slate-400 block">Annual Stipend</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                            ${annualStipend.toLocaleString()}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {offer.currency} / year
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Funding: <span className="capitalize">{offer.funding_type}</span> (Nominal
                          figure)
                        </span>
                      </div>

                      {/* Coverage checklist */}
                      <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Tuition Coverage:</span>
                          <span className="font-semibold capitalize text-emerald-600">
                            {offer.tuition} Waiver
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Health Insurance:</span>
                          <span className="font-semibold capitalize text-emerald-600">
                            {offer.health_insurance} Coverage
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Years Guaranteed:</span>
                          <span className="font-semibold">
                            {offer.years_guaranteed
                              ? `${offer.years_guaranteed} Years`
                              : 'Not specified'}
                          </span>
                        </div>
                      </div>

                      {/* Response deadline */}
                      {offer.response_due_local && uni && (
                        <div className="pt-2">
                          <span className="text-[11px] text-slate-400 block mb-1">
                            Response Deadline
                          </span>
                          <CountdownBadge
                            dueLocal={offer.response_due_local}
                            schoolTz={uni.tz}
                            userTz={userTz}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-400 dark:bg-slate-850">
                      No funding offer details recorded yet.
                    </div>
                  )}
                </div>

                {/* Response decision selector */}
                {offer && (
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">My Decision:</span>
                    <select
                      value={offer.decision}
                      onChange={(e) =>
                        handleDecisionChange(
                          offer,
                          e.target.value as 'pending' | 'accepted' | 'declined',
                        )
                      }
                      className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800 font-medium"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted Offer</option>
                      <option value="declined">Declined Offer</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
