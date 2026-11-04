'use client';
import { Suspense, useRef, useEffect } from 'react';
import { Settings, User, Shield, Brain, HelpCircle, KeyRound } from '@/components/ui/animated-icon';
import { useSearchParams, useRouter } from 'next/navigation';

import GeneralSettings from './_components/GeneralSettings';
import AccountSettings from './_components/AccountSettings';
import SecuritySettings from './_components/SecuritySettings';
import MemorySettings from './_components/MemorySettings';
import HelpSettings from './_components/HelpSettings';
import ApiKeySettings from './_components/ApiKeySettings';

function SettingsTabButton({ tab, isActive, onClick }) {
  const iconRef = useRef(null);
  const Icon = tab.icon;

  return (
    <button
      onClick={() => onClick(tab.id)}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'bg-accent text-accent-foreground font-semibold shadow-xs' 
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      }`}
    >
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        <Icon ref={iconRef} size={16} className="w-full h-full" />
      </div>
      <div className="text-left flex-1 min-w-0">
        <span className="block truncate">{tab.label}</span>
      </div>
    </button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const mobileTabsRef = useRef(null);
  
  const tabs = [
    { id: 'general', label: 'General', description: 'Theme, language & workspace preferences', icon: Settings },
    { id: 'account', label: 'Account', description: 'Profile details & subscription status', icon: User },
    { id: 'security', label: 'Security', description: 'Password, 2FA & active sessions', icon: Shield },
    { id: 'memory', label: 'Memory', description: 'Contextual memory & conversation data', icon: Brain },
    { id: 'api-keys', label: 'API Keys', description: 'Developer keys, wallet balance & usage', icon: KeyRound },
    { id: 'help', label: 'Help', description: 'Help center, documentation & support', icon: HelpCircle },
  ];

  const isValidTab = tabs.some(t => t.id === tabParam);
  const activeTab = isValidTab ? tabParam : 'general';
  const activeTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  const handleTabChange = (tabId) => {
    router.push(`/settings?tab=${tabId}`);
  };

  // Keep active tab centered in mobile pill bar
  useEffect(() => {
    if (mobileTabsRef.current) {
      const activeEl = mobileTabsRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  return (
    <div className="w-full max-w-6xl mx-auto py-2 sm:py-6 px-1 sm:px-4 md:px-6 h-full flex flex-col font-sans">
      {/* Header section */}
      <div className="mb-4 sm:mb-8 shrink-0 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <span className="md:hidden text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/40">
            {activeTabInfo.label}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
          {activeTabInfo.description}
        </p>
      </div>

      {/* Mobile Horizontal Pill Navigation - Sticky */}
      <div className="md:hidden sticky top-0 z-20 -mx-1 px-1 py-2 mb-5 bg-background/85 backdrop-blur-md border-b border-border/40">
        <div 
          ref={mobileTabsRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold ring-1 ring-primary/20'
                    : 'bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={14} className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <nav className="flex flex-col gap-1.5 sticky top-4">
            {tabs.map((tab) => (
              <SettingsTabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={handleTabChange}
              />
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-h-0 md:overflow-y-auto pb-16 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-3xl w-full">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'memory' && <MemorySettings />}
            {activeTab === 'api-keys' && <ApiKeySettings />}
            {activeTab === 'help' && <HelpSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-8 text-sm text-muted-foreground">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

