import React from 'react';
import { FeedbackRecord, Product } from '../types/dashboard';
import { isPositive, isNegative } from '../utils/analytics';
import { ShoppingBag, ThumbsUp, ThumbsDown, Info, ExternalLink } from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  lang: 'ar' | 'en';
}

interface ProductStat {
  productId: string;
  name: string;
  price?: string;
  weight?: string;
  link?: string;
  totalAppeared: number;
  positiveCount: number;
  negativeCount: number;
}

export const ProductAnalytics: React.FC<Props> = ({ records, lang }) => {
  const productMap: Record<string, ProductStat> = {};

  records.forEach(r => {
    const list: Product[] = r.products || r.productCards || [];
    const isPos = isPositive(r.rating);
    const isNeg = isNegative(r.rating);

    list.forEach(p => {
      const pid = p.productId || p.name;
      if (!productMap[pid]) {
        productMap[pid] = {
          productId: pid,
          name: p.name,
          price: p.price,
          weight: p.weight,
          link: p.link,
          totalAppeared: 0,
          positiveCount: 0,
          negativeCount: 0,
        };
      }
      productMap[pid].totalAppeared++;
      if (isPos) productMap[pid].positiveCount++;
      if (isNeg) productMap[pid].negativeCount++;
    });
  });

  const productsList = Object.values(productMap).sort((a, b) => b.totalAppeared - a.totalAppeared);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Informative Header Banner */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-[#C29F5D] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">{lang === 'ar' ? 'تحليل المنتجات في إجابات المساعد الذكي:' : 'Product Card Inclusions:'}</span>
          <p className="text-[11px] text-amber-800 mt-0.5">
            {lang === 'ar'
              ? 'تعتمد هذه الإحصائيات على بطاقات المنتجات (productCards) التي أرفقها المساعد تلقائياً للعملاء، وتوضح مدى ارتباطها بالتقييمات الإيجابية أو السلبية. (الظهور لا يعني بالضرورة المبيعات).'
              : 'Shows how often product cards appeared in responses and their correlation with user ratings.'}
          </p>
        </div>
      </div>

      {productsList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          {lang === 'ar' ? 'لم يتم تسجيل أي بطاقات منتجات في الردود المقيمة بعد.' : 'No products logged in evaluated responses.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsList.map((p) => (
            <div key={p.productId} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-3xs space-y-4 flex flex-col justify-between">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-amber-200/40 flex items-center justify-center text-[#C29F5D]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#2D4B3A] bg-[#2D4B3A]/10 px-2.5 py-1 rounded-lg">
                    {p.totalAppeared} {lang === 'ar' ? 'مرات ظهور' : 'impressions'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                  {p.weight && <span className="text-[11px] text-slate-400 block">{p.weight}</span>}
                  {p.price && <span className="text-xs font-bold text-[#C29F5D] block mt-1">{p.price}</span>}
                </div>
              </div>

              {/* Thumbs breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 fill-emerald-600" />
                    {lang === 'ar' ? 'مع تقييم إيجابي:' : 'With Likes:'}
                  </span>
                  <span className="font-mono text-emerald-800">{p.positiveCount}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-700 flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5 fill-rose-600" />
                    {lang === 'ar' ? 'مع تقييم سلبي:' : 'With Dislikes:'}
                  </span>
                  <span className="font-mono text-rose-800">{p.negativeCount}</span>
                </div>

                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 pt-1"
                  >
                    <span>{lang === 'ar' ? 'معاينة في المتجر' : 'Store Link'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
