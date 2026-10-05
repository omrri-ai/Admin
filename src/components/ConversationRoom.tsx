import React, { useState, useEffect } from 'react';
import { UnifiedThread, UnifiedMessage, FeedbackRecord } from '../types/dashboard';
import { isPositive, isNegative, getRecordTimestamp } from '../utils/analytics';
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Bot, 
  Clock, 
  ShoppingBag, 
  ThumbsUp, 
  ThumbsDown, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles, 
  Lightbulb, 
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  FileText,
  Sliders,
  Send,
  HelpCircle
} from 'lucide-react';

interface Props {
  thread: UnifiedThread;
  targetMessageId?: string | null;
  onBack: () => void;
  onUpdateFeedbackStatus?: (feedbackId: string, issueType: string, reviewStatus: string) => void;
  onOpenRecordModal?: (record: FeedbackRecord) => void;
  lang: 'ar' | 'en';
}

export const ConversationRoom: React.FC<Props> = ({
  thread,
  targetMessageId,
  onBack,
  onUpdateFeedbackStatus,
  onOpenRecordModal,
  lang
}) => {
  const [copiedRule, setCopiedRule] = useState(false);
  const [copiedConv, setCopiedConv] = useState(false);
  const [showSolutionReport, setShowSolutionReport] = useState(true);

  // Find evaluated message or record if available
  const evaluatedMsg = thread.messages.find(m => m.rating === 'negative') || 
                       thread.messages.find(m => m.rating === 'positive') || 
                       thread.messages.find(m => m.feedbackRecord);
                       
  const activeFeedback = evaluatedMsg?.feedbackRecord;
  const isNegativeCase = thread.hasNegative || (evaluatedMsg && evaluatedMsg.rating === 'negative');

  // Auto-scroll to target message on mount
  useEffect(() => {
    if (targetMessageId) {
      setTimeout(() => {
        const el = document.getElementById(`room-msg-${targetMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [targetMessageId]);

  // Copy full conversation transcript
  const handleCopyConversation = () => {
    const transcript = thread.messages.map(m => {
      const roleName = m.role === 'user' ? 'العميل' : 'مساعد مدهال الطيب';
      const timeStr = m.timestamp ? m.timestamp.toLocaleTimeString('ar-SA') : '';
      return `[${timeStr}] ${roleName}:\n${m.text}\n`;
    }).join('\n--------------------\n\n');

    navigator.clipboard.writeText(transcript);
    setCopiedConv(true);
    setTimeout(() => setCopiedConv(false), 2000);
  };

  // Generate smart, distraction-free diagnosis and actionable suggestion
  const generateDiagnosisAndSolution = () => {
    const userQuery = activeFeedback?.userQuery || thread.messages.find(m => m.role === 'user')?.text || '';
    const asstReply = activeFeedback?.assistantResponse || activeFeedback?.assistantReply || thread.messages.find(m => m.role === 'assistant')?.text || '';
    const qLower = userQuery.toLowerCase();
    const issueType = activeFeedback?.issueType || 'unanswered';

    if (qLower.includes('سعر') || qLower.includes('بكم') || qLower.includes('أوقية') || qLower.includes('تولة') || issueType === 'price_error') {
      return {
        issueTitle: lang === 'ar' ? 'استفسار عن الأسعار والأوزان' : 'Price / Weight Inquiry',
        rootCause: lang === 'ar' 
          ? 'العميل سأل عن سعر منتج، ويحتاج المساعد إلى تقديم السعر الرسمي الدقيق المعتمد في المتجر مع تحديد وزن الأوقية أو التولة بوضوح وبدون لبس.'
          : 'Customer asked about product price/weight. The assistant needs clear pricing rules.',
        suggestedFix: lang === 'ar'
          ? 'إضافة قاعدة أسعار ثابتة في تعليمات المساعد (Prompt) وإلزامه بإرفاق رابط الطلب المباشر للمنتج.'
          : 'Add explicit price table into system prompt and enforce linking products.',
        promptRuleToCopy: `قاعدة تعليمات مقترحة لنسخها في مشروع المساعد:
"عند سؤال العميل عن الأسعار:
- عود مروكي طبيعي محسن: الأوقية (30 جرام) بسعر 120 ر.س | الثمن (125 جرام) بسعر 450 ر.س.
- دهن عود تراد المعتق: التولة الكاملة 350 ر.س | نصف تولة 185 ر.س | ربع تولة 95 ر.س.
- اذكر السعر فوراً وأرفق رابط الشراء المباشر دون تردد."`
      };
    }

    if (qLower.includes('زعفران') || qLower.includes('عطر') || qLower.includes('شنط') || issueType === 'product_error') {
      return {
        issueTitle: lang === 'ar' ? 'طلب منتج غير متوفر أو غير مدعوم' : 'Unsupported Product Request',
        rootCause: lang === 'ar'
          ? 'العميل استفسر عن صنف غير مسجل في كتالوج مدهال الطيب، مما أدى إلى حيرة المساعد أو إعطاء رد غير دقيق.'
          : 'Customer requested a product not in Medhal catalog.',
        suggestedFix: lang === 'ar'
          ? 'توجيه المساعد برفض المنتجات غير المتوفرة بلباقة، وتحويل اهتمام العميل إلى خشب العود أو أدهان العود المتوفرة.'
          : 'Guide assistant to politely clarify focus on pure oud & musk products only.',
        promptRuleToCopy: `قاعدة تعليمات مقترحة لنسخها في مشروع المساعد:
"تنبيه المنتجات غير المتوفرة:
متجر مدهال الطيب متخصص حصرياً في: (خشب العود الطبيعي المحسن، دهن العود المعتق، والمسك الخاص).
إذا سأل العميل عن عطور أو زعفران أو أصناف أخرى، أجب بلباقة: 'أهلاً بك! مدهال الطيب متخصص في أرقى خشب العود الطبيعي وأدهان العود المعتقة الفاخرة، ويمكنك الاطلاع على خيارات العود المتاحة لدينا عبر المتجر'."`
      };
    }

    // Default / general issue diagnosis
    return {
      issueTitle: lang === 'ar' ? 'مراجعة دقة الرد وفهم سياق العميل' : 'Response Accuracy & Context Review',
      rootCause: lang === 'ar'
        ? 'الرد الذي قدمه المساعد لم يحقق رضا العميل بالكامل، أو يحتاج إلى إجابة أكثر اختصاراً ومباشرة مدعومة ببطاقة المنتج.'
        : 'The assistant reply did not fully satisfy customer expectations.',
      suggestedFix: lang === 'ar'
        ? 'اختصار الرد ليكون مباشراً في نقطتين، مع تقديم خيارين للشراء فوراً من المتجر.'
        : 'Keep the response concise and directly present 2 product cards.',
      promptRuleToCopy: `قاعدة تعليمات مقترحة لنسخها في مشروع المساعد:
"قاعدة التحسين العامة:
اجعل ردك دائماً مركزاً في سطرين إلى 3 أسطر بحد أقصى، وقدم الإجابة المباشرة أولاً ثم اقترح المنتج المناسب مع بطاقته ورابطه المباشر فوراً."`
    };
  };

  const diagnosis = generateDiagnosisAndSolution();

  const handleCopyPromptRule = () => {
    navigator.clipboard.writeText(diagnosis.promptRuleToCopy);
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. ROOM TOP NAVIGATION & SESSION BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-[#2D4B3A] text-slate-700 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
            title={lang === 'ar' ? 'العودة لقائمة المحادثات' : 'Back to conversations'}
          >
            {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-xs text-[#2D4B3A] bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg">
                {thread.clientLabel || `العميل #${thread.clientIndex || 1}`}
              </span>

              <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                {thread.conversationId}
              </span>
              
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {thread.messages.length} {lang === 'ar' ? 'رسالة بالحوار' : 'messages'} ({thread.userMessageCount || thread.messages.filter(m => m.role === 'user').length} {lang === 'ar' ? 'من العميل' : 'from client'} · {thread.assistantMessageCount || thread.messages.filter(m => m.role === 'assistant').length} {lang === 'ar' ? 'من المساعد' : 'from assistant'})
              </span>

              {isNegativeCase && (
                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3 fill-rose-600" />
                  <span>{lang === 'ar' ? 'يحتوي على تقييم سلبي 👎' : 'Disliked response'}</span>
                </span>
              )}

              {thread.hasPositive && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 fill-emerald-600" />
                  <span>{lang === 'ar' ? 'تقييم إيجابي 👍' : 'Liked'}</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#C29F5D]" />
              <span>
                {thread.lastTime ? `${thread.lastTime.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')} - ${thread.lastTime.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US')}` : 'N/A'}
              </span>
              <span>· {lang === 'ar' ? 'توقيت السعودية' : 'KSA Time'}</span>
            </p>
          </div>
        </div>

        {/* Quick Room Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSolutionReport(!showSolutionReport)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              showSolutionReport 
                ? 'bg-[#2D4B3A] text-[#D4B26F] border border-[#2D4B3A]' 
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-[#D4B26F]" />
            <span>{showSolutionReport ? (lang === 'ar' ? 'إخفاء تقرير الحل' : 'Hide Report') : (lang === 'ar' ? '💡 تقرير واقتراح الحل' : '💡 Solution Report')}</span>
          </button>

          <button
            onClick={handleCopyConversation}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            {copiedConv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedConv ? (lang === 'ar' ? 'تم نسخ الحوار' : 'Copied') : (lang === 'ar' ? 'نسخ الحوار كاملاً' : 'Copy All')}</span>
          </button>
        </div>

      </div>

      {/* 2. SIMPLE, DISTRACTION-FREE PROBLEM DIAGNOSIS & ACTIONABLE SOLUTION REPORT */}
      {showSolutionReport && (
        <div className="bg-gradient-to-br from-white to-amber-50/40 p-5 sm:p-6 rounded-2xl border-2 border-amber-300/80 shadow-md space-y-4 animate-scale-up">
          
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#2D4B3A]">
                <Lightbulb className="w-5 h-5 text-[#C29F5D]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {lang === 'ar' ? 'تقرير تدقيق الحوار واقتراح حل المشكلة' : 'Conversation Audit & Suggested Resolution'}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {lang === 'ar' ? 'تشخيص ذكي مباشر بدون تعقيد برمجـي مع الحل المقترح' : 'Clear, distraction-free root cause and recommended rule'}
                </span>
              </div>
            </div>

            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${isNegativeCase ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {isNegativeCase ? (lang === 'ar' ? 'تنبيه: يتطلب تصحيحاً' : 'Attention Required') : (lang === 'ar' ? 'الحالة: ممتازة' : 'Status: Optimal')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box A: Root Cause & Context */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D4B3A]">
                <AlertCircle className="w-4 h-4 text-[#C29F5D]" />
                <span>{lang === 'ar' ? 'التشخيص: ما سبب المشكلة؟' : 'Diagnosis: Root Cause'}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {diagnosis.rootCause}
              </p>
            </div>

            {/* Box B: Suggested Solution */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'ar' ? '💡 اقتراح الحل الموصى به:' : 'Recommended Action:'}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {diagnosis.suggestedFix}
              </p>
            </div>

          </div>

          {/* Prompt Rule Box - Ready to Copy */}
          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#C29F5D]" />
                <span>{lang === 'ar' ? 'النص المقترح لإضافته لتعليمات المساعد (System Prompt):' : 'Proposed System Prompt Rule:'}</span>
              </span>
              
              <button
                onClick={handleCopyPromptRule}
                className="px-3 py-1 bg-[#2D4B3A] hover:bg-[#3E634F] text-[#D4B26F] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                {copiedRule ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4B26F]" />}
                <span>{copiedRule ? (lang === 'ar' ? 'تم نسخ القاعدة ✅' : 'Copied!') : (lang === 'ar' ? 'نسخ القاعدة المقترحة' : 'Copy Rule')}</span>
              </button>
            </div>

            <pre className="text-xs font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed select-all" dir="auto">
              {diagnosis.promptRuleToCopy}
            </pre>
          </div>

          {/* Quick Status Mark */}
          {activeFeedback && onUpdateFeedbackStatus && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-amber-200/50 text-xs">
              <span className="text-slate-500 font-semibold">
                {lang === 'ar' ? 'هل قمت بتصحيح هذا الخطأ في التعليمات؟' : 'Have you applied this fix?'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateFeedbackStatus(activeFeedback.id, activeFeedback.issueType || 'price_error', 'fixed')}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  {lang === 'ar' ? 'تعليم كـ تم التصحيح ✅' : 'Mark as Fixed ✅'}
                </button>
                <button
                  onClick={() => onUpdateFeedbackStatus(activeFeedback.id, activeFeedback.issueType || 'price_error', 'reviewing')}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  {lang === 'ar' ? 'قيد المراجعة ⏳' : 'Keep Reviewing'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. THE IMMERSIVE CHAT STREAM (EVERY SINGLE MESSAGE IN CHRONOLOGICAL ORDER) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-3xs p-4 sm:p-6 space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#C29F5D]" />
            <h3 className="text-xs font-bold text-slate-800">
              {lang === 'ar' ? `المحادثة الكاملة بالتفصيل (${thread.messages.length} رسالة بدون اقتطاع)` : `Complete Conversation Stream (${thread.messages.length} messages)`}
            </h3>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
            {lang === 'ar' ? 'مزامنة مباشرة مع Firestore' : 'Live Firestore Sync'}
          </span>
        </div>

        {/* Message Flow */}
        <div className="space-y-4">
          {thread.messages.map((m, idx) => {
            const isEvaluated = m.rating === 'negative' || m.rating === 'positive';
            const isNegativeThis = m.rating === 'negative';
            const isTarget = targetMessageId && (m.messageId === targetMessageId || m.id === targetMessageId);

            return (
              <div 
                key={m.id || idx}
                id={`room-msg-${m.messageId || m.id}`}
                className={`flex gap-3 transition-all ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                
                {/* Assistant Avatar */}
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#2D4B3A] text-[#D4B26F] flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div 
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 space-y-2.5 transition-all ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-xs shadow-md'
                      : isNegativeThis || isTarget
                        ? 'bg-amber-50/95 border-2 border-[#C29F5D] text-slate-900 rounded-tl-xs shadow-md ring-2 ring-amber-300/40'
                        : 'bg-[#F9F7F2] border border-amber-200/50 text-slate-900 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  
                  {/* Bubble Header */}
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold pb-1 border-b border-black/5">
                    <span className={m.role === 'user' ? 'text-[#D4B26F]' : 'text-[#2D4B3A]'}>
                      {m.role === 'user' ? (lang === 'ar' ? 'سؤال العميل' : 'Customer Query') : (lang === 'ar' ? 'مساعد مدهال الطيب' : 'Medhal Assistant')}
                    </span>

                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                      {m.timestamp && (
                        <span className={m.role === 'user' ? 'text-slate-300' : 'text-slate-500'}>
                          {m.timestamp.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      )}

                      {m.rating && (
                        <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${m.rating === 'positive' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {m.rating === 'positive' ? <ThumbsUp className="w-2.5 h-2.5 fill-emerald-600" /> : <ThumbsDown className="w-2.5 h-2.5 fill-rose-600" />}
                          <span>{m.rating === 'positive' ? '👍' : '👎'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Evaluated Badge Indicator */}
                  {isNegativeThis && (
                    <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5 fill-rose-600 shrink-0" />
                      <span>{lang === 'ar' ? 'هذا هو الرد الذي قيّمه العميل بسلبي 👎 (محل الفحص والمراجعة)' : 'Customer gave this response a 👎 rating'}</span>
                    </div>
                  )}

                  {/* Message Text Content */}
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap font-medium ${m.role === 'user' ? 'text-white' : 'text-slate-800'}`} dir="auto">
                    {m.text}
                  </p>

                  {/* Attached Product Cards if present */}
                  {m.products && m.products.length > 0 && (
                    <div className="pt-2 border-t border-black/5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {lang === 'ar' ? 'بطاقات المنتجات المرفقة في هذا الرد:' : 'Attached Product Cards:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {m.products.map((p, pIdx) => (
                          <div key={p.productId || pIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-800 shadow-3xs">
                            <div className="flex items-center gap-2 truncate">
                              <ShoppingBag className="w-4 h-4 text-[#C29F5D] shrink-0" />
                              <div className="truncate">
                                <div className="font-bold text-[#2D4B3A] truncate">{p.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{p.price} {p.weight ? `· ${p.weight}` : ''}</div>
                              </div>
                            </div>
                            {p.link && (
                              <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 font-bold hover:underline shrink-0">
                                {lang === 'ar' ? 'طلب ↗' : 'View ↗'}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant Message Metadata */}
                  {m.role === 'assistant' && (
                    <div className="pt-2 flex flex-wrap items-center justify-between text-[10px] text-slate-400 border-t border-black/5 font-mono">
                      <span>Model: {m.modelUsed || 'gemini-3.8-flash'}</span>
                      {m.feedbackRecord && onOpenRecordModal && (
                        <button
                          onClick={() => onOpenRecordModal(m.feedbackRecord!)}
                          className="text-[#C29F5D] hover:underline font-bold cursor-pointer font-sans"
                        >
                          {lang === 'ar' ? 'نافذة التقييم والتصنيف ↗' : 'Audit Details ↗'}
                        </button>
                      )}
                    </div>
                  )}

                </div>

                {/* User Avatar */}
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#C29F5D] text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-bold mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
