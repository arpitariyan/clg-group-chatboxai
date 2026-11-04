'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/auth-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Flame,
  CreditCard,
  Zap,
  Bug,
  HelpCircle,
  Lightbulb,
  User,
  ShieldCheck,
  Image as ImageIcon,
  X,
  Search,
  RotateCcw,
  Star,
  MessageSquare,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = [
  { id: 'billing', label: 'Billing & Payment', icon: CreditCard, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'credits', label: 'Credits & Models', icon: Zap, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'technical', label: 'Bug / Technical', icon: Bug, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { id: 'account', label: 'Account & Login', icon: User, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  { id: 'general', label: 'General Inquiry', icon: HelpCircle, color: 'text-muted-foreground bg-muted border-border' },
];

const PRIORITIES = [
  { id: 'normal', label: 'Normal', color: 'text-muted-foreground bg-muted border-border' },
  { id: 'high', label: 'High', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'urgent', label: 'Urgent', icon: Flame, color: 'text-destructive bg-destructive/10 border-destructive/20' },
];

const FAQ_ITEMS = [
  {
    q: 'When do daily free model credits reset?',
    a: 'Free credits (5,000 daily credits) reset every 24 hours at 00:00 UTC automatically for all active accounts.',
  },
  {
    q: 'How do paid credits work for Claude & GPT-4 models?',
    a: 'Paid credits never expire during an active billing cycle and roll into your monthly allotment upon subscription renewal.',
  },
  {
    q: 'Can I cancel or upgrade my Pro subscription anytime?',
    a: 'Yes! Navigate to the Pricing page or Settings > Subscription to upgrade or manage your billing plan with immediate activation.',
  },
  {
    q: 'Where do I find my generated images and websites?',
    a: 'Use the left sidebar navigation to access "Gallery" for AI images or "Website Builder" for your full-stack applications.',
  },
];

export default function SupportChatPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // UI state
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  // Rating State
  const [rating, setRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // New Ticket Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('billing');
  const [newPriority, setNewPriority] = useState('normal');
  const [newDescription, setNewDescription] = useState('');
  const [newTicketImage, setNewTicketImage] = useState(null);
  const [newTicketImagePreview, setNewTicketImagePreview] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const textareaRef = useRef(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Audio notification chime
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (_) {}
  };

  // Fetch all conversations
  const fetchConversations = async (autoSelect = false) => {
    if (!currentUser?.email) return;
    try {
      const res = await authFetch(`/api/support?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (autoSelect && data.conversations.length > 0 && !activeConversationIdRef.current) {
          setActiveConversationId(data.conversations[0].$id);
          setActiveConversation(data.conversations[0]);
        }
      }
    } catch (error) {
      console.error('[Support] Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (convId, silent = false) => {
    if (!currentUser?.email || !convId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await authFetch(
        `/api/support?email=${encodeURIComponent(currentUser.email)}&conversationId=${convId}`
      );
      const data = await res.json();
      if (data.messages) {
        setMessages((prev) => {
          if (silent && data.messages.length > prev.length) {
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg.sender === 'admin') {
              playChime();
            }
          }
          return data.messages;
        });
      }
      if (data.conversation) {
        setActiveConversation(data.conversation);
      }
    } catch (error) {
      console.error('[Support] Error fetching messages:', error);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Realtime & Live Polling (3.5s)
  useEffect(() => {
    if (!currentUser?.email) {
      setLoadingConversations(false);
      return;
    }

    fetchConversations(true);

    let unsubscribe = () => {};
    import('@/services/appwrite-support-client')
      .then(({ supportClient, SUPPORT_DB_ID, SUPPORT_COLLECTION_ID, SUPPORT_CONVERSATIONS_COLLECTION_ID }) => {
        const messagesChannel = `databases.${SUPPORT_DB_ID}.collections.${SUPPORT_COLLECTION_ID}.documents`;
        const convsChannel = `databases.${SUPPORT_DB_ID}.collections.${SUPPORT_CONVERSATIONS_COLLECTION_ID}.documents`;

        unsubscribe = supportClient.subscribe([messagesChannel, convsChannel], (response) => {
          if (
            response.events.includes('databases.*.collections.*.documents.*.create') ||
            response.events.includes('databases.*.collections.*.documents.*.update')
          ) {
            const doc = response.payload;
            if (doc.userEmail?.toLowerCase() === currentUser.email?.toLowerCase()) {
              if (doc.$collectionId === SUPPORT_CONVERSATIONS_COLLECTION_ID) {
                fetchConversations();
                if (activeConversationIdRef.current === doc.$id) {
                  setActiveConversation(doc);
                }
              } else {
                fetchConversations();
                if (activeConversationIdRef.current === doc.conversationId) {
                  fetchMessages(doc.conversationId, true);
                }
              }
            }
          }
        });
      })
      .catch((err) => console.warn('[Support Realtime] Fallback to poll:', err.message));

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConversations();
        if (activeConversationIdRef.current) {
          fetchMessages(activeConversationIdRef.current, true);
        }
      }
    }, 3500);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  useEffect(() => {
    if (activeConversationId) {
      const match = conversations.find((c) => c.$id === activeConversationId);
      if (match) setActiveConversation(match);
      fetchMessages(activeConversationId);
      setRatingSubmitted(false);
      setMobileView('chat');
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Attachment must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Attachment must be less than 5MB');
        return;
      }
      setNewTicketImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewTicketImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeModalImage = () => {
    setNewTicketImage(null);
    setNewTicketImagePreview(null);
    if (modalFileInputRef.current) modalFileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageFile) || !currentUser?.email || !activeConversationId) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('userEmail', currentUser.email);
      if (messageText) formData.append('message', messageText);
      formData.append('conversationId', activeConversationId);
      if (imageFile) formData.append('image', imageFile);

      const res = await authFetch('/api/support', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        removeImage();
        fetchMessages(activeConversationId, true);
        fetchConversations();
      } else {
        console.error('Failed to send:', data.error);
        fetchMessages(activeConversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      fetchMessages(activeConversationId);
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim() || !currentUser?.email) return;

    setCreatingTicket(true);
    try {
      const formData = new FormData();
      formData.append('userEmail', currentUser.email);
      formData.append('action', 'create_conversation');
      formData.append('subject', newSubject.trim());
      formData.append('message', newDescription.trim());
      formData.append('category', newCategory);
      formData.append('priority', newPriority);
      if (newTicketImage) formData.append('image', newTicketImage);

      const res = await authFetch('/api/support', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.conversationId) {
        setShowNewModal(false);
        setNewSubject('');
        setNewDescription('');
        setNewCategory('billing');
        setNewPriority('normal');
        removeModalImage();

        setActiveConversationId(data.conversationId);
        fetchConversations(false);
      } else {
        alert(data.error || 'Failed to create support ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating support ticket. Please try again.');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeConversationId) return;
    if (!confirm('Mark this ticket as resolved and closed?')) return;

    try {
      const res = await authFetch('/api/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser.email,
          conversationId: activeConversationId,
          action: 'close',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages(activeConversationId);
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to close ticket:', error);
    }
  };

  const handleReopenTicket = async () => {
    if (!activeConversationId) return;
    try {
      const res = await authFetch('/api/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser.email,
          conversationId: activeConversationId,
          action: 'reopen',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages(activeConversationId);
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to reopen ticket:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (!activeConversationId) return;
    setSubmittingRating(true);
    try {
      const res = await authFetch('/api/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser.email,
          conversationId: activeConversationId,
          action: 'rate',
          rating,
          feedback: ratingFeedback,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRatingSubmitted(true);
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        (c.topic && c.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.ticketId && c.ticketId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && (c.status === 'open' || c.status === 'in_progress')) ||
        (statusFilter === 'resolved' && c.status === 'resolved') ||
        (statusFilter === 'closed' && c.status === 'closed');

      return matchesSearch && matchesStatus;
    });
  }, [conversations, searchQuery, statusFilter]);

  if (loadingConversations && conversations.length === 0) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Loading Support...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex w-full h-full items-center justify-center flex-col gap-4 bg-background text-foreground p-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">Sign in to contact Support</h2>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Please sign in to track your inquiries and converse with ChatBox AI support specialists.
        </p>
        <Button onClick={() => router.push('/sign-in')} className="rounded-xl px-5 h-9 text-xs">
          Sign In
        </Button>
      </div>
    );
  }

  const categoryMeta = CATEGORIES.find((c) => c.id === activeConversation?.category) || CATEGORIES[5];
  const isClosed = activeConversation?.status === 'closed';
  const isResolved = activeConversation?.status === 'resolved';

  return (
    <div className="flex w-full h-full min-h-0 bg-background text-foreground overflow-hidden">
      {/* LEFT COLUMN: TICKET SIDEBAR */}
      <div
        className={`w-full md:w-80 lg:w-88 border-r border-border bg-card/40 flex flex-col shrink-0 transition-all ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border bg-card flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-foreground">Support</h2>
                <span className="flex items-center gap-1 text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">ChatBox AI Care</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground/50" />}
            </Button>

            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium gap-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="p-3 border-b border-border space-y-2 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets or #TKT..."
              className="h-8 pl-8 text-xs bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted/40 rounded-xl text-[10px] font-medium text-center">
            {[
              { id: 'all', label: 'All' },
              { id: 'open', label: 'Open' },
              { id: 'resolved', label: 'Solved' },
              { id: 'closed', label: 'Closed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`py-1 rounded-lg transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <MessageSquare className="h-6 w-6 mb-2 opacity-30" />
              <p className="text-xs font-medium text-foreground/80">No tickets found</p>
              <p className="text-[11px] opacity-70 mt-1">Start a new chat to get assistance.</p>
              {conversations.length === 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowNewModal(true)}
                  variant="outline"
                  className="mt-3 h-7 text-xs rounded-lg"
                >
                  <Plus className="h-3 w-3 mr-1" /> Open Ticket
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConversationId === conv.$id;
              const cat = CATEGORIES.find((c) => c.id === conv.category) || CATEGORIES[5];
              const CatIcon = cat.icon;

              return (
                <button
                  key={conv.$id}
                  onClick={() => setActiveConversationId(conv.$id)}
                  className={`w-full text-left p-3 rounded-xl transition-all relative ${
                    isSelected
                      ? 'bg-accent text-accent-foreground border border-border shadow-xs'
                      : 'hover:bg-accent/40 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                      {conv.ticketId || `#${conv.$id.slice(-6).toUpperCase()}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {conv.updatedAt ? formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true }) : ''}
                    </span>
                  </div>

                  <h3 className="font-medium text-xs text-foreground truncate mb-1">
                    {conv.topic || 'Untitled Conversation'}
                  </h3>

                  <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border ${cat.color}`}>
                        <CatIcon className="h-2.5 w-2.5" />
                        {cat.label.split(' ')[0]}
                      </span>

                      {conv.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 rounded font-bold text-destructive bg-destructive/10 border border-destructive/20 flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5" /> Urgent
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[9px] ${
                        conv.status === 'closed'
                          ? 'bg-muted text-muted-foreground'
                          : conv.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : conv.status === 'in_progress'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-green-500/10 text-green-500 border border-green-500/20'
                      }`}
                    >
                      {conv.status?.replace('_', ' ') || 'OPEN'}
                    </span>
                  </div>

                  {conv.hasUnreadMessages && (
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CONVERSATION OR FAQ DESK */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-background relative ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3.5 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileView('list')}
                  className="h-8 w-8 md:hidden text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      {activeConversation.ticketId || `#${activeConversation.$id.slice(-6).toUpperCase()}`}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        isClosed
                          ? 'bg-muted text-muted-foreground'
                          : isResolved
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : activeConversation.status === 'in_progress'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-green-500/10 text-green-500 border border-green-500/20'
                      }`}
                    >
                      {activeConversation.status?.replace('_', ' ') || 'OPEN'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${categoryMeta.color}`}>
                      {categoryMeta.label}
                    </span>
                  </div>
                  <h2 className="font-semibold text-sm text-foreground truncate mt-0.5">
                    {activeConversation.topic || 'Support Ticket'}
                  </h2>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!isClosed && !isResolved ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCloseTicket}
                    className="h-8 text-xs rounded-xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Solved
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReopenTicket}
                    className="h-8 text-xs rounded-xl border-border text-foreground hover:bg-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reopen Ticket
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {loadingMessages && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Notice */}
              <div className="flex justify-center my-1">
                <div className="text-[10px] text-muted-foreground bg-muted/60 border border-border/60 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  <span>
                    Created on {new Date(activeConversation.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.$id} className="flex justify-center my-2">
                      <div className="text-[10px] text-muted-foreground bg-muted/40 border border-border px-3 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span>{msg.message}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.$id} className={`flex gap-2.5 items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs font-semibold text-xs">
                        CB
                      </div>
                    )}

                    <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[11px] font-semibold text-foreground">ChatBox Support</span>
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-medium border border-primary/20">
                            Staff
                          </span>
                        </div>
                      )}

                      <div
                        className={`px-4 py-3 rounded-2xl shadow-xs text-sm leading-relaxed ${
                          isUser
                            ? 'bg-primary text-primary-foreground rounded-br-xs'
                            : 'bg-muted border border-border/70 text-foreground rounded-bl-xs'
                        }`}
                      >
                        {msg.imageUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-border bg-black/30">
                            <img
                              src={msg.imageUrl}
                              alt="Attachment"
                              className="max-h-60 max-w-full object-contain cursor-pointer hover:opacity-90"
                              onClick={() => setLightboxImage(msg.imageUrl)}
                            />
                          </div>
                        )}
                        {msg.message && <p className="whitespace-pre-wrap text-[13.5px]">{msg.message}</p>}
                      </div>

                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground font-bold text-xs uppercase shrink-0">
                        {currentUser.email ? currentUser.email[0] : 'U'}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Rating Card */}
              {(isResolved || isClosed) && (
                <div className="mt-8 p-5 rounded-2xl bg-card border border-border max-w-md mx-auto text-center space-y-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                    <Star className="h-5 w-5 fill-primary/20" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">How was your support experience?</h3>
                  <p className="text-xs text-muted-foreground">Your rating helps us improve our customer service quality.</p>

                  {ratingSubmitted || activeConversation.rating > 0 ? (
                    <div className="py-2 text-emerald-500 text-xs font-medium flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Thank you for your feedback!
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1 text-muted-foreground/40 hover:text-amber-400 transition-colors"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        value={ratingFeedback}
                        onChange={(e) => setRatingFeedback(e.target.value)}
                        placeholder="Optional comments..."
                        className="h-8 text-xs bg-background border-border rounded-xl"
                      />
                      <Button
                        size="sm"
                        onClick={handleSubmitRating}
                        disabled={submittingRating}
                        className="h-8 px-4 text-xs rounded-xl"
                      >
                        {submittingRating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit Rating'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Bottom Composer */}
            <div className="p-3 md:p-4 bg-background/80 backdrop-blur-md border-t border-border shrink-0">
              {isClosed ? (
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-xl text-center sm:text-left">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">This support ticket is closed</p>
                      <p className="text-[11px] text-muted-foreground">
                        Click Reopen to continue this ticket or start a new inquiry.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleReopenTicket} className="h-8 text-xs rounded-xl">
                      <RotateCcw className="h-3 w-3 mr-1" /> Reopen
                    </Button>
                    <Button size="sm" onClick={() => setShowNewModal(true)} className="h-8 text-xs rounded-xl">
                      <Plus className="h-3 w-3 mr-1" /> New Ticket
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="max-w-4xl mx-auto bg-muted/40 hover:bg-muted/60 focus-within:bg-background border border-border/70 rounded-2xl p-2 transition-all"
                >
                  {imagePreview && (
                    <div className="relative inline-block m-2">
                      <img src={imagePreview} alt="Preview" className="h-16 w-auto rounded-lg object-cover border" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0 mb-0.5"
                      title="Attach image"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>

                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Type your message to support... (Enter to send)"
                      className="flex-1 bg-transparent border-0 outline-none resize-none text-xs md:text-sm text-foreground placeholder:text-muted-foreground/60 py-2 px-1 min-h-[40px] max-h-32"
                      rows={1}
                      disabled={sending}
                    />

                    <Button
                      type="submit"
                      disabled={(!newMessage.trim() && !imageFile) || sending}
                      className="h-9 w-9 rounded-full bg-primary text-primary-foreground shrink-0 mb-0.5 shadow-sm"
                      size="icon"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          /* Welcome & FAQ Screen */
          <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">How can we help you today?</h1>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
                Our support team is ready to assist with account, billing, model credits, or technical questions.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => setShowNewModal(true)} className="h-9 px-5 rounded-xl text-xs font-medium">
                <Plus className="h-4 w-4 mr-1.5" /> Create a Support Ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/pricing')}
                className="h-9 px-4 rounded-xl text-xs"
              >
                <CreditCard className="h-4 w-4 mr-1.5" /> View Pricing & Plans
              </Button>
            </div>

            {/* FAQs */}
            <div className="w-full pt-6 border-t border-border text-left space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">
                Frequently Asked Questions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FAQ_ITEMS.map((faq, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-muted/20 border border-border">
                    <h4 className="text-xs font-medium text-foreground mb-1">{faq.q}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Create Support Ticket</h3>
                  <p className="text-[11px] text-muted-foreground">Submit an inquiry to the ChatBox team</p>
                </div>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = newCategory === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setNewCategory(cat.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[11px]">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => {
                    const isSelected = newPriority === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setNewPriority(p.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Subject</label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Paid credits not reflected after payment"
                  className="h-9 text-xs bg-background border-border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full h-24 text-xs bg-background border border-border rounded-xl p-2.5 outline-none resize-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Screenshot (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={modalFileInputRef}
                  onChange={handleModalImageChange}
                />

                {newTicketImagePreview ? (
                  <div className="relative inline-block">
                    <img src={newTicketImagePreview} alt="Preview" className="h-20 w-auto rounded-lg object-cover border" />
                    <button
                      type="button"
                      onClick={removeModalImage}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground text-xs flex items-center justify-center gap-2 bg-muted/20"
                  >
                    <ImageIcon className="h-4 w-4" /> Attach screenshot (Max 5MB)
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewModal(false)}
                  className="h-9 px-4 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingTicket || !newSubject.trim() || !newDescription.trim()}
                  className="h-9 px-5 text-xs rounded-xl"
                >
                  {creatingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 bg-white/20 text-white rounded-full p-1.5 hover:bg-white/40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
