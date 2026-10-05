import React, { useState } from 'react';
import { FeedbackRecord } from '../types/dashboard';
import { exportRecordsToCSV, isPositive, isNegative, getRecordTimestamp } from '../utils/analytics';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  Lightbulb, 
  AlertCircle, 
  Copy, 
  Check, 
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  lang: 'ar' | 'en';
}

export const AdminReports: React.FC<Props> = ({ records, lang }) => {
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);

  const handleExportCSV = () => {
    exportRecordsToCSV(records, 'medhal_quality_report.csv');
  };

  const total = records.length;
  const likes = records.filter(r => isPositive(r.rating)).length;
  const dislikes = records.filter(r => isNegative(r.rating)).length;
  const positiveRate = total > 0 ? Math.round((likes / total) * 100) : 100;
  const fixedCount = records.filter(r => r.reviewStatus === 'fixed').length;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRuleId(id);
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  // Structured, simple, distraction-free suggestions based on real cases
  const identifiedIssues = [
    {
      id: 'price-rule',
      titleAr: 'دقة الأسعار والأوزان الرسمية',
      titleEn: 'Official Prices & Weights Accuracy',
      badgeAr: 'أولوية عالية ⚡',
      summaryAr: 'عند سؤال العميل عن أسعار العود المروكي أو دهن تراد، يحتاج المساعد لذكر السعر المعتمد فوراً مع الوزن وإرفاق الرابط المباشر.',
      suggestedFixAr: 'إضافة جدول أسعار قاطع في تعليمات المساعد يمنع تخمين أي سعر خارج الكتالوج.',
      ruleCode: `قاعدة تعليمات الأسعار لـ System Prompt:
"قواعد الأسعار الرسمية لمتجر مدهال الطيب:
1. عود مروكي طبيعي محسن: الأوقية (30 جرام) بسعر 120 ر.س | الثمن (125 جرام) بسعر 450 ر.س.
2. دهن عود تراد الحصري المعتق: التولة الكاملة 350 ر.س | نصف التولة 185 ر.س | ربع التولة 95 ر.س.
3. مسك مدهال الخاص: التولة 120 ر.س | ربع التولة 35 ر.س.
- اذكر السعر فوراً للعميل مع رابط المنتج المباشر ولا تقبل أي مفاوضة خارج هذا الجدول."`
    },
    {
      id: 'unsupported-rule',
      titleAr: 'التعامل مع المنتجات غير المتوفرة (زعفران، عطور)',
      titleEn: 'Handling Unsupported Item Requests',
      badgeAr: 'تحسين تجربة العميل 🛍️',
      summaryAr: 'بعض العملاء يسألون عن منتجات لا يبيعها متجر مدهال الطيب (مثل العطور المركبة أو الزعفران).',
      suggestedFixAr: 'توجيه المساعد لتوضيح تخصص المتجر بلباقة في خشب ودهن العود الطبيعي الفاخر، واقتراح بديل متوفر.',
      ruleCode: `قاعدة تعليمات التخصص لـ System Prompt:
"المنتجات غير المتاحة:
متجر مدهال الطيب متخصص حصرياً في: (خشب العود الطبيعي المحسن، دهن العود المعتق، والمسك الخاص).
إذا سأل العميل عن عطور أو زعفران أو غيرها، أجب بلباقة:
'أهلاً بك! مدهال الطيب متخصص حصرياً في أجود أنواع خشب العود الطبيعي الفاخر وأدهان العود المعتقة النقية. ويسعدنا اطلاعك على خيارات العود المتوفرة لدينا عبر المتجر'."`
    },
    {
      id: 'concise-rule',
      titleAr: 'وضوح واختصار الإجابات مع بطاقات الشراء',
      titleEn: 'Concise Responses with Purchase Cards',
      badgeAr: 'زيادة المبيعات 📈',
      summaryAr: 'العملاء يفضلون الإجابة المختصرة المباشرة في سطرين متبوعة بكارت الشراء ورابط الطلب المباشر.',
      suggestedFixAr: 'إلزام المساعد بالاختصار الذكي وعرض كارت المنتج فوراً.',
      ruleCode: `قاعدة الإيجاز لـ System Prompt:
"قاعدة العرض المباشر:
اجعل ردك دائماً مركزاً في سطرين أو ثلاثة أسطر كحد أقصى، وقدم اسم المنتج وسعره ورابط طلبه فوراً لتسهيل تجربة الشراء على العميل."`
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. EXECUTIVE SUMMARY - CLEAN & DISTRACTION-FREE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-3xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C29F5D]" />
              <span>{lang === 'ar' ? 'تقرير الجودة والتشخيص واقتراحات الحلول' : 'Quality Audit & Actionable Solutions Report'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'واجهة بسيطة وسهلة تلخص الأداء وتقترح لك الحلول المباشرة لتطوير المساعد بدون تشتت' : 'Simple, high-clarity summary with direct solutions'}
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#2D4B3A] hover:bg-[#3E634F] text-[#D4B26F] rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير التقرير الكامل (CSV)' : 'Export CSV Report'}</span>
          </button>
        </div>

        {/* 4 Clean Big Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">{lang === 'ar' ? 'إجمالي التقييمات المسجلة' : 'Total Audits'}</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{total}</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
            <span className="text-[10px] text-emerald-800 font-bold block uppercase">{lang === 'ar' ? 'نسبة رضا العملاء' : 'Satisfaction Rate'}</span>
            <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">{positiveRate}%</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">{likes} {lang === 'ar' ? 'رد نال الإعجاب 👍' : 'Likes'}</span>
          </div>

          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200/70">
            <span className="text-[10px] text-rose-800 font-bold block uppercase">{lang === 'ar' ? 'الملاحظات السلبية' : 'Issues Logged'}</span>
            <span className="text-2xl font-black font-mono text-rose-700 mt-1 block">{dislikes}</span>
            <span className="text-[10px] text-rose-600 block mt-0.5">{lang === 'ar' ? 'تحتاج تصحيحاً في التعليمات 👎' : 'Needs tuning'}</span>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/70">
            <span className="text-[10px] text-amber-800 font-bold block uppercase">{lang === 'ar' ? 'الحالات المصححة' : 'Resolved Cases'}</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{fixedCount}</span>
            <span className="text-[10px] text-[#C29F5D] font-bold block mt-0.5">{lang === 'ar' ? 'تم تحديث حالتها بنجاح ✅' : 'Verified fixes'}</span>
          </div>
        </div>

      </div>

      {/* 2. ACTIONABLE PROBLEM SOLUTIONS SECTION - SIMPLE & DIRECT */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#C29F5D]" />
          <div>
            <h3 className="text-sm font-black text-slate-900">{lang === 'ar' ? 'أبرز المشاكل المرصودة واقتراحات الحلول الموصى بها' : 'Top Identified Issues & Recommended Solutions'}</h3>
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'انسخ النص المقترح وأضفه في تعليمات المساعد لضمان عدم تكرار المشكلة نهائياً' : 'Apply these rules to permanently resolve common errors'}</span>
          </div>
        </div>

        <div className="space-y-4">
          {identifiedIssues.map((issue) => (
            <div key={issue.id} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C29F5D]"></span>
                  <h4 className="text-sm font-black text-slate-900">{issue.titleAr}</h4>
                </div>
                <span className="text-[10px] font-bold text-[#2D4B3A] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  {issue.badgeAr}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Description */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{lang === 'ar' ? 'ملخص المشكلة:' : 'Issue Summary:'}</span>
                  <p className="text-slate-700 leading-relaxed font-medium">{issue.summaryAr}</p>
                </div>

                {/* Fix */}
                <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">{lang === 'ar' ? '💡 اقتراح الحل المباشر:' : 'Direct Solution:'}</span>
                  <p className="text-slate-800 leading-relaxed font-bold">{issue.suggestedFixAr}</p>
                </div>

              </div>

              {/* Code/Rule Box with One-Click Copy */}
              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">{lang === 'ar' ? 'نص القاعدة المقترح إضافته لتعليمات المساعد:' : 'Proposed System Prompt Rule:'}</span>
                  <button
                    onClick={() => handleCopy(issue.id, issue.ruleCode)}
                    className="px-3 py-1 bg-[#2D4B3A] hover:bg-[#3E634F] text-[#D4B26F] text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    {copiedRuleId === issue.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRuleId === issue.id ? (lang === 'ar' ? 'تم النسخ ✅' : 'Copied!') : (lang === 'ar' ? 'نسخ القاعدة المقترحة' : 'Copy Rule')}</span>
                  </button>
                </div>

                <pre className="text-xs font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed select-all" dir="auto">
                  {issue.ruleCode}
                </pre>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
