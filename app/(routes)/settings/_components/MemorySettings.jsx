'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Info, Loader2 } from '@/components/ui/animated-icon';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/lib/alert';
import MemoryManager from '@/app/_components/MemoryManager';
import ImportMemoryModal from '@/app/_components/modals/ImportMemoryModal';

export default function MemorySettings() {
  const { currentUser } = useAuth();
  const { userData, updateUserData } = useUser() || {};
  
  const [loading, setLoading] = useState(false);
  const [showImportMemoryModal, setShowImportMemoryModal] = useState(false);
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);

  const handleToggleMemory = async (e) => {
    try {
      setLoading(true);
      const isEnabled = e.target.checked;
      await updateUserData({ memory_enabled: isEnabled });
      if (isEnabled) {
        toast.success('Conversation memory enabled');
      } else {
        toast.success('Memory disabled. Past conversations won\'t be used.');
      }
    } catch (error) {
      console.error('Error updating memory setting:', error);
      toast.error('Failed to update memory setting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Memory Preferences */}
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Memory Preferences</h2>
          <p className="text-sm text-muted-foreground">Manage how ChatBox AI remembers your conversation history.</p>
        </div>

        <div className="max-w-3xl space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm">Enable Conversation Memory</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                When enabled, your searches and research are saved to provide better, contextual responses in future chats.
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={userData?.memory_enabled !== false}
                    onChange={handleToggleMemory}
                    disabled={loading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              )}
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20">
            <div className="flex gap-2.5 sm:gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 text-xs sm:text-sm">How Memory Works</h4>
                <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 space-y-1 sm:space-y-1.5 list-disc list-inside">
                  <li>Full transcripts of your searches and research are stored securely</li>
                  <li>AI extracts summaries of key topics and findings</li>
                  <li>Past context is automatically injected into new searches for better results</li>
                  <li>You can manually include or exclude specific conversations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* Memory Manager */}
      <section className="space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl font-medium mb-1">Your Conversations</h2>
            <p className="text-sm text-muted-foreground">View and manage the conversations stored in your memory.</p>
          </div>
          <Button variant="outline" onClick={() => setShowImportMemoryModal(true)} className="w-full sm:w-auto text-xs sm:text-sm">
            Import Memory
          </Button>
        </div>

        <div className="max-w-4xl">
          {currentUser?.email ? (
            <MemoryManager key={memoryRefreshKey} userEmail={currentUser.email} />
          ) : (
            <div className="p-6 sm:p-8 text-center text-xs sm:text-sm text-muted-foreground border border-border/60 rounded-xl bg-card/60 backdrop-blur-xs">
              Please sign in to view your memory.
            </div>
          )}
        </div>
      </section>

      {currentUser?.email && (
        <ImportMemoryModal
          isOpen={showImportMemoryModal}
          onClose={() => setShowImportMemoryModal(false)}
          userEmail={currentUser.email}
          onImported={() => {
            setMemoryRefreshKey(prev => prev + 1);
            toast.success('Memories imported successfully');
          }}
        />
      )}
    </div>
  );
}
