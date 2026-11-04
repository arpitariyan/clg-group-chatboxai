import { useState, useEffect, useCallback, useMemo } from 'react';
import { ASSISTANT_VOICES, AssistantVoice, getVoiceOptionById, DEFAULT_ASSISTANT_VOICE_ID } from '@/lib/voice/voice-registry';
import { loadUserVoicePreference, saveUserVoicePreference } from '@/lib/user-preferences';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

const VOICE_CHANGE_EVENT = 'chatbox_assistant_voice_changed';

export function useVoicePreference(customUserIdentifier?: string) {
  // Gracefully attempt to read user context
  let authContext: any = null;
  let userContext: any = null;

  try {
    authContext = useAuth();
  } catch (_) {}

  try {
    userContext = useUser();
  } catch (_) {}

  const currentUser = authContext?.currentUser;
  const userData = userContext?.userData;
  const updateUserData = userContext?.updateUserData;

  // Resolve user identifier
  const userIdentifier = useMemo(() => {
    if (customUserIdentifier) return customUserIdentifier;
    return currentUser?.email || currentUser?.uid || 'anonymous';
  }, [customUserIdentifier, currentUser?.email, currentUser?.uid]);

  // Initial state resolution:
  // 1. Check user profile (userData?.assistant_voice)
  // 2. Check user-scoped or generic localStorage (loadUserVoicePreference)
  // 3. Fall back to Sarah (voice-1)
  const getResolvedVoiceId = useCallback((): string => {
    if (userData?.assistant_voice) {
      return getVoiceOptionById(userData.assistant_voice).id;
    }
    const stored = loadUserVoicePreference(userIdentifier);
    return getVoiceOptionById(stored).id;
  }, [userData?.assistant_voice, userIdentifier]);

  const [selectedVoiceId, setSelectedVoiceIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_ASSISTANT_VOICE_ID;
    return getResolvedVoiceId();
  });

  // Sync state when user identity or user profile data changes
  useEffect(() => {
    const resolved = getResolvedVoiceId();
    setSelectedVoiceIdState(resolved);
  }, [getResolvedVoiceId]);

  // Listen for voice preference changes dispatched from other components/modals or other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVoiceEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ voiceId: string; userIdentifier?: string }>;
      const incomingId = customEvent.detail?.voiceId;
      const targetUser = customEvent.detail?.userIdentifier;

      // If user target matches or is global, update state
      if (incomingId && (!targetUser || targetUser === userIdentifier || targetUser === 'anonymous')) {
        const verified = getVoiceOptionById(incomingId);
        setSelectedVoiceIdState(verified.id);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === 'chatbox_assistant_voice_id' ||
        (userIdentifier && e.key === `chatbox_assistant_voice_id_${userIdentifier.toLowerCase()}`)
      ) {
        if (e.newValue) {
          const verified = getVoiceOptionById(e.newValue);
          setSelectedVoiceIdState(verified.id);
        }
      }
    };

    window.addEventListener(VOICE_CHANGE_EVENT, handleVoiceEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(VOICE_CHANGE_EVENT, handleVoiceEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [userIdentifier]);

  // Persist new voice selection specifically for this user
  const setVoicePreference = useCallback((voiceId: string) => {
    const verified = getVoiceOptionById(voiceId);
    setSelectedVoiceIdState(verified.id);

    // 1. Save locally with user scoping
    saveUserVoicePreference(verified.id, userIdentifier);

    // 2. Persist to account database profile if user is authenticated
    if (currentUser?.email && updateUserData) {
      try {
        updateUserData({ assistant_voice: verified.id }).catch((err: any) => {
          console.warn('Could not sync assistant voice to user profile:', err);
        });
      } catch (e) {
        console.warn('updateUserData invocation error:', e);
      }
    }

    // 3. Broadcast update to all other mounted components
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent(VOICE_CHANGE_EVENT, {
            detail: { voiceId: verified.id, userIdentifier }
          })
        );
      } catch (_) {}
    }
  }, [userIdentifier, currentUser?.email, updateUserData]);

  const currentVoice: AssistantVoice = useMemo(() => {
    return getVoiceOptionById(selectedVoiceId);
  }, [selectedVoiceId]);

  return {
    selectedVoiceId,
    currentVoice,
    voices: ASSISTANT_VOICES,
    setVoicePreference,
  };
}

