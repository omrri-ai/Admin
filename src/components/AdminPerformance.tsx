import React from 'react';
import { FeedbackRecord } from '../types/dashboard';
import { Activity, Clock, Zap, CheckCircle2 } from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  lang: 'ar' | 'en';
}

export const AdminPerformance: React.FC<Props> = ({ records, lang }) => {
  const recordsWithLatency = records.filter(r => typeof r.diagnostics?.latency === 'number');
  const latencies = recordsWithLatency.map(r => r.diagnostics!.latency || 0);

  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : null;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : null;

  const fastCount = latencies.filter(l => l < 1000).length;
  const mediumCount = latencies.filter(l => l >= 1000 && l < 3000).length;
  const slowCount = latencies.filter(l => l >= 3000).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/50 flex items-center justify-center text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{lang === 'ar' ? 'تحليلات الأداء وسرعة الاستجابة' : 'Performance & Latency Analysis'}</h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'مراقبة أوقات استجابة نموذج Gemini واستقرار خوادم السيرفر' : 'Monitoring server and model response times.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'متوسط زمن الاستجابة' : 'Average Latency'}</span>
            <span className="text-2xl font-black font-mono text-slate-900">
              {avgLatency !== null ? `${avgLatency} ms` : (lang === 'ar' ? 'غير متاح' : 'N/A')}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'أسرع استجابة' : 'Fastest Latency'}</span>
            <span className="text-2xl font-black font-mono text-emerald-600">
              {minLatency !== null ? `${minLatency} ms` : (lang === 'ar' ? 'غير متاح' : 'N/A')}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'أبطأ استجابة' : 'Slowest Latency'}</span>
            <span className="text-2xl font-black font-mono text-amber-600">
              {maxLatency !== null ? `${maxLatency} ms` : (lang === 'ar' ? 'غير متاح' : 'N/A')}
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-800">{lang === 'ar' ? 'توزيع سرعة الاستجابة' : 'Latency Distribution'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span>{lang === 'ar' ? 'أسرع من ثانية (< 1 ثانية)' : 'Under 1s'}</span>
              <span className="font-mono font-bold text-lg">{fastCount}</span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-center justify-between">
              <span>{lang === 'ar' ? 'بين 1 إلى 3 ثواني' : '1s - 3s'}</span>
              <span className="font-mono font-bold text-lg">{mediumCount}</span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 flex items-center justify-between">
              <span>{lang === 'ar' ? 'أبطأ من 3 ثواني' : 'Over 3s'}</span>
              <span className="font-mono font-bold text-lg">{slowCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
