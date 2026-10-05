import React, { useState } from 'react';
import { FeedbackRecord, FirestoreMessage } from '../types/dashboard';
import { getRecordTimestamp, calculateRealisticTokens } from '../utils/analytics';
import { 
  Cpu, 
  Clock, 
  Calendar, 
  Zap, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  BarChart2, 
  MessageSquare, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  Calculator,
  Info,
  Search,
  User,
  ArrowUpDown,
  Users
} from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  messages?: FirestoreMessage[];
  onViewConversation?: (conversationId: string, messageId?: string) => void;
  lang: 'ar' | 'en';
}

export const UsageAnalytics: React.FC<Props> = ({ 
  records, 
  messages = [], 
  onViewConversation, 
  lang 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'breakdown' | 'overview' | 'calculator'>('breakdown');
  const [simulatedInquiries, setSimulatedInquiries] = useState<number>(500);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'tokens' | 'cost' | 'messages' | 'recent'>('tokens');

  // 1. Comprehensive Realistic Token & Cost Calculation
  const tokenMetrics = calculateRealisticTokens(records, messages);

  // 2. Session / Conversation stats across feedbacks and raw messages
  const allConvIds = new Set([
    ...records.map(r => r.conversationId).filter(Boolean),
    ...messages.map(m => m.conversationId).filter(Boolean)
  ]);
  const totalConversations = allConvIds.size;
  const totalMessagesCount = messages.length > 0 ? messages.length : records.length * 2;
  const avgMessagesPerConv = totalConversations > 0 ? (totalMessagesCount / totalConversations).toFixed(1) : '0';

  // 3. Active Hours & Active Days
  const hoursMap: Record<number, number> = {};
  const daysMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const allTimestampItems = [
    ...records.map(r => getRecordTimestamp(r)),
    ...messages.map(m => getRecordTimestamp(m))
  ].filter(Boolean) as Date[];

  allTimestampItems.forEach(t => {
    hoursMap[t.getHours()] = (hoursMap[t.getHours()] || 0) + 1;
    daysMap[t.getDay()] = (daysMap[t.getDay()] || 0) + 1;
  });

  let mostActiveHour = -1;
  let maxHourCount = 0;
  Object.entries(hoursMap).forEach(([h, count]) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      mostActiveHour = parseInt(h);
    }
  });

  let mostActiveDay = -1;
  let maxDayCount = 0;
  Object.entries(daysMap).forEach(([d, count]) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      mostActiveDay = parseInt(d);
    }
  });

  // 4. Model Analytics (modelUsed)
  const modelStats: Record<string, { count: number; name: string }> = {};
  const allModelSources = [
    ...records.map(r => r.modelUsed),
    ...messages.map(m => m.modelUsed)
  ].filter(Boolean);

  allModelSources.forEach(m => {
    const model = (m || '').trim() || (lang === 'ar' ? 'غير محدد' : 'Unspecified');
    if (!modelStats[model]) {
      modelStats[model] = { count: 0, name: model };
    }
    modelStats[model].count++;
  });

  const modelList = Object.values(modelStats).sort((a, b) => b.count - a.count);
  const totalModelUsages = modelList.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // Simulator calculations
  const simAvgInputPerInquiry = tokenMetrics.avgTokensPerInteraction > 0 ? Math.round(tokenMetrics.totalInputTokens / Math.max(1, tokenMetrics.conversationsBreakdown.length)) : 1450;
  const simAvgOutputPerInquiry = tokenMetrics.avgTokensPerInteraction > 0 ? Math.round(tokenMetrics.totalOutputTokens / Math.max(1, tokenMetrics.conversationsBreakdown.length)) : 320;
  const simTotalTokens = simulatedInquiries * (simAvgInputPerInquiry + simAvgOutputPerInquiry);
  const simCostUSD = (simulatedInquiries * simAvgInputPerInquiry * 0.000000075) + (simulatedInquiries * simAvgOutputPerInquiry * 0.00000030);
  const simCostSAR = simCostUSD * 3.75;

  // Filter & Sort Conversations Breakdown Table by Customer
  const filteredBreakdown = tokenMetrics.conversationsBreakdown.filter(c => {
    if (!searchTableQuery.trim()) return true;
    const q = searchTableQuery.toLowerCase();
    const label = (c.clientLabel || `العميل #${c.clientIndex}`).toLowerCase();
    return label.includes(q) || c.conversationId.toLowerCase().includes(q) || (c.firstQuery || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortField === 'tokens') return b.totalTokens - a.totalTokens;
    if (sortField === 'cost') return b.costSAR - a.costSAR;
    if (sortField === 'messages') return b.messageCount - a.messageCount;
    if (sortField === 'recent') return (b.lastTime?.getTime() || 0) - (a.lastTime?.getTime() || 0);
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('breakdown')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'breakdown' 
                ? 'bg-[#2D4B3A] text-white shadow-xs' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#D4B26F]" />
            <span>{lang === 'ar' ? 'جدول استهلاك الرموز حسب كل عميل' : 'Client Token Breakdown'}</span>
            <span className="bg-slate-900/30 px-1.5 py-0.5 rounded-full text-[10px]">({tokenMetrics.conversationsBreakdown.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'overview' 
                ? 'bg-[#2D4B3A] text-white shadow-xs' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#D4B26F]" />
            <span>{lang === 'ar' ? 'ملخص الاستهلاك العام' : 'Overview & Models'}</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('calculator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'calculator' 
                ? 'bg-[#2D4B3A] text-white shadow-xs' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'ar' ? 'حاسبة التكلفة والتقدير' : 'Cost Simulator'}</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-xl">
          <Info className="w-3.5 h-3.5 text-[#C29F5D]" />
          <span>{lang === 'ar' ? 'تسعيرة Gemini الرسمية: 0.075$ مدخل · 0.30$ مخرج' : 'Gemini Official Pricing Applied'}</span>
        </div>
      </div>

      {/* VIEW 1: PER-CLIENT TOKEN BREAKDOWN TABLE (ORGANIZED, NOT RANDOM) */}
      {activeSubTab === 'breakdown' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/70 shadow-3xs space-y-5">
          
          {/* Header & Quick Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2D4B3A]" />
                <span>{lang === 'ar' ? 'جدول استهلاك الرموز والتكلفة منظماً حسب كل عميل' : 'Customer Token & Cost Breakdown'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ar' 
                  ? 'تم ترتيب استهلاك الرموز بوضوح لكل عميل وجلسة دون أي عشوائية مع إمكانية فتح المحادثة مباشرة' 
                  : 'Structured per customer session with exact tokens, cost in SAR/USD, and direct thread link.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-[#2D4B3A] bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl">
                {tokenMetrics.conversationsBreakdown.length} {lang === 'ar' ? 'عميل محلل' : 'clients'}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                {tokenMetrics.grandTotalTokens.toLocaleString()} {lang === 'ar' ? 'رمز إجمالي' : 'tokens'}
              </span>
            </div>
          </div>

          {/* Quick 4 Stat Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'إجمالي الرموز' : 'Total Tokens'}</span>
              <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{tokenMetrics.grandTotalTokens.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-semibold">{tokenMetrics.totalInputTokens.toLocaleString()} مدخلات + {tokenMetrics.totalOutputTokens.toLocaleString()} مخرجات</span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
              <span className="text-[10px] text-emerald-800 font-bold block uppercase">{lang === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
              <span className="text-lg font-black font-mono text-emerald-700 mt-0.5 block">
                {tokenMetrics.totalCostSAR < 0.01 ? '< 0.01' : tokenMetrics.totalCostSAR.toFixed(3)} {lang === 'ar' ? 'ر.س' : 'SAR'}
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold">(${tokenMetrics.totalCostUSD.toFixed(4)})</span>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <span className="text-[10px] text-amber-900 font-bold block uppercase">{lang === 'ar' ? 'متوسط الرموز / عميل' : 'Avg / Client'}</span>
              <span className="text-lg font-black font-mono text-amber-900 mt-0.5 block">
                {tokenMetrics.conversationsBreakdown.length > 0 ? Math.round(tokenMetrics.grandTotalTokens / tokenMetrics.conversationsBreakdown.length).toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-amber-800 font-semibold">{lang === 'ar' ? 'رمز لكل جلسة عميل' : 'tokens per session'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'متوسط تكلفة العميل' : 'Avg Cost / Client'}</span>
              <span className="text-lg font-black font-mono text-slate-800 mt-0.5 block">
                {tokenMetrics.conversationsBreakdown.length > 0 ? (tokenMetrics.totalCostSAR / tokenMetrics.conversationsBreakdown.length).toFixed(3) : '0.000'} {lang === 'ar' ? 'ر.س' : 'SAR'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">{lang === 'ar' ? 'تكلفة تشغيلية منخفضة' : 'cost effective'}</span>
            </div>
          </div>

          {/* Table Controls: Search & Sort Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            
            {/* Sort Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#C29F5D]" />
                <span>{lang === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}</span>
              </span>
              <button
                onClick={() => setSortField('tokens')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortField === 'tokens' ? 'bg-[#2D4B3A] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'الأعلى استهلاكاً' : 'Most Tokens'}
              </button>
              <button
                onClick={() => setSortField('cost')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortField === 'cost' ? 'bg-[#2D4B3A] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'الأعلى تكلفة' : 'Highest Cost'}
              </button>
              <button
                onClick={() => setSortField('messages')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortField === 'messages' ? 'bg-[#2D4B3A] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'الأكثر رسائل' : 'Most Msgs'}
              </button>
              <button
                onClick={() => setSortField('recent')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortField === 'recent' ? 'bg-[#2D4B3A] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'الأحدث تاريخاً' : 'Recent'}
              </button>
            </div>

            {/* Search Client */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 rtl:right-3 ltr:left-3" />
              <input 
                type="text" 
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث باسم العميل أو المعرف...' : 'Search client name or ID...'}
                className="px-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#C29F5D] w-full sm:w-64"
              />
            </div>

          </div>

          {/* Table Container */}
          {filteredBreakdown.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              {lang === 'ar' ? 'لا توجد بيانات مطابقة لخيارات البحث المحددة.' : 'No client usage records found.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5 text-start">{lang === 'ar' ? 'العميل وجلسة المحادثة' : 'Customer & Session'}</th>
                    <th className="p-3 text-start">{lang === 'ar' ? 'موضوع / أول سؤال للعميل' : 'Customer Inquiry'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'الرسائل' : 'Msgs'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'رموز المدخلات' : 'Prompt Tokens'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'رموز المخرجات' : 'Completion Tokens'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'إجمالي الرموز' : 'Total Tokens'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'التكلفة بالريال (ر.س)' : 'Cost (SAR)'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'التوقيت' : 'Time'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'المحادثة' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {filteredBreakdown.map((conv) => {
                    const clientName = conv.clientLabel || `العميل #${conv.clientIndex || 1}`;

                    return (
                      <tr key={conv.conversationId} className="hover:bg-amber-50/30 transition-colors">
                        
                        {/* Customer Identification */}
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-xs text-[#2D4B3A] bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                              <User className="w-3 h-3 text-[#C29F5D]" />
                              <span>{clientName}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[130px]">
                              {conv.conversationId}
                            </span>
                          </div>
                        </td>

                        {/* Customer First Question Preview */}
                        <td className="p-3 max-w-xs">
                          {conv.firstQuery ? (
                            <p className="text-xs text-slate-700 line-clamp-1 font-semibold" dir="auto" title={conv.firstQuery}>
                              "{conv.firstQuery}"
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">{lang === 'ar' ? 'جلسة عامة' : 'General'}</span>
                          )}
                        </td>

                        {/* Message Count */}
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {conv.messageCount}
                        </td>

                        {/* Input Tokens */}
                        <td className="p-3 text-center font-mono text-slate-600">
                          {conv.inputTokens.toLocaleString()}
                        </td>

                        {/* Output Tokens */}
                        <td className="p-3 text-center font-mono font-bold text-[#C29F5D]">
                          {conv.outputTokens.toLocaleString()}
                        </td>

                        {/* Total Tokens */}
                        <td className="p-3 text-center font-mono font-black text-[#2D4B3A]">
                          {conv.totalTokens.toLocaleString()}
                        </td>

                        {/* Cost in SAR & USD */}
                        <td className="p-3 text-center font-mono text-emerald-800">
                          <strong className="block font-bold">
                            {conv.costSAR < 0.001 ? '< 0.001 ر.س' : `${conv.costSAR.toFixed(3)} ر.س`}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (${conv.costUSD < 0.0001 ? '< 0.0001' : conv.costUSD.toFixed(4)})
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="p-3 text-center font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          {conv.lastTime ? conv.lastTime.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US') : 'N/A'}
                        </td>

                        {/* Action Button */}
                        <td className="p-3.5 text-end">
                          <button
                            onClick={() => onViewConversation?.(conv.conversationId)}
                            className="px-3 py-1.5 text-[11px] font-black text-[#2D4B3A] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title={lang === 'ar' ? 'فتح كامل محادثة هذا العميل' : 'Open thread'}
                          >
                            <MessageSquare className="w-3 h-3 text-[#C29F5D]" />
                            <span>{lang === 'ar' ? 'فتح المحادثة ↗' : 'View Thread ↗'}</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: OVERVIEW & MODEL METRICS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* PRIMARY REALISTIC TOKEN METRICS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Zap className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {lang === 'ar' ? 'الاستهلاك الواقعي الإجمالي للرموز (Total Tokens Used)' : 'Total Tokens Consumption'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' 
                      ? 'تم احتساب كافة الرسائل مع سياق كتالوج مدهال والتعليمات وفق معيار الرموز للغة العربية ونماذج Gemini'
                      : 'Comprehensive token computation covering prompt instructions, product catalog context, and generation.'}
                  </p>
                </div>
              </div>

              {/* Pricing Tag */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                Gemini 2.5 / Flash Pricing
              </div>
            </div>

            {/* 4-Stat Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Grand Total */}
              <div className="p-4 bg-gradient-to-br from-amber-50/60 to-amber-100/30 rounded-2xl border border-amber-200/70">
                <span className="text-[10px] text-amber-800 font-bold block uppercase">{lang === 'ar' ? 'إجمالي الرموز المستهلكة' : 'Grand Total Tokens'}</span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
                  {tokenMetrics.grandTotalTokens.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
                  {tokenMetrics.totalInputTokens.toLocaleString()} {lang === 'ar' ? 'مدخلات' : 'input'} + {tokenMetrics.totalOutputTokens.toLocaleString()} {lang === 'ar' ? 'مخرجات' : 'output'}
                </span>
              </div>

              {/* Input Tokens */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'رموز المدخلات (Prompt Tokens)' : 'Prompt / Input Tokens'}</span>
                <span className="text-xl font-black font-mono text-[#2D4B3A] mt-1 block">
                  {tokenMetrics.totalInputTokens.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
                  {lang === 'ar' ? 'التعليمات + كتالوج المنتجات + الأسئلة' : 'System context + queries'}
                </span>
              </div>

              {/* Output Tokens */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'رموز المخرجات (Completion)' : 'Completion / Output Tokens'}</span>
                <span className="text-xl font-black font-mono text-[#C29F5D] mt-1 block">
                  {tokenMetrics.totalOutputTokens.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
                  {lang === 'ar' ? 'إجابات المساعد وبطاقات المنتجات' : 'Assistant replies + cards'}
                </span>
              </div>

              {/* Realistic Cost */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">{lang === 'ar' ? 'التكلفة الإجمالية التقديرية' : 'Estimated Total Cost'}</span>
                <span className="text-xl font-black font-mono text-emerald-700 mt-1 block">
                  {tokenMetrics.totalCostUSD < 0.001 ? '< $0.001' : `$${tokenMetrics.totalCostUSD.toFixed(4)}`}
                </span>
                <span className="text-[11px] text-emerald-800 font-bold font-mono mt-1 block">
                  ≈ {tokenMetrics.totalCostSAR < 0.01 ? '< 0.01' : tokenMetrics.totalCostSAR.toFixed(3)} {lang === 'ar' ? 'ريال سعودي' : 'SAR'}
                </span>
              </div>

            </div>

            {/* Transparency Note Box */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-amber-200/50 flex items-start gap-3 text-xs leading-relaxed">
              <Info className="w-4 h-4 text-[#C29F5D] shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-600">
                <strong className="text-slate-800 block">
                  {lang === 'ar' ? 'معادلة الحساب الواقعي الشفاف:' : 'Realistic Tokenization Formula:'}
                </strong>
                <p>
                  {lang === 'ar' 
                    ? 'في كل استدعاء لمساعد مدهال الطيب، يرسل النظام سياق كتالوج المنتجات (عود مروكي، تراد، كليمنتان، مسك، الأسعار والأوزان) وهو ما يعادل ~1,400 رمز مدخل لكل سؤال، بالإضافة لنص السؤال (1 رمز لكل 2.8 حرف عربي تقريباً). إجابة المساعد وبطاقات المنتجات تُحسب بمعدل 1 رمز لكل 2.6 حرف عربي + 90 رمز لكل كارت منتج.'
                    : 'Every assistant call injects the store product catalog context (~1,400 input tokens) plus customer query. Model replies are tokenized at ~1 token per 2.6 Arabic chars + 90 tokens per product card.'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {lang === 'ar' ? 'تسعيرة Gemini Flash: 0.075$ لكل مليون رمز مدخل · 0.30$ لكل مليون رمز مخرج · 1 دولار = 3.75 ريال' : 'Pricing: $0.075/1M input, $0.30/1M output, 1 USD = 3.75 SAR'}
                </p>
              </div>
            </div>
          </div>

          {/* Model Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cpu className="w-4 h-4 text-[#2D4B3A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">{lang === 'ar' ? 'النماذج الذكية المستخدمة' : 'AI Models Deployed'}</h3>
                <p className="text-[11px] text-slate-400">
                  {lang === 'ar' ? 'توزيع النماذج المستخدمة في توليد ردود مدهال الطيب' : 'Distribution of AI models used in responses'}
                </p>
              </div>
            </div>

            {modelList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">{lang === 'ar' ? 'لا توجد بيانات نماذج مسجلة حتى الآن.' : 'No model data available'}</p>
            ) : (
              <div className="space-y-3">
                {modelList.map((m) => {
                  const pct = Math.round((m.count / totalModelUsages) * 100);
                  return (
                    <div key={m.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="font-mono text-slate-800">{m.name}</span>
                        <span className="text-[#C29F5D]">{m.count} {lang === 'ar' ? 'تفاعل' : 'interactions'} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#2D4B3A] h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 3: INTERACTIVE COST SIMULATOR */}
      {activeSubTab === 'calculator' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#C29F5D]" />
              <span>{lang === 'ar' ? 'حاسبة التكلفة التقديرية لمساعد مدهال الطيب' : 'Assistant Cost Simulator'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'جرّب محاكاة أعداد المحادثات الشهرية لمعرفة استهلاك الرموز والتكلفة بالريال والدولار' : 'Simulate monthly inquiry volume to estimate token costs'}
            </p>
          </div>

          <div className="max-w-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                {lang === 'ar' ? `عدد الاستفسارات / الردود المتوقعة: ${simulatedInquiries.toLocaleString()}` : `Expected Inquiries: ${simulatedInquiries.toLocaleString()}`}
              </label>
              <input 
                type="range" 
                min="50" 
                max="20000" 
                step="50"
                value={simulatedInquiries}
                onChange={(e) => setSimulatedInquiries(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2D4B3A]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>50 {lang === 'ar' ? 'استفسار' : 'queries'}</span>
                <span>5,000</span>
                <span>10,000</span>
                <span>20,000 {lang === 'ar' ? 'استفسار' : 'queries'}</span>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'إجمالي الرموز المتوقعة' : 'Simulated Tokens'}</span>
                <span className="text-lg font-black font-mono text-slate-800 mt-1 block">
                  {simTotalTokens.toLocaleString()}
                </span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">{lang === 'ar' ? 'التكلفة بالريال السعودي' : 'Estimated SAR'}</span>
                <span className="text-lg font-black font-mono text-emerald-700 mt-1 block">
                  {simCostSAR < 0.01 ? '< 0.01' : simCostSAR.toFixed(2)} ر.س
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'التكلفة بالدولار' : 'Estimated USD'}</span>
                <span className="text-lg font-black font-mono text-slate-800 mt-1 block">
                  ${simCostUSD.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
