import React, { useState, useEffect } from 'react';
import { FeedbackRecord, FirestoreMessage, UnifiedThread, UnifiedMessage } from '../types/dashboard';
import { 
  buildUnifiedThreads, 
  calculateRealisticTokens, 
  isPositive, 
  isNegative, 
  getRecordTimestamp 
} from '../utils/analytics';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Bot, 
  User, 
  ShoppingBag, 
  Search, 
  Users, 
  Copy, 
  Check, 
  Download, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Zap,
  Tag,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  messages?: FirestoreMessage[];
  targetConversationId?: string | null;
  targetMessageId?: string | null;
  onOpenRecord: (r: FeedbackRecord) => void;
  lang: 'ar' | 'en';
}

export const ConversationsLog: React.FC<Props> = ({ 
  records, 
  messages = [], 
  targetConversationId,
  targetMessageId,
  onOpenRecord, 
  lang 
}) => {
  const threads = buildUnifiedThreads(records, messages);
  const tokenMetrics = calculateRealisticTokens(records, messages);

  // Active client selection: default to targetConversationId or the first conversation (most recent)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(() => {
    if (targetConversationId && threads.some(t => t.conversationId === targetConversationId)) {
      return targetConversationId;
    }
    return threads.length > 0 ? threads[0].conversationId : null;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRating, setFilterRating] = useState<'all' | 'negative' | 'positive'>('all');
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  useEffect(() => {
    if (targetConversationId && threads.some(t => t.conversationId === targetConversationId)) {
      setSelectedConvId(targetConversationId);
      setMobileShowChat(true);
    }
  }, [targetConversationId, threads]);

  // Update selected if current selected became invalid
  useEffect(() => {
    if ((!selectedConvId || !threads.some(t => t.conversationId === selectedConvId)) && threads.length > 0) {
      setSelectedConvId(threads[0].conversationId);
    }
  }, [threads, selectedConvId]);

  // Filter threads by search query & sentiment
  const filteredThreads = threads.filter(t => {
    if (filterRating === 'negative' && !t.hasNegative) return false;
    if (filterRating === 'positive' && !t.hasPositive) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const clientLabel = (t.clientLabel || `العميل #${t.clientIndex}`).toLowerCase();
    return (
      clientLabel.includes(q) ||
      t.conversationId.toLowerCase().includes(q) ||
      t.messages.some(m => m.text.toLowerCase().includes(q))
    );
  });

  const activeThread = threads.find(t => t.conversationId === selectedConvId) || threads[0] || null;
  const activeTokenInfo = tokenMetrics.conversationsBreakdown.find(c => c.conversationId === activeThread?.conversationId);

  // Copy full conversation transcript to clipboard
  const handleCopyTranscript = () => {
    if (!activeThread) return;
    const transcript = activeThread.messages.map((m, idx) => {
      const sender = m.role === 'user' ? 'العميل' : 'مساعد مدهال الطيب';
      const timeStr = m.timestamp ? m.timestamp.toLocaleTimeString('ar-SA') : '';
      return `${idx + 1}. [${timeStr}] ${sender}:\n${m.text}\n`;
    }).join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Download full transcript as text file
  const handleDownloadTranscript = () => {
    if (!activeThread) return;
    const transcript = activeThread.messages.map((m, idx) => {
      const sender = m.role === 'user' ? 'العميل' : 'مساعد مدهال الطيب';
      const timeStr = m.timestamp ? m.timestamp.toLocaleString('ar-SA') : '';
      return `${idx + 1}. [${timeStr}] ${sender}:\n${m.text}\n`;
    }).join('\n----------------------------------------\n\n');

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medhal_conversation_${activeThread.conversationId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Summary Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D4B3A] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#D4B26F]" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              {lang === 'ar' ? 'محادثات العملاء (مستقلة لكل عميل من البداية للنهاية)' : 'Customer Conversations (Full Transcripts per Client)'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'كل محادثة جديدة يبدأها العميل تُعرض كاملةً بدون اقتطاع مع حساب الرموز وتفاصيل الحوار' 
                : 'Each customer session is displayed completely from beginning to end with tokens breakdown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-amber-50 border border-amber-200 text-[#2D4B3A] px-3 py-1.5 rounded-xl text-xs font-black">
            {threads.length} {lang === 'ar' ? 'محادثات عملاء مسجلة' : 'Client Threads'}
          </span>
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
            {threads.reduce((acc, t) => acc + t.messages.length, 0)} {lang === 'ar' ? 'رسالة متبادلة' : 'Total Msgs'}
          </span>
        </div>
      </div>

      {/* Main Two-Pane Chat Console Layout */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        
        {/* ========================================================= */}
        {/* LEFT / RIGHT SIDEBAR: LIST OF CLIENTS & CONVERSATIONS     */}
        {/* ========================================================= */}
        <div className={`lg:col-span-4 border-b lg:border-b-0 lg:border-l rtl:lg:border-l-0 rtl:lg:border-r border-slate-200 flex flex-col bg-slate-50/60 ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Search & Quick Filters Header */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 rtl:right-3 ltr:left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث باسم العميل أو نص الرسالة...' : 'Search client or message...'}
                className="w-full px-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#C29F5D]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setFilterRating('all')}
                className={`flex-1 py-1 px-2 rounded-lg text-center cursor-pointer transition-colors ${
                  filterRating === 'all' ? 'bg-[#2D4B3A] text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All'} ({threads.length})
              </button>
              <button
                onClick={() => setFilterRating('positive')}
                className={`py-1 px-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  filterRating === 'positive' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{lang === 'ar' ? 'إيجابي' : 'Positive'}</span>
              </button>
              <button
                onClick={() => setFilterRating('negative')}
                className={`py-1 px-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  filterRating === 'negative' ? 'bg-rose-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                }`}
              >
                <ThumbsDown className="w-3 h-3" />
                <span>{lang === 'ar' ? 'سلبي' : 'Issues'}</span>
              </button>
            </div>
          </div>

          {/* List of Client Conversation Cards */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[700px]">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {lang === 'ar' ? 'لا توجد محادثات عملاء مطابقة' : 'No matching clients found'}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedConvId === thread.conversationId;
                const clientName = thread.clientLabel || `العميل #${thread.clientIndex}`;
                const firstUser = thread.messages.find(m => m.role === 'user');
                const lastMsg = thread.messages[thread.messages.length - 1];
                const convTokens = tokenMetrics.conversationsBreakdown.find(c => c.conversationId === thread.conversationId);

                return (
                  <div
                    key={thread.conversationId}
                    onClick={() => {
                      setSelectedConvId(thread.conversationId);
                      setMobileShowChat(true);
                    }}
                    className={`p-3.5 transition-all cursor-pointer text-start ${
                      isSelected 
                        ? 'bg-amber-50/80 border-r-4 rtl:border-r-4 rtl:border-l-0 ltr:border-l-4 ltr:border-r-0 border-[#C29F5D] shadow-2xs' 
                        : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black text-xs px-2.5 py-0.5 rounded-lg ${
                          isSelected ? 'bg-[#2D4B3A] text-[#D4B26F]' : 'bg-amber-100 text-[#2D4B3A]'
                        }`}>
                          {clientName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          {thread.messages.length} {lang === 'ar' ? 'رسالة' : 'msgs'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {thread.hasNegative && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <ThumbsDown className="w-2.5 h-2.5 fill-rose-600" />
                          </span>
                        )}
                        {thread.hasPositive && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <ThumbsUp className="w-2.5 h-2.5 fill-emerald-600" />
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {thread.lastTime ? thread.lastTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Snippet of inquiry */}
                    <p className="text-xs text-slate-700 font-medium truncate mb-1" dir="auto">
                      <span className="text-slate-400 text-[11px] font-semibold">{lang === 'ar' ? 'البداية: ' : 'First: '}</span>
                      "{firstUser ? firstUser.text : (thread.firstUserQuery || 'محادثة')}"
                    </p>

                    {/* Footer metadata */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[150px]">{thread.conversationId}</span>
                      {convTokens && (
                        <span className="text-[#C29F5D] font-bold font-sans">
                          {convTokens.totalTokens.toLocaleString()} {lang === 'ar' ? 'رمز' : 'tokens'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN PANEL: THE COMPLETE CONVERSATION (START TO FINISH)   */}
        {/* ========================================================= */}
        <div className={`lg:col-span-8 flex flex-col bg-[#FAF9F5] ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
          {activeThread ? (
            <>
              {/* Active Conversation Sticky Top Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
                
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="lg:hidden p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    title={lang === 'ar' ? 'الرجوع لقائمة العملاء' : 'Back to client list'}
                  >
                    {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-[#2D4B3A] bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-lg">
                        {activeThread.clientLabel || `العميل #${activeThread.clientIndex}`}
                      </span>

                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {activeThread.conversationId}
                      </span>

                      <span className="text-xs font-bold text-slate-700 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                        {activeThread.messages.length} {lang === 'ar' ? 'رسائل من البداية للنهاية' : 'full messages'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#C29F5D]" />
                        {activeThread.lastTime ? activeThread.lastTime.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US') : 'N/A'}
                      </span>
                      {activeTokenInfo && (
                        <span className="text-[#2D4B3A] font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded">
                          <Zap className="w-3 h-3 text-[#C29F5D]" />
                          <span>{lang === 'ar' ? 'الرموز:' : 'Tokens:'} {activeTokenInfo.totalTokens.toLocaleString()} ({activeTokenInfo.costSAR.toFixed(4)} ر.س)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={handleCopyTranscript}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'نسخ الحوار كاملاً' : 'Copy transcript'}
                  >
                    {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedTranscript ? (lang === 'ar' ? 'تم النسخ ✅' : 'Copied!') : (lang === 'ar' ? 'نسخ المحادثة' : 'Copy')}</span>
                  </button>

                  <button
                    onClick={handleDownloadTranscript}
                    className="px-3 py-1.5 bg-[#2D4B3A] hover:bg-[#3E634F] text-[#D4B26F] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title={lang === 'ar' ? 'تحميل ملف المحادثة' : 'Download text'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تنزيل TXT' : 'Export'}</span>
                  </button>
                </div>

              </div>

              {/* THE ENTIRE CONVERSATION TRANSCRIPT: FROM FIRST MESSAGE TO LAST MESSAGE */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[640px]">
                
                {/* Conversation Start Banner */}
                <div className="text-center py-2">
                  <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-3.5 py-1 rounded-full shadow-3xs">
                    {lang === 'ar' ? 'بداية محادثة العميل مع المساعد الذكي' : 'Conversation initiated'}
                  </span>
                </div>

                {/* Messages Sequenced Chronologically */}
                {activeThread.messages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  const isNegativeRating = m.rating === 'negative';
                  const isPositiveRating = m.rating === 'positive';

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex gap-3 transition-all ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Assistant Avatar */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-[#2D4B3A] text-[#D4B26F] flex items-center justify-center shrink-0 shadow-xs mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      {/* Bubble Container */}
                      <div
                        className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 space-y-2 transition-all shadow-3xs ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs'
                            : isNegativeRating
                              ? 'bg-rose-50/90 border border-rose-300 text-slate-900 rounded-tl-xs ring-1 ring-rose-200'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                        }`}
                      >
                        {/* Bubble Meta Header */}
                        <div className="flex items-center justify-between gap-3 text-[11px] font-bold pb-1 border-b border-black/5">
                          <span className={isUser ? 'text-[#D4B26F]' : 'text-[#2D4B3A]'}>
                            {isUser ? (lang === 'ar' ? `العميل (${idx + 1})` : `Client (#${idx + 1})`) : (lang === 'ar' ? 'مساعد مدهال الطيب' : 'Medhal Assistant')}
                          </span>

                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            {m.timestamp && (
                              <span className={isUser ? 'text-slate-400' : 'text-slate-400'}>
                                {m.timestamp.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                              </span>
                            )}

                            {m.rating && (
                              <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                isPositiveRating ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isPositiveRating ? <ThumbsUp className="w-2.5 h-2.5 fill-emerald-600" /> : <ThumbsDown className="w-2.5 h-2.5 fill-rose-600" />}
                                <span>{isPositiveRating ? '👍' : '👎'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Negative Rating Notice */}
                        {isNegativeRating && (
                          <div className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                            <ThumbsDown className="w-3 h-3 fill-rose-700 shrink-0" />
                            <span>{lang === 'ar' ? 'العميل قيّم هذا الرد بتقييم سلبي 👎' : 'Customer marked this reply as unhelpful'}</span>
                          </div>
                        )}

                        {/* The Actual Text */}
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap font-medium ${isUser ? 'text-white' : 'text-slate-800'}`} dir="auto">
                          {m.text}
                        </p>

                        {/* Product Cards if attached */}
                        {m.products && m.products.length > 0 && (
                          <div className="pt-2 border-t border-black/5 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              {lang === 'ar' ? 'بطاقات المنتجات المقترحة:' : 'Product Cards:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {m.products.map((p, pIdx) => (
                                <div key={p.productId || pIdx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-800">
                                  <div className="flex items-center gap-2 truncate">
                                    <ShoppingBag className="w-4 h-4 text-[#C29F5D] shrink-0" />
                                    <div className="truncate">
                                      <div className="font-bold text-[#2D4B3A] truncate">{p.name}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">{p.price} {p.weight ? `· ${p.weight}` : ''}</div>
                                    </div>
                                  </div>
                                  {p.link && (
                                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 font-bold hover:underline shrink-0">
                                      {lang === 'ar' ? 'عرض ↗' : 'View ↗'}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assistant Footer Info */}
                        {!isUser && (
                          <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-black/5">
                            <span>{m.modelUsed || 'gemini-3.8-flash'}</span>
                            {m.feedbackRecord && (
                              <button
                                onClick={() => onOpenRecord(m.feedbackRecord!)}
                                className="text-[#C29F5D] hover:underline font-bold cursor-pointer font-sans"
                              >
                                {lang === 'ar' ? 'تفاصيل التقييم ↗' : 'Audit Details ↗'}
                              </button>
                            )}
                          </div>
                        )}

                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-[#C29F5D] text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-bold mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Conversation End Indicator */}
                <div className="text-center pt-3 pb-2">
                  <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-3.5 py-1 rounded-full shadow-3xs">
                    {lang === 'ar' ? `نهاية محادثة ${activeThread.clientLabel || 'العميل'} (${activeThread.messages.length} رسالة)` : 'End of conversation'}
                  </span>
                </div>

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-xs">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <span>{lang === 'ar' ? 'اختر عميلاً من القائمة لعرض كامل محادثته' : 'Select a customer to view their transcript'}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
