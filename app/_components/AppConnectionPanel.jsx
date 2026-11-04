'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Check, AlertCircle, Loader2, Puzzle, Unplug, Trash2 } from '@/components/ui/animated-icon';
import { useAppConnections } from '@/contexts/AppConnectionContext';
import { toast } from '@/lib/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export default function AppConnectionPanel({ isOpen, onClose }) {
  const { allApps, connectedApps, connectApp, disconnectApp, loading, fetchRegistry, refreshConnections } = useAppConnections();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [connectingAppId, setConnectingAppId] = useState(null);
  const [disconnectingAppId, setDisconnectingAppId] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);

  // Fetch apps when panel opens
  useEffect(() => {
    if (isOpen) {
      if (typeof fetchRegistry === 'function') fetchRegistry();
      if (typeof refreshConnections === 'function') refreshConnections();
    }
  }, [isOpen]);

  const connectionMap = useMemo(() => {
    const map = {};
    if (!connectedApps || !Array.isArray(connectedApps)) return map;
    for (const conn of connectedApps) {
      map[conn.appId] = conn.status || 'active';
    }
    return map;
  }, [connectedApps]);

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
    setConnectingAppId(appId);
    try {
      const result = await connectApp(appId);
      // MCP apps connect instantly
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col gap-4 bg-card border border-border/60 rounded-2xl p-0 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-foreground text-lg font-semibold">
              <Puzzle className="w-5 h-5 text-muted-foreground" />
              App Connections
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Connect apps to let AI perform actions on your behalf
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Search */}
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/40 border border-border/60 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === key
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* App Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          {loading && (!allApps || allApps.length === 0) ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No apps found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredApps.map((app) => {
                const isConnected = connectionMap[app.id] === 'active';
                const needsReauth = connectionMap[app.id] === 'needs_reauth';
                const isConnecting = connectingAppId === app.id;
                const isDisconnecting = disconnectingAppId === app.id;
                const isConfirmingDisconnect = confirmDisconnect === app.id;

                return (
                  <div
                    key={app.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isConnected
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : needsReauth
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border/60 bg-card/60 hover:border-border hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* App Icon */}
                      <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
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
                        <span className={`text-base font-bold text-muted-foreground ${app.icon ? 'hidden' : 'flex'}`}>
                          {app.name[0]}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium text-foreground truncate">{app.name}</h4>
                          {isConnected && (
                            <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                              <Check className="w-3 h-3" /> Connected
                            </span>
                          )}
                          {needsReauth && (
                            <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                              <AlertCircle className="w-3 h-3" /> Reconnect
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize border border-border/40">
                            {app.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {app.toolCount || app.tools?.length || 0} tool{(app.toolCount || app.tools?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isConnected ? (
                      // Connected: Show Disconnect button
                      <div className="mt-3">
                        {isConfirmingDisconnect ? (
                          // Confirmation state
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground text-center">Disconnect & delete all data?</p>
                            <div className="flex gap-2">
                              <button
                                className="flex-1 h-8 rounded-lg text-xs font-medium border border-border/60 text-foreground hover:bg-accent transition-colors"
                                onClick={(e) => { e.stopPropagation(); setConfirmDisconnect(null); }}
                              >
                                Cancel
                              </button>
                              <button
                                className="flex-1 h-8 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                onClick={(e) => { e.stopPropagation(); handleDisconnect(app.id); }}
                                disabled={isDisconnecting}
                              >
                                {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                {isDisconnecting ? 'Removing...' : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal connected state - show disconnect button
                          <button
                            className="w-full h-8 rounded-lg text-xs font-medium transition-all border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center gap-1.5"
                            onClick={(e) => { e.stopPropagation(); setConfirmDisconnect(app.id); }}
                          >
                            <Unplug className="w-3 h-3" />
                            Disconnect
                          </button>
                        )}
                      </div>
                    ) : (
                      // Not connected: Show Connect button
                      <button
                        className="mt-3 w-full h-8 rounded-lg text-xs font-medium transition-all border border-border/60 bg-secondary/80 hover:bg-secondary text-secondary-foreground disabled:opacity-40 flex items-center justify-center gap-1.5"
                        onClick={(e) => { e.stopPropagation(); handleConnect(app.id); }}
                        disabled={isConnecting}
                      >
                        {isConnecting && <Loader2 className="w-3 h-3 animate-spin" />}
                        {needsReauth ? 'Reconnect' : 'Connect'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
