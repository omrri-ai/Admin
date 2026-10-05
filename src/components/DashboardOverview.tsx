import React, { useState } from 'react';
import { FeedbackRecord, FirestoreMessage } from '../types/dashboard';
import { isPositive, isNegative, getRecordTimestamp, calculateRealisticTokens } from '../utils/analytics';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Zap, 
  Calendar, 
  Percent, 
  TrendingUp,
  BarChart3,
  Users,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  messages?: FirestoreMessage[];
  onOpenRecord: (r: FeedbackRecord) => void;
  onNavigateTab?: (tabId: string, filterRating?: string) => void;
  lang: 'ar' | 'en';
}

export const DashboardOverview: React.FC<Props> = ({ 
  records, 
  messages = [], 
  onOpenRecord, 
  onNavigateTab, 
  lang 
}) => {
  const [chartTimeframe, setChartTimeframe] = useState<'today' | '7days' | '30days'>('7days');

  // Compute realistic tokens
  const tokenMetrics = calculateRealisticTokens(records, messages);

  // Distinct conversations count across both feedbacks and messages
  const allConvIds = new Set([
    ...records.map(r => r.conversationId).filter(Boolean),
    ...messages.map(m => m.conversationId).filter(Boolean)
  ]);
  const totalConversations = allConvIds.size;
  
  // Real user and assistant messages count
  const rawUserMsgs = messages.filter(m => m.role === 'user').length;
  const rawAssistantMsgs = messages.filter(m => m.role === 'assistant').length;
  const userMessagesCount = rawUserMsgs > 0 ? rawUserMsgs : records.length;
  const assistantMessagesCount = rawAssistantMsgs > 0 ? rawAssistantMsgs : records.length;

  const totalRatings = records.length;
  const likesCount = records.filter(r => isPositive(r.rating)).length;
  const dislikesCount = records.filter(r => isNegative(r.rating)).length;
  const positiveRate = totalRatings > 0 ? Math.round((likesCount / totalRatings) * 100) : 0;

  // Conversations in timeframes
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const allTimestampedItems = [
    ...records.map(r => ({ cid: r.conversationId, time: getRecordTimestamp(r)?.getTime() })),
    ...messages.map(m => ({ cid: m.conversationId, time: getRecordTimestamp(m)?.getTime() }))
  ];

  const convsToday = new Set(
    allTimestampedItems.filter(item => item.time && item.time >= todayStart).map(item => item.cid)
  ).size;

  const convs7Days = new Set(
    allTimestampedItems.filter(item => item.time && item.time >= sevenDaysAgo).map(item => item.cid)
  ).size;

  const convs30Days = new Set(
    allTimestampedItems.filter(item => item.time && item.time >= thirtyDaysAgo).map(item => item.cid)
  ).size;

  const totalMessagesOverall = userMessagesCount + assistantMessagesCount;
  const avgMessagesPerConv = totalConversations > 0 
    ? ( totalMessagesOverall / totalConversations ).toFixed(1)
    : '0';

  // Latency metrics
  const recordsWithLatency = records.filter(r => typeof r.diagnostics?.latency === 'number');
  const avgLatency = recordsWithLatency.length > 0 
    ? Math.round(recordsWithLatency.reduce((acc, curr) => acc + (curr.diagnostics!.latency || 0), 0) / recordsWithLatency.length)
    : null;

  // Time chart generation
  const buildChartData = () => {
    if (chartTimeframe === 'today') {
      const hoursMap: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hoursMap[i] = 0;
      records.forEach(r => {
        const d = getRecordTimestamp(r);
        if (d && d.getTime() >= todayStart) {
          hoursMap[d.getHours()] = (hoursMap[d.getHours()] || 0) + 1;
        }
      });
      return Object.entries(hoursMap).map(([h, count]) => ({
        label: `${h}:00`,
        count
      }));
    } else {
      const numDays = chartTimeframe === '7days' ? 7 : 30;
      const daysMap: Record<string, number> = {};
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'numeric', day: 'numeric' });
        daysMap[key] = 0;
      }
      records.forEach(r => {
        const d = getRecordTimestamp(r);
        if (d && d.getTime() >= (chartTimeframe === '7days' ? sevenDaysAgo : thirtyDaysAgo)) {
          const key = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'numeric', day: 'numeric' });
          if (daysMap[key] !== undefined) {
            daysMap[key]++;
          }
        }
      });
      return Object.entries(daysMap).map(([label, count]) => ({ label, count }));
    }
  };

  const chartData = buildChartData();
  const maxChartCount = Math.max(...chartData.map(c => c.count), 1);
  const totalChartActivity = chartData.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. PRIMARY STATS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#C29F5D]" />
            <span>{lang === 'ar' ? 'المؤشرات الإحصائية الرئيسية (انقر على أي خيار للانتقال للقسم المخصص)' : 'Core Live Metrics (Click to Navigate)'}</span>
          </h3>
          <span className="text-[10px] text-[#C29F5D] font-bold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
            {lang === 'ar' ? 'تفاعلية بالكامل ⚡' : 'Fully Interactive ⚡'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          
          {/* Card: Total Conversations */}
          <div 
            onClick={() => onNavigateTab?.('conversations')}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-[#C29F5D] hover:shadow-md hover:scale-[1.01] transition-all group relative overflow-hidden"
            title={lang === 'ar' ? 'انقر للانتقال إلى قسم المحادثات' : 'Click to view Conversations'}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="group-hover:text-[#2D4B3A] transition-colors">{lang === 'ar' ? 'إجمالي المحادثات' : 'Total Conversations'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#C29F5D] transition-opacity" />
                <MessageSquare className="w-4 h-4 text-[#2D4B3A]" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-slate-900 group-hover:text-[#2D4B3A] transition-colors">{totalConversations}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>{lang === 'ar' ? 'جلسات محادثة مسجلة' : 'Recorded sessions'}</span>
              <span className="text-[#C29F5D] font-bold group-hover:underline">{lang === 'ar' ? 'فتح المحادثات ↗' : 'View ↗'}</span>
            </div>
          </div>

          {/* Card: Client Messages */}
          <div 
            onClick={() => onNavigateTab?.('messages')}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-[#C29F5D] hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر للانتقال لسجل الرسائل' : 'Click to view Messages Stream'}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="group-hover:text-[#C29F5D] transition-colors">{lang === 'ar' ? 'رسائل العملاء' : 'User Inquiries'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#C29F5D] transition-opacity" />
                <Users className="w-4 h-4 text-[#C29F5D]" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-slate-900">{userMessagesCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>{lang === 'ar' ? 'سؤال استلمه المساعد' : 'Queries received'}</span>
              <span className="text-[#C29F5D] font-bold group-hover:underline">{lang === 'ar' ? 'عرض السجل ↗' : 'View ↗'}</span>
            </div>
          </div>

          {/* Card: Assistant Replies */}
          <div 
            onClick={() => onNavigateTab?.('messages')}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-emerald-400 hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر للانتقال لسجل ردود المساعد' : 'Click to view Assistant Messages'}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="group-hover:text-emerald-700 transition-colors">{lang === 'ar' ? 'ردود المساعد' : 'Assistant Replies'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-slate-900">{assistantMessagesCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>{lang === 'ar' ? 'رد تم توليده' : 'Replies generated'}</span>
              <span className="text-emerald-600 font-bold group-hover:underline">{lang === 'ar' ? 'عرض السجل ↗' : 'View ↗'}</span>
            </div>
          </div>

          {/* Card: Positive Feedback Rate */}
          <div 
            onClick={() => onNavigateTab?.('feedback', 'positive')}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-[#C29F5D] hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر للانتقال للتقييمات الإيجابية' : 'Click to view Positive Feedbacks'}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="group-hover:text-[#C29F5D] transition-colors">{lang === 'ar' ? 'نسبة التقييم الإيجابي' : 'Positive Ratio'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#C29F5D] transition-opacity" />
                <Percent className="w-4 h-4 text-[#C29F5D]" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-[#C29F5D]">{totalRatings > 0 ? `${positiveRate}%` : (lang === 'ar' ? 'غير متاح' : 'N/A')}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>{lang === 'ar' ? `${likesCount} إعجاب من ${totalRatings}` : `${likesCount} of ${totalRatings}`}</span>
              <span className="text-[#C29F5D] font-bold group-hover:underline">{lang === 'ar' ? 'استعراض ↗' : 'View ↗'}</span>
            </div>
          </div>

          {/* Card: Thumbs Up */}
          <div 
            onClick={() => onNavigateTab?.('feedback', 'positive')}
            className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-emerald-500 hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر لعرض كل التقييمات الإيجابية' : 'Click to view all Likes'}
          >
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
              <span>{lang === 'ar' ? '👍 التقييمات الإيجابية' : 'Likes'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
                <ThumbsUp className="w-4 h-4 fill-emerald-600" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-emerald-700">{likesCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-emerald-600/80 font-semibold">
              <span>{lang === 'ar' ? 'ردود نالت رضا العميل' : 'Helpful answers'}</span>
              <span className="text-emerald-700 font-bold group-hover:underline">{lang === 'ar' ? 'فتح التقييمات ↗' : 'View ↗'}</span>
            </div>
          </div>

          {/* Card: Thumbs Down */}
          <div 
            onClick={() => onNavigateTab?.('feedback', 'negative')}
            className="bg-white p-4 rounded-2xl border border-rose-100 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-rose-500 hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر لعرض كل التقييمات السلبية والمشاكل' : 'Click to view all Dislikes and Issues'}
          >
            <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
              <span>{lang === 'ar' ? '👎 التقييمات السلبية' : 'Dislikes'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-rose-600 transition-opacity" />
                <ThumbsDown className="w-4 h-4 fill-rose-600" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-rose-700">{dislikesCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-rose-600/80 font-semibold">
              <span>{lang === 'ar' ? 'تحتاج فحص وتدقيق' : 'Needs review'}</span>
              <span className="text-rose-700 font-bold group-hover:underline">{lang === 'ar' ? 'فحص السجلات ↗' : 'Audit ↗'}</span>
            </div>
          </div>

          {/* Card: Average Latency */}
          <div 
            onClick={() => onNavigateTab?.('performance')}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-indigo-400 hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر للانتقال لتحليلات الأداء وسرعة الاستجابة' : 'Click to view Performance Analytics'}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="group-hover:text-indigo-600 transition-colors">{lang === 'ar' ? 'متوسط زمن الاستجابة' : 'Avg Latency'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-slate-900 group-hover:text-indigo-600 transition-colors">
                {avgLatency !== null ? `${avgLatency} ms` : (lang === 'ar' ? 'غير متاح' : 'N/A')}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>
                {avgLatency !== null ? (lang === 'ar' ? 'سرعة السيرفر الفعلية' : 'Real server latency') : (lang === 'ar' ? 'غير مسجل' : 'Not recorded')}
              </span>
              <span className="text-indigo-600 font-bold group-hover:underline">{lang === 'ar' ? 'تحليل الأداء ↗' : 'Details ↗'}</span>
            </div>
          </div>

          {/* Card: Token Consumption */}
          <div 
            onClick={() => onNavigateTab?.('usage')}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between cursor-pointer hover:border-amber-500 hover:shadow-md hover:scale-[1.01] transition-all group"
            title={lang === 'ar' ? 'انقر للانتقال لقسم تحليل واستخدام التوكن الواقعي' : 'Click to view Realistic Token Analysis'}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="group-hover:text-amber-700 transition-colors">{lang === 'ar' ? 'إجمالي الرموز (Tokens)' : 'Total Tokens'}</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-amber-600 transition-opacity" />
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono text-slate-900 group-hover:text-amber-800 transition-colors">
                {tokenMetrics.grandTotalTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>
                {`≈ ${tokenMetrics.totalCostUSD < 0.01 ? '< $0.01' : `$${tokenMetrics.totalCostUSD.toFixed(3)}`} (${tokenMetrics.totalCostSAR < 0.01 ? '< 0.04' : tokenMetrics.totalCostSAR.toFixed(2)} ر.س)`}
              </span>
              <span className="text-amber-600 font-bold group-hover:underline">{lang === 'ar' ? 'تحليل التوكن ↗' : 'Usage ↗'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. TIMEFRAME COMPARISON CARDS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#C29F5D]" />
            <span>{lang === 'ar' ? 'توزيع المحادثات حسب الفترات الزمنية (انقر للانتقال للمحادثات)' : 'Conversations Over Time Ranges'}</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">{lang === 'ar' ? 'تحديث لحظي من Firestore' : 'Live from Firestore'}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div 
            onClick={() => onNavigateTab?.('conversations')}
            className="p-3 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 rounded-xl border border-slate-100 transition-all cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#2D4B3A] block">{lang === 'ar' ? 'اليوم' : 'Today'}</span>
            <span className="text-xl font-black font-mono text-slate-800 group-hover:text-[#2D4B3A]">{convsToday}</span>
            <span className="text-[9px] text-[#C29F5D] block mt-0.5 font-bold group-hover:underline">{lang === 'ar' ? 'عرض المحادثات ↗' : 'View ↗'}</span>
          </div>
          <div 
            onClick={() => onNavigateTab?.('conversations')}
            className="p-3 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 rounded-xl border border-slate-100 transition-all cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#2D4B3A] block">{lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</span>
            <span className="text-xl font-black font-mono text-slate-800 group-hover:text-[#2D4B3A]">{convs7Days}</span>
            <span className="text-[9px] text-[#C29F5D] block mt-0.5 font-bold group-hover:underline">{lang === 'ar' ? 'عرض المحادثات ↗' : 'View ↗'}</span>
          </div>
          <div 
            onClick={() => onNavigateTab?.('conversations')}
            className="p-3 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 rounded-xl border border-slate-100 transition-all cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#2D4B3A] block">{lang === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days'}</span>
            <span className="text-xl font-black font-mono text-slate-800 group-hover:text-[#2D4B3A]">{convs30Days}</span>
            <span className="text-[9px] text-[#C29F5D] block mt-0.5 font-bold group-hover:underline">{lang === 'ar' ? 'عرض المحادثات ↗' : 'View ↗'}</span>
          </div>
          <div 
            onClick={() => onNavigateTab?.('conversations')}
            className="p-3 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 rounded-xl border border-slate-100 transition-all cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#C29F5D] block">{lang === 'ar' ? 'متوسط الرسائل/محادثة' : 'Avg Msg/Conv'}</span>
            <span className="text-xl font-black font-mono text-[#C29F5D]">{avgMessagesPerConv}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">{lang === 'ar' ? `${totalMessagesOverall} إجمالي الرسائل` : 'Total messages'}</span>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE ACTIVITY TIMELINE CHART */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{lang === 'ar' ? 'نشاط استخدام المساعد مع الوقت' : 'Assistant Activity Over Time'}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'رسم بياني مستند إلى التوقيت الفعلي لرسائل وتقييمات العملاء' : 'Live chart derived from actual timestamps in Firestore'}
            </p>
          </div>

          {/* Timeframe Toggle Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setChartTimeframe('today')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${chartTimeframe === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {lang === 'ar' ? 'اليوم' : 'Today'}
            </button>
            <button
              onClick={() => setChartTimeframe('7days')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${chartTimeframe === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {lang === 'ar' ? 'آخر 7 أيام' : '7 Days'}
            </button>
            <button
              onClick={() => setChartTimeframe('30days')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${chartTimeframe === '30days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {lang === 'ar' ? 'آخر 30 يوم' : '30 Days'}
            </button>
          </div>
        </div>

        {totalChartActivity === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {lang === 'ar' ? 'لا توجد بيانات مسجلة كافية لهذه الفترة الزمنية.' : 'No recorded activity for this time range.'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 overflow-x-auto">
              {chartData.map((item, idx) => {
                const heightPercent = Math.max(6, Math.round((item.count / maxChartCount) * 100));
                return (
                  <div key={idx} className="flex-1 min-w-[24px] flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10">
                      {item.count} {lang === 'ar' ? 'تفاعل' : 'events'} ({item.label})
                    </div>
                    {/* Bar */}
                    <div 
                      className={`w-full rounded-t-md transition-all ${item.count > 0 ? 'bg-[#2D4B3A] group-hover:bg-[#C29F5D]' : 'bg-slate-100'}`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                    {/* Label */}
                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-full">{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-50 font-medium">
              <span>{lang === 'ar' ? `إجمالي النشاط في الفترة: ${totalChartActivity}` : `Total activity: ${totalChartActivity}`}</span>
              <button 
                onClick={() => onNavigateTab?.('conversations')}
                className="text-[#C29F5D] hover:underline font-bold cursor-pointer"
              >
                {lang === 'ar' ? 'استعراض سجل المحادثات الكاملة ↗' : 'View all conversations ↗'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

