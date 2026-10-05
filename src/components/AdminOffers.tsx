import React from 'react';
import { FeedbackRecord } from '../types/dashboard';
import { Tag, ShoppingBag, ExternalLink, Sparkles } from 'lucide-react';

interface Props {
  records: FeedbackRecord[];
  lang: 'ar' | 'en';
}

export const AdminOffers: React.FC<Props> = ({ records, lang }) => {
  // Extract products appearing in records or default Medhal Al Tayeb luxury offerings
  const defaultOffers = [
    {
      id: 'maroki-vip',
      name: lang === 'ar' ? 'عود مروكي سوبر فاخر' : 'VIP Maroki Oud',
      price: '450 ر.س / أوقية',
      description: lang === 'ar' ? 'عود طبيعي محسن يتميز بثبات عالي ورائحة بخورية خشبية عميقة تناسب المجالس والمناسبات.' : 'Natural enhanced oud with deep woody notes.',
      badge: lang === 'ar' ? 'الأكثر طلباً ⭐' : 'Best Seller'
    },
    {
      id: 'trad-oil',
      name: lang === 'ar' ? 'دهن عود تراد معتق' : 'Aged Trad Oud Oil',
      price: '850 ر.س / ربع تولة',
      description: lang === 'ar' ? 'دهن عود صافي معتق لأكثر من 7 سنوات من غابات تراد العريقة.' : 'Pure aged oud oil from Trad forests.',
      badge: lang === 'ar' ? 'فاخر جداً 🪵' : 'Luxury'
    },
    {
      id: 'special-musk',
      name: lang === 'ar' ? 'مسك مدهال الخاص' : 'Medhal Special Musk',
      price: '220 ر.س / توله',
      description: lang === 'ar' ? 'مسك أبيض ملكي فواح بنكهة نظافة تدوم لأكثر من 24 ساعة على الجلد والملابس.' : 'Royal white musk with long-lasting freshness.',
      badge: lang === 'ar' ? 'عرض خاص 🏷️' : 'Special Offer'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-[#2D4B3A] to-[#1E3327] p-6 rounded-2xl text-white shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#D4B26F] text-xs font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'قائمة عروض متجر مدهال الطيب' : 'Store Offers & Catalog'}</span>
          </div>
          <h2 className="text-xl font-black">{lang === 'ar' ? 'العروض والمنتجات المعروضة للمساعد' : 'Assistant Catalog Reference'}</h2>
          <p className="text-xs text-slate-300">
            {lang === 'ar' ? 'هذه هي قائمة المنتجات الرسمية المعتمدة التي يجيب عنها المساعد الذكي.' : 'Official catalog referenced by the AI assistant.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {defaultOffers.map(offer => (
          <div key={offer.id} className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-3xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/40 flex items-center justify-center text-[#C29F5D]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-[10px] bg-[#2D4B3A]/10 text-[#2D4B3A] font-bold px-2.5 py-1 rounded-lg">
                  {offer.badge}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900">{offer.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{offer.description}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black font-mono text-[#C29F5D]">{offer.price}</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                {lang === 'ar' ? 'متاح للطلب' : 'Available'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
