import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getValidOrgSession } from "@/lib/session";
import HamburgerMenu from "@/components/HamburgerMenu";

const API = "/api/stripe";

interface BillingStatus {
  trialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  subscription: {
    id: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
}

interface Price {
  price_id: string;
  unit_amount: number;
  currency: string;
  product_name: string;
  product_description: string;
}

export default function OrgBillingPage() {
  const [, navigate] = useLocation();
  const session = getValidOrgSession();

  // All hooks must come before any early return
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setMessage({ type: "success", text: "Subscription activated! Welcome aboard." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("cancelled") === "true") {
      setMessage({ type: "info", text: "Checkout cancelled — no charge was made." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    async function load() {
      setLoading(true);
      try {
        const token = session!.token ?? "";
        const [statusRes, pricesRes] = await Promise.all([
          fetch(`${API}/billing-status`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/prices`),
        ]);
        if (statusRes.ok) setBilling(await statusRes.json());
        if (pricesRes.ok) {
          const json = await pricesRes.json();
          setPrices(json.data ?? []);
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Guard: must be logged in with org email/password to manage billing
  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-neutral-400 text-sm text-center max-w-xs">
          Sign in with your church admin account to manage billing.
        </p>
        <button
          onClick={() => navigate("/org/login")}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl px-6 py-3 transition"
        >
          Sign In
        </button>
        <button
          onClick={() => navigate("/team")}
          className="text-neutral-600 hover:text-neutral-400 text-xs transition"
        >
          ← Back to Teams
        </button>
      </div>
    );
  }

  async function handleSubscribe(priceId: string) {
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${API}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token ?? ""}`,
        },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setMessage({ type: "info", text: json.error ?? "Could not start checkout." });
    } catch {
      setMessage({ type: "info", text: "Network error. Try again." });
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/orgs/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.token ?? ""}` },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const ends = new Date(json.newTrialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        setCouponMsg({ ok: true, text: `✓ ${json.days} days added — trial now ends ${ends}` });
        setCouponCode("");
        // Refresh billing status
        const statusRes = await fetch("/api/stripe/billing-status", { headers: { Authorization: `Bearer ${session?.token ?? ""}` } });
        if (statusRes.ok) setBilling(await statusRes.json());
      } else {
        setCouponMsg({ ok: false, text: json.message ?? "Invalid code." });
      }
    } catch {
      setCouponMsg({ ok: false, text: "Network error. Try again." });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API}/portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.token ?? ""}` },
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setMessage({ type: "info", text: json.error ?? "Could not open billing portal." });
    } catch {
      setMessage({ type: "info", text: "Network error. Try again." });
    } finally {
      setPortalLoading(false);
    }
  }

  const hasActiveSub =
    billing?.subscription?.status === "active" ||
    billing?.subscription?.status === "trialing";

  const subStatusLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial via Stripe",
    past_due: "Past Due",
    canceled: "Cancelled",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    unpaid: "Unpaid",
    paused: "Paused",
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/team")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.12em", padding: 0 }}
          onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          ← Back
        </button>
        <HamburgerMenu />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {message && (
          <div
            className={`rounded-xl px-5 py-4 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-950/60 border border-green-700/50 text-green-300"
                : "bg-blue-950/60 border border-blue-700/50 text-blue-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-neutral-500 text-sm text-center py-16">Loading billing info…</div>
        ) : (
          <>
            {/* Trial status card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Free Trial
              </h2>
              {billing?.trialActive ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {billing.trialDaysLeft}{" "}
                      <span className="text-base font-normal text-neutral-400">
                        day{billing.trialDaysLeft !== 1 ? "s" : ""} remaining
                      </span>
                    </p>
                    {billing.trialEndsAt && (
                      <p className="text-neutral-500 text-xs mt-1">
                        Trial ends {new Date(billing.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className="bg-green-900/50 text-green-400 border border-green-700/40 text-xs font-semibold rounded-full px-3 py-1">
                    Active Trial
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-neutral-400 text-sm">Your free trial has ended.</p>
                  <span className="bg-red-900/50 text-red-400 border border-red-700/40 text-xs font-semibold rounded-full px-3 py-1">
                    Trial Expired
                  </span>
                </div>
              )}
            </div>

            {/* Coupon code */}
            {!billing?.subscription && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  Have a Code?
                </h2>
                <div className="flex gap-3">
                  <input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null); }}
                    onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Enter code (e.g. FOREVER22)"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-neutral-500 outline-none focus:border-purple-500 transition font-mono tracking-wider uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition shrink-0"
                  >
                    {couponLoading ? "…" : "Apply"}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`text-sm mt-3 ${couponMsg.ok ? "text-green-400" : "text-red-400"}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>
            )}

            {/* Subscription card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Subscription
              </h2>

              {billing?.subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">His Altar Monthly</p>
                      <p className="text-neutral-500 text-sm">$9.99 / month</p>
                      {billing.subscription.current_period_end && (
                        <p className="text-neutral-600 text-xs mt-1">
                          {billing.subscription.cancel_at_period_end
                            ? "Cancels on "
                            : "Renews on "}
                          {new Date(
                            typeof billing.subscription.current_period_end === "number"
                              ? (billing.subscription.current_period_end as number) * 1000
                              : billing.subscription.current_period_end
                          ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold rounded-full px-3 py-1 border ${
                        billing.subscription.status === "active"
                          ? "bg-green-900/50 text-green-400 border-green-700/40"
                          : billing.subscription.status === "past_due"
                          ? "bg-yellow-900/50 text-yellow-400 border-yellow-700/40"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                      }`}
                    >
                      {subStatusLabel[billing.subscription.status] ?? billing.subscription.status}
                    </span>
                  </div>

                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm font-medium rounded-xl px-4 py-3 transition disabled:opacity-50"
                  >
                    {portalLoading ? "Opening portal…" : "Manage Billing"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-neutral-400 text-sm">
                    {billing?.trialActive
                      ? "Subscribe now — your card won't be charged until your trial ends."
                      : "Subscribe to continue using the platform."}
                  </p>

                  {prices.length > 0 ? (
                    prices.map((p) => (
                      <div
                        key={p.price_id}
                        className="flex items-center justify-between bg-neutral-800/50 border border-purple-700/30 rounded-xl px-5 py-4"
                      >
                        <div>
                          <p className="font-semibold text-white">{p.product_name}</p>
                          <p className="text-neutral-400 text-sm">
                            ${(p.unit_amount / 100).toFixed(2)}{" "}
                            <span className="text-neutral-500">/ month</span>
                          </p>
                          {p.product_description && (
                            <p className="text-neutral-600 text-xs mt-1">{p.product_description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSubscribe(p.price_id)}
                          disabled={checkoutLoading}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-50 shrink-0 ml-4"
                        >
                          {checkoutLoading ? "…" : "Subscribe"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-neutral-800/50 border border-purple-700/30 rounded-xl px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">His Altar Monthly</p>
                        <p className="text-neutral-400 text-sm">
                          $9.99 <span className="text-neutral-500">/ month</span>
                        </p>
                        {billing?.trialActive && (
                          <p className="text-purple-400 text-xs mt-1">
                            First {billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? "s" : ""} free
                          </p>
                        )}
                      </div>
                      <p className="text-neutral-500 text-xs ml-4">
                        Run seed-products script to activate checkout
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Plan info */}
            <div className="text-center text-neutral-600 text-xs space-y-1">
              <p>Full access — Dbanc, PXP, Altar Reports, Roster, Check-in, and more.</p>
              <p>Cancel anytime. Questions? <a href="mailto:support@hisaltar.app" className="text-purple-500 hover:text-purple-400 transition">Contact support</a></p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
