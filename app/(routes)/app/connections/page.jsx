'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Check, AlertCircle, Loader2, Puzzle, Unplug, Trash2, ArrowLeft, Zap, ExternalLink } from '@/components/ui/animated-icon';
import { useAppConnections } from '@/contexts/AppConnectionContext';
import { toast } from '@/lib/alert';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/app/_components/AuthGuard';

const SUPPORTED_APP_KEYS = new Set([
  'gmail',
  'email',
  'google_drive',
  'google drive',
  'slack',
  'notion',
  'google_calendar',
  'google calendar',
  'canva',
  'microsoft_365',
  'microsoft 365',
  'figma',
]);

const normalizeAppKey = (value = '') => String(value).trim().toLowerCase().replace(/[-\s]+/g, '_');

const isSupportedApp = (app) => {
  const rawId = app?.id || '';
  const rawName = app?.name || '';
  const normalizedId = normalizeAppKey(rawId);
  const normalizedName = normalizeAppKey(rawName);

  return SUPPORTED_APP_KEYS.has(rawId.toLowerCase()) || SUPPORTED_APP_KEYS.has(rawName.toLowerCase()) || SUPPORTED_APP_KEYS.has(normalizedId) || SUPPORTED_APP_KEYS.has(normalizedName);
};

const CATEGORY_LABELS = {
  all: 'All',
  productivity: 'Productivity',
  communication: 'Communication',
  design: 'Design',
  development: 'Development',
  automation: 'Automation',
  data: 'Data',
  finance: 'Finance',
};

function AppConnectionsContent() {
  const router = useRouter();
  const { allApps, connectedApps, connectApp, disconnectApp, loading, fetchRegistry, refreshConnections } = useAppConnections();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [connectingAppId, setConnectingAppId] = useState(null);
  const [disconnectingAppId, setDisconnectingAppId] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);

  useEffect(() => {
    if (typeof fetchRegistry === 'function') fetchRegistry();
    if (typeof refreshConnections === 'function') refreshConnections();
  }, []);

  const connectionMap = useMemo(() => {
    const map = {};
    if (!connectedApps || !Array.isArray(connectedApps)) return map;
    for (const conn of connectedApps) {
      map[conn.appId] = conn.status || 'active';
    }
    return map;
  }, [connectedApps]);

  const connectedCount = useMemo(() => {
    return Object.values(connectionMap).filter(s => s === 'active').length;
  }, [connectionMap]);

  const filteredApps = useMemo(() => {
    let apps = allApps || [];
    if (selectedCategory !== 'all') {
      apps = apps.filter(app => app.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      apps = apps.filter(app =>
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
      );
    }
    return apps;
  }, [allApps, selectedCategory, searchQuery]);

  const handleConnect = async (appId) => {
    const app = filteredApps.find(item => item.id === appId);
    if (!isSupportedApp(app)) {
      toast.info('Coming soon');
      return;
    }

    setConnectingAppId(appId);
    try {
      const result = await connectApp(appId);
      if (result?.mcpConnected) {
        toast.success('App connected successfully');
        setConnectingAppId(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to connect app');
      setConnectingAppId(null);
    }
  };

  const handleDisconnect = async (appId) => {
    setDisconnectingAppId(appId);
    try {
      await disconnectApp(appId);
      toast.success('App disconnected & all data removed');
      setConfirmDisconnect(null);
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect');
    } finally {
      setDisconnectingAppId(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/app')}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-card border border-border/60 hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-muted-foreground cursor-pointer"
            title="Back to App"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              App Connections
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Connect apps to let AI perform actions on your behalf
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring transition-all duration-200"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === key
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* App Grid */}
        <div>
          {loading && (!allApps || allApps.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Loading apps...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No apps found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app) => {
                const isSupported = isSupportedApp(app);
                const isConnected = connectionMap[app.id] === 'active';
                const needsReauth = connectionMap[app.id] === 'needs_reauth';
                const isConnecting = connectingAppId === app.id;
                const isDisconnecting = disconnectingAppId === app.id;
                const isConfirmingDisconnect = confirmDisconnect === app.id;

                return (
                  <div
                    key={app.id}
                    className={`group relative rounded-2xl border transition-all duration-200 ${
                      !isSupported
                        ? 'border-border/40 bg-muted/40 opacity-75'
                        : isConnected
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : needsReauth
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border/60 bg-card/60 backdrop-blur-xs hover:border-border hover:bg-card/80 hover:shadow-xs'
                    }`}
                  >
                    <div className="p-5">
                      {/* Top row: Icon + Status badge */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border ${
                          !isSupported
                            ? 'bg-muted border-border/40'
                            : isConnected
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-muted/60 border-border/60'
                        }`}>
                          {app.icon ? (
                            <img
                              src={app.icon}
                              alt={app.name}
                              className="w-7 h-7 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.parentElement.querySelector('span')) {
                                  e.target.parentElement.querySelector('span').style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span className={`text-sm font-bold text-muted-foreground ${app.icon ? 'hidden' : 'flex'}`}>
                            {app.name[0]}
                          </span>
                        </div>

                        {!isSupported && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/40">
                            Coming Soon
                          </span>
                        )}
                        {isSupported && isConnected && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Connected
                          </span>
                        )}
                        {isSupported && needsReauth && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" /> Reconnect
                          </span>
                        )}
                      </div>

                      {/* App name & description */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-1.5 truncate">{app.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.4em]">{app.description}</p>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-2.5 mb-5">
                        <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground capitalize font-medium border border-border/40">
                          {app.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Zap className="w-3 h-3" />
                          {app.toolCount || app.tools?.length || 0} tool{(app.toolCount || app.tools?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Action Button */}
                      {!isSupported ? (
                        <button
                          className="w-full h-9 rounded-xl text-xs font-medium transition-all duration-200 border border-border/40 bg-muted/40 cursor-not-allowed flex items-center justify-center gap-1.5 text-muted-foreground opacity-60"
                          disabled
                          title="Coming soon"
                        >
                          Coming Soon
                        </button>
                      ) : isConnected ? (
                        <div>
                          {isConfirmingDisconnect ? (
                            <div className="space-y-2.5">
                              <p className="text-xs text-muted-foreground text-center font-medium">Remove connection & all data?</p>
                              <div className="flex gap-2">
                                <button
                                  className="flex-1 h-9 rounded-xl text-xs font-medium border border-border/60 text-foreground hover:bg-accent transition-colors"
                                  onClick={() => setConfirmDisconnect(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="flex-1 h-9 rounded-xl text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  onClick={() => handleDisconnect(app.id)}
                                  disabled={isDisconnecting}
                                >
                                  {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  {isDisconnecting ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="w-full h-9 rounded-xl text-xs font-medium transition-all duration-200 border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive flex items-center justify-center gap-1.5"
                              onClick={() => setConfirmDisconnect(app.id)}
                            >
                              <Unplug className="w-3 h-3" />
                              Disconnect
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          className="w-full h-9 rounded-xl text-xs font-medium transition-all duration-200 border border-border/60 bg-background/80 hover:bg-accent text-foreground disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-2xs"
                          onClick={() => handleConnect(app.id)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3 h-3" />
                          )}
                          {needsReauth ? 'Reconnect' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppConnectionsPage() {
  return (
    <AuthGuard>
      <AppConnectionsContent />
    </AuthGuard>
  );
}
