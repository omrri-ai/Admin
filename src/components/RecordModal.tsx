import React, { useState } from 'react';
import { FeedbackRecord, FirestoreMessage } from '../types/dashboard';
import { isPositive, isNegative, getRecordTimestamp, buildUnifiedThreads } from '../utils/analytics';
import { 
  X, 
  ThumbsUp, 
  ThumbsDown, 
  ShoppingBag, 
  Trash2, 
  ExternalLink,
  Clock,
  Cpu,
  Activity,
  Copy,
  Check,
  MessageSquare,
  User,
  Bot,
  Layers,
  Sparkles
} from 'lucide-react';

interface Props {
  record: FeedbackRecord;
  allMessages?: FirestoreMessage[];
  allFeedbacks?: FeedbackRecord[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onOpenFullConversation?: (conversationId: string, messageId?: string) => void;
  onUpdateStatus?: (id: string, issueType: string, reviewStatus: string) => void;
  lang: 'ar' | 'en';
}

export const RecordModal: React.FC<Props> = ({ 
  record, 
  allMessages = [], 
  allFeedbacks = [], 
  onClose, 
  onDelete, 
  onOpenFullConversation,
  onUpdateStatus, 
  lang 
}) => {
  const [modalTab, setModalTab] = useState<'details' | 'conversation'>('details');
  const [copied, setCopied] = useState(false);
  const [issueType, setIssueType] = useState<string>(record.issueType || 'none');
  const [reviewStatus, setReviewStatus] = useState<any>(record.reviewStatus || 'new');

  const products = record.products || record.productCards || [];
  const timestamp = getRecordTimestamp(record);

  // Compute full thread for this conversation
  const combinedFeedbacks = allFeedbacks.length > 0 ? allFeedbacks : [record];
  const threads = buildUnifiedThreads(combinedFeedbacks, allMessages);
  const currentThread = threads.find(t => t.conversationId === record.conversationId);
  const threadMessages = currentThread?.messages || [];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 flex items-center justify-center p-4 z-50 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white max-w-3xl w-full rounded-2xl border border-amber-200/40 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[92vh] space-y-4 animate-scale-up">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${isPositive(record.rating) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {isPositive(record.rating) ? <ThumbsUp className="w-3.5 h-3.5 fill-emerald-600" /> : <ThumbsDown className="w-3.5 h-3.5 fill-rose-600" />}
              <span>{isPositive(record.rating) ? (lang === 'ar' ? '👍 إيجابي' : 'Like') : (lang === 'ar' ? '👎 سلبي' : 'Dislike')}</span>
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">{lang === 'ar' ? 'تفاصيل التقييم والمحادثة' : 'Evaluation & Conversation Details'}</h3>
              <span className="text-[10px] font-mono text-slate-400">Conv: {record.conversationId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(record.id)}
              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setModalTab('details')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modalTab === 'details' ? 'bg-[#2D4B3A] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4B26F]" />
              <span>{lang === 'ar' ? 'تفاصيل التقييم والتشخيص' : 'Evaluation Details'}</span>
            </button>
            
            <button
              onClick={() => setModalTab('conversation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modalTab === 'conversation' ? 'bg-[#2D4B3A] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#C29F5D]" />
              <span>
                {lang === 'ar' ? 'المحادثة الكاملة لهذا العميل' : 'Full Conversation Thread'} ({threadMessages.length || 2} {lang === 'ar' ? 'رسالة' : 'msgs'})
              </span>
            </button>
          </div>

          {onOpenFullConversation && record.conversationId && (
            <button
              onClick={() => onOpenFullConversation(record.conversationId!, record.messageId)}
              className="text-[11px] font-bold text-[#C29F5D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'ar' ? 'فتح في قسم المحادثات ↗' : 'Open in Tab ↗'}</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 pr-1">
          
          {/* TAB 1: EVALUATION DETAILS */}
          {modalTab === 'details' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Question Text */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>{lang === 'ar' ? 'سؤال العميل الكامل' : 'Full Customer Query'}</span>
                  <button onClick={() => handleCopy(record.userQuery)} className="hover:text-slate-600 flex items-center gap-0.5 cursor-pointer">
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
                <p className="font-bold text-slate-900 leading-relaxed text-xs" dir="auto">{record.userQuery}</p>
              </div>

              {/* Response Text */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>{lang === 'ar' ? 'رد المساعد المعروض للعميل' : 'Assistant Full Response'}</span>
                  <button onClick={() => handleCopy(record.assistantResponse || record.assistantReply || '')} className="hover:text-slate-600 flex items-center gap-0.5 cursor-pointer">
                    <Copy className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'نسخ' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed" dir="auto">
                  {record.assistantResponse || record.assistantReply || (lang === 'ar' ? 'غير متوفر' : 'N/A')}
                </p>
              </div>

              {/* Product Cards Shown */}
              {products.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{lang === 'ar' ? 'بطاقات المنتجات التي ظهرت' : 'Product Cards Displayed'}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {products.map((p, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FAF7F2] border border-amber-200/40 flex items-center justify-center text-[#C29F5D] shrink-0">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{p.name}</h4>
                          {p.weight && <p className="text-[10px] text-slate-400">{p.weight}</p>}
                          {p.price && <div className="text-[11px] font-bold text-[#C29F5D]">{p.price}</div>}
                          {p.link && (
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5">
                              <span>{lang === 'ar' ? 'رابط المنتج' : 'Link'}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance & Model Diagnostics */}
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-slate-200/70 space-y-2 font-mono text-[10px]">
                <div className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 font-sans">
                  <Activity className="w-3.5 h-3.5 text-[#2D4B3A]" />
                  <span>{lang === 'ar' ? 'بيانات الأداء والنموذج الفعلي' : 'Execution Metadata'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Model</span>
                    <span className="font-bold text-slate-900">{record.modelUsed || 'Unspecified'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Latency</span>
                    <span className="font-bold text-slate-900">{record.diagnostics?.latency ? `${record.diagnostics.latency}ms` : 'N/A'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Prompt Tokens</span>
                    <span className="font-bold text-slate-900">{record.diagnostics?.tokenUsage?.promptTokens ?? 'N/A'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Output Tokens</span>
                    <span className="font-bold text-slate-900">{record.diagnostics?.tokenUsage?.completionTokens ?? 'N/A'}</span>
                  </div>
                </div>
                
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
                    <span>Conv: <strong className="text-slate-600">{record.conversationId || 'N/A'}</strong></span>
                    <span>Msg: <strong className="text-slate-600">{record.messageId || 'N/A'}</strong></span>
                    <span>Time: <strong className="text-slate-600">{timestamp ? timestamp.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US') : 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Admin Categorization */}
              {onUpdateStatus && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/40 space-y-2">
                  <span className="text-[10px] font-bold text-[#2D4B3A] uppercase block">{lang === 'ar' ? 'تحديث حالة المراجعة الإدارية' : 'Admin Status Update'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={issueType}
                      onChange={(e) => {
                        setIssueType(e.target.value);
                        onUpdateStatus(record.id, e.target.value, reviewStatus);
                      }}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="none">بدون مشكلة</option>
                      <option value="unanswered">بدون إجابة</option>
                      <option value="price_error">خطأ في السعر</option>
                      <option value="weight_error">خطأ في الوزن</option>
                      <option value="product_error">خطأ في المنتج</option>
                      <option value="other">مشكلة أخرى</option>
                    </select>

                    <select
                      value={reviewStatus}
                      onChange={(e) => {
                        setReviewStatus(e.target.value);
                        onUpdateStatus(record.id, issueType, e.target.value);
                      }}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="new">جديد 🆕</option>
                      <option value="reviewing">قيد المراجعة ⏳</option>
                      <option value="fixed">تم التصحيح ✅</option>
                      <option value="ignored">تم التجاهل 💤</option>
                    </select>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: FULL CONVERSATION TIMELINE */}
          {modalTab === 'conversation' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  {lang === 'ar' ? 'سجل المحادثة الكاملة مرتباً زمنياً من أول رسالة إلى آخر رسالة:' : 'Chronological conversation timeline:'}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  {threadMessages.length} {lang === 'ar' ? 'رسالة' : 'messages'}
                </span>
              </div>

              {threadMessages.length === 0 ? (
                /* Fallback if no thread messages yet */
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">{lang === 'ar' ? 'العميل' : 'Customer'}</span>
                    <p className="text-xs text-slate-800" dir="auto">{record.userQuery}</p>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border-2 border-[#C29F5D] space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-[#2D4B3A]">{lang === 'ar' ? 'مساعد مدهال الطيب (الرد المقيم 🎯)' : 'Assistant (Evaluated)'}</span>
                      <span className="font-bold text-rose-700">👎 تقييم العميل</span>
                    </div>
                    <p className="text-xs text-slate-800" dir="auto">{record.assistantResponse || record.assistantReply}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {threadMessages.map((m, idx) => {
                    const isEvaluatedMessage = (m.messageId && m.messageId === record.messageId) || 
                      (m.role === 'assistant' && (m.text === record.assistantResponse || m.text === record.assistantReply));

                    return (
                      <div 
                        key={m.id || idx}
                        className={`p-3.5 rounded-2xl transition-all space-y-2 ${
                          isEvaluatedMessage
                            ? 'bg-amber-50/80 border-2 border-[#C29F5D] shadow-sm'
                            : m.role === 'user'
                              ? 'bg-white border border-slate-200'
                              : 'bg-emerald-50/30 border border-emerald-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              m.role === 'user' ? 'bg-[#C29F5D] text-slate-950' : 'bg-[#2D4B3A] text-[#D4B26F]'
                            }`}>
                              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>
                            <span className={m.role === 'user' ? 'text-slate-800' : 'text-[#2D4B3A]'}>
                              {m.role === 'user' ? (lang === 'ar' ? 'العميل' : 'Customer') : (lang === 'ar' ? 'مساعد مدهال الطيب' : 'Assistant')}
                            </span>
                            {isEvaluatedMessage && (
                              <span className="text-[9px] bg-[#C29F5D] text-slate-950 px-2 py-0.5 rounded-full font-black animate-pulse">
                                {lang === 'ar' ? 'الرد المقيم بالتقييم الحالي 🎯' : 'Evaluated Message 🎯'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                            {m.timestamp && (
                              <span>{m.timestamp.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                            )}
                            {m.rating && (
                              <span className={`px-2 py-0.5 rounded font-bold ${m.rating === 'positive' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {m.rating === 'positive' ? '👍' : '👎'}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed pr-8" dir="auto">
                          {m.text}
                        </p>

                        {/* Product Cards */}
                        {m.products && m.products.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            {m.products.map((p, pIdx) => (
                              <div key={p.productId || pIdx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#2D4B3A] truncate">{p.name}</span>
                                <span className="text-[#C29F5D] font-mono shrink-0">{p.price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
