'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Activity,
  BarChart3,
  BookOpen,
  Coins,
  Copy,
  IndianRupee,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Wallet,
  Zap,
} from '@/components/ui/animated-icon';
import { useAuth } from '@/contexts/AuthContext';
import { ensureRazorpayScript } from '@/lib/razorpay-loader';
import { toast } from '@/lib/alert';

const CREDIT_PRESETS = [50, 100, 200];
const MIN_API_CREDIT_PURCHASE = 50;
const SURFACE_CARD = 'rounded-2xl border border-border/60 bg-gray-50/70 shadow-sm dark:bg-white/5';
const SURFACE_CARD_INSET = 'rounded-2xl border border-border/60 bg-background/80 shadow-sm';
const CONTROL_BUTTON = 'gap-2 border-border/60 bg-background/80 text-foreground hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 focus-visible:ring-amber-500/30 dark:hover:border-amber-900/40 dark:hover:bg-amber-950/20 dark:hover:text-amber-300';
const PRIMARY_BUTTON = 'gap-2 bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500/30 dark:bg-amber-500 dark:hover:bg-amber-600';
const PRIMARY_OUTLINE_BUTTON = 'gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 focus-visible:ring-amber-500/30 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/30 dark:hover:text-amber-200';

function formatDateTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

function maskSecret(secret) {
  if (!secret) return '';
  if (secret.length <= 12) return '••••••••••••';
  return `${secret.slice(0, 8)}••••••••••${secret.slice(-4)}`;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatInr(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

function ActivityList({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 backdrop-blur-xs p-4 text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isPurchase = item.transaction_type === 'purchase';
        return (
          <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs p-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 rounded-full p-2 ${isPurchase ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Coins className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">{isPurchase ? 'Credit Purchase' : 'Usage Deduction'}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">{isPurchase ? '+' : '-'}{formatInr(Math.abs(Number(item.amount || 0)))}</p>
              <p className="text-xs text-muted-foreground">Balance: {formatInr(Number(item.balance_after || 0))}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const chartConfig = {
  requests: {
    label: "Requests",
    color: "hsl(var(--chart-1))",
  },
  tokens: {
    label: "Tokens",
    color: "hsl(var(--chart-2))",
  },
  cost: {
    label: "Cost",
    color: "hsl(var(--chart-3))",
  },
};

function UsageChart({ points }) {
  const [activeChart, setActiveChart] = useState("requests");

  const total = useMemo(
    () => ({
      requests: (points || []).reduce((acc, curr) => acc + (Number(curr.requests) || 0), 0),
      tokens: (points || []).reduce((acc, curr) => acc + (Number(curr.tokens) || 0), 0),
      cost: (points || []).reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0),
    }),
    [points]
  );

  if (!points || points.length === 0) {
    return <div className="rounded-xl border border-dashed border-border/60 bg-card/60 backdrop-blur-xs p-4 text-sm text-muted-foreground">No usage data available yet.</div>;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs overflow-hidden">
      <div className="flex flex-col items-stretch border-b border-border/50 p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-0.5 sm:gap-1 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-xs sm:text-sm font-medium">Usage Analytics</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Showing interactive metrics for the selected period
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 sm:border-t-0 sm:border-l">
          {["requests", "tokens", "cost"].map((key) => {
            const chart = key;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative z-30 flex flex-col justify-center gap-0.5 sm:gap-1 px-2.5 py-2.5 sm:px-6 sm:py-4 text-left data-[active=true]:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-[10px] sm:text-xs text-muted-foreground capitalize truncate">
                  {chartConfig[chart].label}
                </span>
                <span className="text-xs sm:text-lg leading-tight font-bold truncate">
                  {chart === 'cost' ? formatInr(total[key]) : total[key].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-1.5 sm:p-6 py-3">
        <div className="h-[200px] sm:h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{
                left: 12,
                right: 12,
                top: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
              <XAxis
                dataKey="key"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  try {
                    const [y, m, d] = value.split('-');
                    const date = new Date(y, m - 1, d || 1);
                    if (isNaN(date.getTime())) return value;
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      ...(d ? { day: "numeric" } : {}),
                    });
                  } catch {
                    return value;
                  }
                }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    let formattedLabel = label;
                    try {
                      const [y, m, d] = label.split('-');
                      const date = new Date(y, m - 1, d || 1);
                      if (!isNaN(date.getTime())) {
                        formattedLabel = date.toLocaleDateString("en-US", {
                          month: "short",
                          ...(d ? { day: "numeric" } : {}),
                          year: "numeric",
                        });
                      }
                    } catch {}
                    
                    return (
                      <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[150px]">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            {formattedLabel}
                          </span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 w-2 shrink-0 rounded-sm"
                              style={{ backgroundColor: chartConfig[activeChart].color }}
                            />
                            <span className="text-sm font-semibold text-foreground">
                              {chartConfig[activeChart].label}: {chartConfig[activeChart].prefix || ''}{payload[0].value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey={activeChart} fill={chartConfig[activeChart].color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function ApiKeySettings() {
  const { currentUser } = useAuth();
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [recentCreatedKey, setRecentCreatedKey] = useState(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState({});

  const [apiCredits, setApiCredits] = useState({ balance: 0, transactions: [] });
  const [apiCreditsLoading, setApiCreditsLoading] = useState(false);
  const [purchaseLoadingAmount, setPurchaseLoadingAmount] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('50');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [period, setPeriod] = useState('daily');
  const [analytics, setAnalytics] = useState({
    totals: { requests: 0, tokens: 0, cost: 0 },
    charts: { daily: [], weekly: [], monthly: [] },
  });

  const normalizedPurchaseAmount = useMemo(() => normalizeAmount(purchaseAmount), [purchaseAmount]);
  const isPurchaseValid = normalizedPurchaseAmount >= MIN_API_CREDIT_PURCHASE;
  const activeKeyCount = useMemo(() => keys.filter((key) => key.status === 'active').length, [keys]);
  const currentSeries = analytics?.charts?.[period] || [];

  async function getAuthHeaders() {
    const token = await currentUser?.getIdToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchApiKeys() {
    setKeysLoading(true);
    try {
      const response = await fetch('/api/v1/keys', {
        headers: { ...(await getAuthHeaders()) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to fetch API keys');
      setKeys(data.keys || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error(error.message || 'Failed to fetch API keys.');
    } finally {
      setKeysLoading(false);
    }
  }

  async function fetchUsageAnalytics() {
    setAnalyticsLoading(true);
    try {
      const response = await fetch('/api/v1/usage', {
        headers: { ...(await getAuthHeaders()) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to fetch analytics');
      setAnalytics(data.analytics || analytics);
    } catch (error) {
      console.error('Failed to fetch API analytics:', error);
      toast.error(error.message || 'Failed to fetch API usage analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function fetchApiCredits() {
    setApiCreditsLoading(true);
    try {
      const response = await fetch('/api/v1/credits', {
        headers: { ...(await getAuthHeaders()) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load API credits');
      setApiCredits({ balance: Number(data.balance?.credits || 0), transactions: data.transactions || [] });
    } catch (error) {
      console.error('Failed to fetch API credits:', error);
      toast.error(error.message || 'Failed to load API credits.');
    } finally {
      setApiCreditsLoading(false);
    }
  }

  async function ensurePaymentReady() {
    if (razorpayReady && window.Razorpay) return true;
    await ensureRazorpayScript();
    setRazorpayReady(true);
    return Boolean(window.Razorpay);
  }

  useEffect(() => {
    if (!currentUser) return;
    fetchApiKeys();
    fetchUsageAnalytics();
    fetchApiCredits();
  }, [currentUser]);

  async function handleCreateKey() {
    setActionLoading(true);
    try {
      const payload = {};
      const trimmedName = createName.trim();
      if (trimmedName) payload.name = trimmedName;

      const response = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create API key');

      setRecentCreatedKey(data.key ? { key: data.key, keyId: data.key_id, name: data.name } : null);
      setCreateName('');
      setCreateOpen(false);
      await fetchApiKeys();
      toast.success('API key created successfully.');
    } catch (error) {
      console.error('Create API key failed:', error);
      toast.error(error.message || 'Failed to create API key.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteKey(keyId) {
    const confirmDelete = window.confirm('Delete this API key? This action cannot be undone.');
    if (!confirmDelete) return;

    setDeleteLoadingId(keyId);
    try {
      const response = await fetch(`/api/v1/keys/${keyId}`, {
        method: 'DELETE',
        headers: { ...(await getAuthHeaders()) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete API key');

      setKeys((prev) => prev.filter((item) => item.key_id !== keyId));
      toast.success('API key deleted.');
    } catch (error) {
      console.error('Delete API key failed:', error);
      toast.error(error.message || 'Failed to delete API key.');
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function handleCopyNewKey() {
    if (!recentCreatedKey?.key) return;
    navigator.clipboard.writeText(recentCreatedKey.key).then(
      () => toast.success('API key copied to clipboard.'),
      () => toast.error('Failed to copy API key.')
    );
  }

  async function handleCopyKey(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('API key copied to clipboard.');
    } catch {
      toast.error('Failed to copy API key.');
    }
  }

  async function handlePurchaseCredits(amount) {
    const purchaseValue = normalizeAmount(amount);
    if (purchaseValue < MIN_API_CREDIT_PURCHASE) {
      setPurchaseError('Minimum API credit purchase is ₹50.');
      return;
    }

    setPurchaseLoadingAmount(purchaseValue);
    setPurchaseError('');

    try {
      const paymentReady = await ensurePaymentReady();
      if (!paymentReady) throw new Error('Payment gateway failed to load.');

      const orderResponse = await fetch('/api/v1/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ amount: purchaseValue }),
      });

      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) throw new Error(orderData.error || 'Failed to create API credit order');

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'ChatBox AI',
        description: `${formatInr(orderData.purchase.amount)} buys ${formatCompactNumber(orderData.purchase.credits)} API credits`,
        order_id: orderData.order.id,
        prefill: {
          name: currentUser?.displayName || currentUser?.email,
          email: currentUser?.email,
        },
        theme: { color: '#f59e0b' },
        handler: async function (response) {
          const verifyResponse = await fetch('/api/v1/credits/verify-purchase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(await getAuthHeaders()),
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok) throw new Error(verifyData.error || 'Failed to verify API credit purchase');

          await fetchApiCredits();
          setPurchaseLoadingAmount(null);
          toast.success(`Added ${formatCompactNumber(orderData.purchase.credits)} API credits.`);
        },
        modal: {
          ondismiss: function () {
            setPurchaseLoadingAmount(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('API credit purchase failed:', error);
      setPurchaseError(error.message || 'Failed to purchase API credits.');
      toast.error(error.message || 'Failed to purchase API credits.');
      setPurchaseLoadingAmount(null);
    }
  }

  function toggleKeyReveal(keyId) {
    setRevealedKeyIds((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  }

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">API Keys</h2>
          <p className="text-sm text-muted-foreground">Create, view, copy, and revoke API keys from one consistent dashboard section.</p>
        </div>

        <div className="space-y-4">
          <div className={`flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${SURFACE_CARD}`}>
            <div className="space-y-1">
              <p className="font-medium text-sm">Manage keys</p>
              <p className="text-xs sm:text-sm text-muted-foreground">View full values anytime, copy them instantly, and keep track of active status.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button variant="outline" onClick={() => { fetchApiKeys(); fetchUsageAnalytics(); fetchApiCredits(); }} disabled={keysLoading || analyticsLoading || apiCreditsLoading} className={`w-full sm:w-auto text-xs sm:text-sm ${CONTROL_BUTTON}`}>
                {(keysLoading || analyticsLoading || apiCreditsLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Button onClick={() => setCreateOpen(true)} className={`w-full sm:w-auto text-xs sm:text-sm ${PRIMARY_BUTTON}`}>
                <Plus className="h-4 w-4" />
                Create API Key
              </Button>
            </div>
          </div>

          {recentCreatedKey ? (
            <div className={`space-y-3 p-4 sm:p-5 ${SURFACE_CARD}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">Recently created</Badge>
                <p className="text-sm font-medium text-foreground truncate">{recentCreatedKey.name || 'Untitled key'}</p>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <code className="flex-1 rounded-xl border border-border/60 bg-background/85 px-3 py-2.5 text-xs font-mono text-foreground break-all shadow-sm">
                  {recentCreatedKey.key}
                </code>
                <Button variant="outline" onClick={handleCopyNewKey} className={`w-full sm:w-auto text-xs ${CONTROL_BUTTON}`}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {keysLoading ? (
              <div className={`p-4 sm:p-5 text-xs sm:text-sm text-muted-foreground ${SURFACE_CARD}`}>
                Loading API keys...
              </div>
            ) : keys.length === 0 ? (
              <div className={`p-4 sm:p-5 rounded-2xl border border-dashed border-border/60 text-xs sm:text-sm text-muted-foreground ${SURFACE_CARD}`}>
                No API keys found. Create your first key to start using the API.
              </div>
            ) : (
              keys.map((key) => {
                const isRevealed = Boolean(revealedKeyIds[key.key_id]);
                return (
                  <div key={key.key_id} className={`space-y-4 p-4 sm:p-5 ${SURFACE_CARD}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-3 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-medium text-sm truncate text-foreground">{key.name || 'Untitled key'}</p>
                          <Badge
                            variant="outline"
                            className={key.status === 'active'
                              ? 'rounded-full px-2.5 py-0.5 text-[11px] capitalize border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                              : 'rounded-full px-2.5 py-0.5 text-[11px] capitalize text-muted-foreground'
                            }
                          >
                            {key.status}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                            {key.environment}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div className={`p-2.5 sm:p-3 ${SURFACE_CARD_INSET}`}><span className="font-medium text-foreground">Created:</span> {formatDateTime(key.created_at)}</div>
                          <div className={`p-2.5 sm:p-3 ${SURFACE_CARD_INSET}`}><span className="font-medium text-foreground">Last used:</span> {formatDateTime(key.last_used_at)}</div>
                          <div className={`p-2.5 sm:p-3 ${SURFACE_CARD_INSET}`}><span className="font-medium text-foreground">ID ending:</span> {key.last_digits || 'n/a'}</div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/85 px-3 py-3 font-mono text-xs text-foreground break-all shadow-sm">
                          {key.api_key ? (isRevealed ? key.api_key : maskSecret(key.api_key)) : `cbx_${key.environment || 'live'}_••••••••••••••••${key.last_digits || ''}`}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                        <Button variant="outline" size="sm" onClick={() => toggleKeyReveal(key.key_id)} disabled={!key.api_key} className={`w-full sm:w-auto justify-center text-xs ${CONTROL_BUTTON}`}>
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {isRevealed ? 'Hide' : 'View'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopyKey(key.api_key)} disabled={!key.api_key} className={`w-full sm:w-auto justify-center text-xs ${CONTROL_BUTTON}`}>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteKey(key.key_id)}
                          disabled={deleteLoadingId === key.key_id}
                          className="w-full sm:w-auto justify-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/30 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20 text-xs"
                        >
                          {deleteLoadingId === key.key_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-border/60" />

      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">API Credits</h2>
          <p className="text-sm text-muted-foreground">Manage your balance, buy credits in INR, and review recent activity.</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className={`space-y-5 p-4 sm:p-5 ${SURFACE_CARD}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-600 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 shrink-0">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Current balance</p>
                    <p className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">{formatInr(apiCredits.balance)}</p>
                  </div>
                </div>
                <p className="max-w-xl text-xs sm:text-sm text-muted-foreground">
                  Credit purchases convert directly into usable API balance. API requests stop once this balance reaches zero.
                </p>
              </div>

              <Button variant="outline" onClick={fetchApiCredits} disabled={apiCreditsLoading} className={`w-full sm:w-auto text-xs sm:text-sm ${CONTROL_BUTTON}`}>
                {apiCreditsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className={`space-y-0.5 sm:space-y-1 p-2.5 sm:p-4 ${SURFACE_CARD_INSET}`}>
                <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Available</p>
                <p className="text-xs sm:text-lg font-medium text-foreground truncate">{formatInr(apiCredits.balance)}</p>
              </div>
              <div className={`space-y-0.5 sm:space-y-1 p-2.5 sm:p-4 ${SURFACE_CARD_INSET}`}>
                <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Keys</p>
                <p className="text-xs sm:text-lg font-medium text-foreground truncate">{formatCompactNumber(keys.length)}</p>
              </div>
              <div className={`space-y-0.5 sm:space-y-1 p-2.5 sm:p-4 ${SURFACE_CARD_INSET}`}>
                <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Active Keys</p>
                <p className="text-xs sm:text-lg font-medium text-foreground truncate">{formatCompactNumber(activeKeyCount)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium">Buy credits</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Choose a preset INR amount or enter a custom amount. Minimum purchase is ₹50.</p>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs self-start sm:self-auto">Razorpay secure</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CREDIT_PRESETS.map((amount) => {
                  const selected = normalizedPurchaseAmount === amount;
                  return (
                    <Button
                      key={amount}
                      variant={selected ? 'outline' : 'outline'}
                      onClick={() => setPurchaseAmount(String(amount))}
                      className={selected ? `justify-center text-xs sm:text-sm ${PRIMARY_OUTLINE_BUTTON}` : `justify-center text-xs sm:text-sm ${CONTROL_BUTTON}`}
                    >
                      {formatInr(amount)}
                    </Button>
                  );
                })}
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                <label className="text-xs sm:text-sm font-medium text-foreground">Custom amount</label>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative flex-1 max-w-xl">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={MIN_API_CREDIT_PURCHASE}
                      step="1"
                      value={purchaseAmount}
                      onChange={(event) => setPurchaseAmount(event.target.value)}
                      className="pl-8 text-sm"
                      placeholder="Enter amount"
                    />
                  </div>
                  <Button
                    onClick={() => handlePurchaseCredits(normalizedPurchaseAmount)}
                    disabled={!isPurchaseValid || purchaseLoadingAmount !== null}
                    className={`w-full sm:w-auto text-xs sm:text-sm ${PRIMARY_BUTTON}`}
                  >
                    {purchaseLoadingAmount !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                    Pay {formatInr(normalizedPurchaseAmount || 0)}
                  </Button>
                </div>
                {purchaseError ? <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{purchaseError}</p> : null}
              </div>

              {/* <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Payment summary</h3>
                    <p className="text-sm text-muted-foreground">Everything Razorpay will charge for this top-up.</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gray-50/80 px-4 py-3 dark:bg-white/5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected top-up</p>
                      <p className="text-sm font-medium text-foreground">{formatInr(normalizedPurchaseAmount || 0)}</p>
                    </div>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gray-50/80 px-4 py-3 dark:bg-white/5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Credits added</p>
                      <p className="text-sm font-medium text-foreground">{formatCompactNumber(normalizedPurchaseAmount || 0)} credits</p>
                    </div>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gray-50/80 px-4 py-3 dark:bg-white/5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Gateway</p>
                      <p className="text-sm font-medium text-foreground">Razorpay</p>
                    </div>
                    <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gray-50/80 px-4 py-3 dark:bg-white/5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Minimum</p>
                      <p className="text-sm font-medium text-foreground">{formatInr(MIN_API_CREDIT_PURCHASE)}</p>
                    </div>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  Secure payment is handled by Razorpay. Your credits are added immediately after successful verification.
                </div>
              </div> */}
            </div>
          </div>

          <div className={`space-y-4 p-4 sm:p-5 ${SURFACE_CARD}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Recent activity</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Latest purchases and deductions.</p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
            <ActivityList items={apiCredits.transactions} />
          </div>

          <div className={`space-y-4 p-4 sm:p-5 ${SURFACE_CARD}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Usage trend</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Daily, weekly, and monthly API activity.</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
              {['daily', 'weekly', 'monthly'].map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => setPeriod(key)}
                  className={period === key
                    ? `capitalize text-xs sm:text-sm ${PRIMARY_OUTLINE_BUTTON}`
                    : `capitalize text-xs sm:text-sm ${CONTROL_BUTTON}`
                  }
                >
                  {key}
                </Button>
              ))}
            </div>

            {analyticsLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 p-4 text-xs sm:text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading usage analytics...
              </div>
            ) : (
              <UsageChart points={currentSeries} />
            )}
          </div>

          <div className={`space-y-3 p-4 sm:p-5 ${SURFACE_CARD}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Balance rules</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">How billing works on the API tab.</p>
              </div>
              <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p>₹50 purchase = 50 API credits</p>
              <p>₹100 purchase = 100 API credits</p>
              <p>Custom amounts are supported with the same direct conversion</p>
              <p>Requests stop automatically when balance reaches zero</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border/60" />

      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Documentation</h2>
          <p className="text-sm text-muted-foreground">Follow the complete API key integration guide for web, backend, and mobile workflows.</p>
        </div>

        <div className={`flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${SURFACE_CARD}`}>
          <div className="space-y-1">
            <p className="font-medium text-sm">API setup and authentication guide</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Learn key handling, request signing, environment variables, and production best practices.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
              <Link href="/docs/getting-started">Quick Start</Link>
            </Button>
            <Button asChild className={`w-full sm:w-auto text-xs sm:text-sm ${PRIMARY_BUTTON}`}>
              <Link href="/docs">
                <BookOpen className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Enter an optional name. The generated key will remain visible in your dashboard after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Key Name (optional)</label>
            <Input
              placeholder="e.g. Production backend"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              maxLength={120}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={actionLoading} className={PRIMARY_BUTTON}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}