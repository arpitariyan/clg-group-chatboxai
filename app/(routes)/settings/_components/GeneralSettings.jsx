'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon, Monitor, Palette, Globe, Sparkles, SlidersHorizontal, RotateCcw, Bell, Zap as MotionIcon, Loader2, Check, Volume2, Play, Square } from '@/components/ui/animated-icon';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useVoicePreference } from '@/hooks/useVoicePreference';
import { ASSISTANT_VOICES } from '@/lib/voice/voice-registry';
import {
  CHAT_FONT_OPTIONS,
  DEFAULT_CHAT_FONT,
  DEFAULT_GENERAL_PREFS,
  ORB_COLORS,
  applyAccentToDocument,
  applyChatFontToDocument,
  applyGeneralPreferencesToDocument,
  loadUserChatFontPreference,
  loadGeneralPreferences,
  normalizeChatFont,
  saveUserChatFontPreference,
  saveGeneralPreferences,
  setGeneralPreference,
} from '@/lib/user-preferences';
import { toast } from '@/lib/alert';

export default function GeneralSettings() {
  const { currentUser } = useAuth();
  const userContext = useUser();
  
  const { 
    userData, 
    updateUserData = async () => {}, 
  } = userContext || {};
  
  const { isDarkMode, toggleTheme, setThemeMode } = useTheme();
  const { selectedVoiceId, setVoicePreference } = useVoicePreference();
  
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [generalPrefs, setGeneralPrefs] = useState(DEFAULT_GENERAL_PREFS);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const accentColors = [
    { name: 'Violet', value: 'violet', color: 'bg-violet-500' },
    { name: 'Blue', value: 'blue', color: 'bg-blue-500' },
    { name: 'Emerald', value: 'emerald', color: 'bg-emerald-500' },
    { name: 'Amber', value: 'amber', color: 'bg-amber-500' },
    { name: 'Rose', value: 'rose', color: 'bg-rose-500' },
    { name: 'Indigo', value: 'indigo', color: 'bg-indigo-500' }
  ];

  useEffect(() => {
    try {
      const prefs = loadGeneralPreferences();
      setGeneralPrefs(prefs);
      applyGeneralPreferencesToDocument(prefs);
    } catch (error) {
      console.warn('Failed to load general settings:', error);
      setGeneralPrefs(DEFAULT_GENERAL_PREFS);
    }
  }, []);

  const handleThemeChange = (theme) => {
    if (setThemeMode) {
      setThemeMode(theme);
    } else {
      if (theme === 'system') return;
      const isDark = theme === 'dark';
      if (isDark !== isDarkMode) toggleTheme();
    }
  };

  const handleAccentColorChange = async (color) => {
    try {
      await updateUserData({ accent_color: color });
      applyAccentToDocument(color);
      toast.success('Accent color updated');
    } catch (error) {
      console.error('Failed to update accent color:', error);
    }
  };

  const handleLanguageChange = async (language) => {
    try {
      await updateUserData({ language });
      toast.success('Language updated');
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  const handleChatFontChange = async (chatFont) => {
    const nextFont = normalizeChatFont(chatFont);
    const userIdentifier = currentUser?.email || currentUser?.uid || 'anonymous';
    saveUserChatFontPreference(nextFont, userIdentifier);
    applyChatFontToDocument(nextFont);

    try {
      await updateUserData({ chat_font: nextFont });
      toast.success('Chat font updated');
    } catch (error) {
      console.error('Failed to update chat font:', error);
      applyChatFontToDocument(userData?.chat_font || loadUserChatFontPreference(userIdentifier) || DEFAULT_CHAT_FONT);
      toast.error('Could not update chat font.');
    }
  };

  const handleVoiceChange = (voiceId) => {
    setVoicePreference(voiceId);
    const voiceObj = ASSISTANT_VOICES.find(v => v.id === voiceId);
    toast.success(`Assistant voice set to ${voiceObj?.name || 'Sarah'}`);
  };

  const handleToggleVoicePreview = (voice) => {
    if (playingVoiceId === voice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    setPlayingVoiceId(voice.id);
    const audio = new Audio(voice.previewUrl);
    previewAudioRef.current = audio;

    audio.onended = () => {
      setPlayingVoiceId(null);
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
    };

    audio.play().catch(() => {
      setPlayingVoiceId(null);
    });
  };

  const updateGeneralPreference = (key, value) => {
    setGeneralPrefs((prev) => {
      const next = setGeneralPreference(key, value);
      try {
        applyGeneralPreferencesToDocument(next);
      } catch (error) {
        console.warn('Failed to apply general settings:', error);
      }
      return next;
    });
  };

  const resetGeneralSettings = async () => {
    setPreferencesLoading(true);
    try {
      const resetPrefs = { ...DEFAULT_GENERAL_PREFS };
      setGeneralPrefs(resetPrefs);
      saveGeneralPreferences(resetPrefs);
      applyGeneralPreferencesToDocument(resetPrefs);

      if (setThemeMode) setThemeMode('light');
      else if (isDarkMode) toggleTheme();

      // Reset voice preference to Sarah (voice-1)
      setVoicePreference('voice-1');

      await updateUserData({
        accent_color: 'violet',
        language: 'en',
        chat_font: DEFAULT_CHAT_FONT,
        assistant_voice: 'voice-1',
      });
      applyAccentToDocument('violet');
      saveUserChatFontPreference(DEFAULT_CHAT_FONT, currentUser?.email || currentUser?.uid || 'anonymous');
      applyChatFontToDocument(DEFAULT_CHAT_FONT);

      toast.success('General settings restored to defaults.');
    } catch (error) {
      console.error('Failed to reset general settings:', error);
      toast.error('Could not reset all settings. Please try again.');
    } finally {
      setPreferencesLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Appearance Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Appearance</h2>
          <p className="text-sm text-muted-foreground">Customize how ChatBox AI looks and feels across your devices.</p>
        </div>
        
        <div className="space-y-8">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Theme</h3>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-row sm:gap-3">
              <Button
                variant={isDarkMode ? "outline" : "default"}
                onClick={() => handleThemeChange('light')}
                className="w-full sm:w-auto gap-1.5 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                Light
              </Button>
              <Button
                variant={isDarkMode ? "default" : "outline"}
                onClick={() => handleThemeChange('dark')}
                className="w-full sm:w-auto gap-1.5 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                Dark
              </Button>
              <Button
                variant="outline"
                onClick={() => handleThemeChange('system')}
                className="w-full sm:w-auto gap-1.5 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                System
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Accent Color</h3>
            <div className="flex gap-2 flex-wrap">
              {accentColors.map((color) => (
                <Button
                  key={color.value}
                  variant={userData?.accent_color === color.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAccentColorChange(color.value)}
                  className="gap-2 text-xs sm:text-sm"
                >
                  <div className={`w-3 h-3 rounded-full ${color.color}`} />
                  {color.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Language</h3>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
              <Button
                variant={userData?.language === 'en' ? "default" : "outline"}
                onClick={() => handleLanguageChange('en')}
                className="w-full sm:w-auto gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                English
              </Button>
              <Button
                variant={userData?.language === 'hi' ? "default" : "outline"}
                onClick={() => handleLanguageChange('hi')}
                className="w-full sm:w-auto gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                हिंदी
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Chat Font</h3>
            <div className="flex gap-2 flex-wrap">
              {CHAT_FONT_OPTIONS.map((fontOption) => (
                <Button
                  key={fontOption.value}
                  variant={normalizeChatFont(userData?.chat_font || loadUserChatFontPreference(currentUser?.email || currentUser?.uid || 'anonymous')) === fontOption.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChatFontChange(fontOption.value)}
                  className="text-xs sm:text-sm"
                >
                  {fontOption.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Voice Orb Color</h3>
            <div className="flex gap-2 flex-wrap">
              {ORB_COLORS.map((color) => (
                <Button
                  key={color.id}
                  variant={generalPrefs.orbColor === color.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateGeneralPreference('orbColor', color.id)}
                  className="gap-2 text-xs sm:text-sm"
                >
                  <div className={`w-3 h-3 rounded-full ${color.bgClass}`} />
                  {color.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Assistant Voice</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select a voice for ElevenLabs AI responses and Voice AI playback</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              {ASSISTANT_VOICES.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                const isPlaying = playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => handleVoiceChange(voice.id)}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary/50 shadow-sm ring-1 ring-primary/30'
                        : 'bg-card/60 border-border/60 hover:bg-accent/50 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {voice.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-foreground">{voice.name}</span>
                          <span className="text-[9px] sm:text-[10px] uppercase font-medium tracking-wider px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {voice.gender}
                          </span>
                          {voice.isDefault && (
                            <span className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-full">{voice.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVoicePreview(voice);
                        }}
                        className={`w-7 h-7 rounded-lg ${
                          isPlaying ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={isPlaying ? 'Stop preview' : 'Preview voice'}
                      >
                        {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      </Button>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60 text-transparent'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* Experience Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Experience</h2>
          <p className="text-sm text-muted-foreground">Personal behavior settings for your workspace experience.</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">Compact Layout</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Denser spacing for more content on screen</p>
            </div>
            <Button
              variant={generalPrefs.compactMode ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 text-xs sm:text-sm"
              onClick={() => updateGeneralPreference('compactMode', !generalPrefs.compactMode)}
            >
              {generalPrefs.compactMode ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <MotionIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">Reduced Motion</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Minimize animations for focused use</p>
              </div>
            </div>
            <Button
              variant={generalPrefs.reducedMotion ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 text-xs sm:text-sm"
              onClick={() => updateGeneralPreference('reducedMotion', !generalPrefs.reducedMotion)}
            >
              {generalPrefs.reducedMotion ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Bell className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">Sound Effects</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Play interaction sounds for alerts and actions</p>
              </div>
            </div>
            <Button
              variant={generalPrefs.soundEffects ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 text-xs sm:text-sm"
              onClick={() => updateGeneralPreference('soundEffects', !generalPrefs.soundEffects)}
            >
              {generalPrefs.soundEffects ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        
        <div className="pt-2 sm:pt-4">
          <Button
            variant="outline"
            onClick={resetGeneralSettings}
            disabled={preferencesLoading}
            className="w-full sm:w-auto gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
          >
            {preferencesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Restore Default Settings
          </Button>
        </div>
      </section>
    </div>
  );
}

