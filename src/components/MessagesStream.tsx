import React, { useState } from 'react';
import { FirestoreMessage } from '../types/dashboard';
import { getRecordTimestamp } from '../utils/analytics';
import { MessageSquare, Search, Filter, User, Bot, Clock, ShoppingBag, ExternalLink } from 'lucide-react';

interface Props {
  messages: FirestoreMessage[];
  onViewConversation: (conversationId: string, messageId?: string) => void;
  lang: 'ar' | 'en';
}

export const MessagesStream: React.FC<Props> = ({ messages, onViewConversation, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'assistant'>('all');

  const filteredMessages = messages.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (m.text || '').toLowerCase().includes(q) ||
      (m.conversationId || '').toLowerCase().includes(q) ||
      (m.modelUsed || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-4">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#C29F5D]" />
              <span>{lang === 'ar' ? 'سجل الرسائل المباشر (مجموعة messages في Firestore)' : 'Live Messages Stream'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? `إجمالي الرسائل المحفوظة في السحابة: ${messages.length} رسالة` : `Total cloud messages: ${messages.length}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 rtl:right-3 ltr:left-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث في نصوص الرسائل أو المعرفات...' : 'Search text or IDs...'}
                className="px-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#C29F5D]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">{lang === 'ar' ? 'كل الأطراف' : 'All Roles'}</option>
              <option value="user">{lang === 'ar' ? 'رسائل العملاء فقط' : 'Customers only'}</option>
              <option value="assistant">{lang === 'ar' ? 'ردود المساعد فقط' : 'Assistant only'}</option>
            </select>
          </div>
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {lang === 'ar' ? 'لا توجد رسائل مسجلة مطابقة في مجموعة messages.' : 'No messages found in Firestore collection.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-2">
            {filteredMessages.map((m, idx) => {
              const time = getRecordTimestamp(m);

              return (
                <div key={m.id || idx} className="p-3.5 hover:bg-slate-50/70 rounded-xl transition-colors space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${m.role === 'user' ? 'bg-[#C29F5D] text-slate-950 font-bold' : 'bg-[#2D4B3A] text-[#D4B26F]'}`}>
                        {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold text-slate-800">
                        {m.role === 'user' ? (lang === 'ar' ? 'عميل' : 'Customer') : (lang === 'ar' ? 'المساعد' : 'Assistant')}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {m.conversationId}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {time ? time.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US') : 'N/A'}
                      </span>
                      <button
                        onClick={() => onViewConversation(m.conversationId, m.messageId || m.id)}
                        className="text-[11px] font-bold text-[#C29F5D] hover:underline cursor-pointer"
                      >
                        {lang === 'ar' ? 'عرض المحادثة كاملة ↗' : 'View Thread ↗'}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pr-8" dir="auto">
                    {m.text}
                  </p>

                  {m.products && m.products.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 pr-8">
                      {m.products.map((p, pIdx) => (
                        <div key={p.productId || pIdx} className="p-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] flex items-center gap-1.5">
                          <ShoppingBag className="w-3 h-3 text-[#C29F5D]" />
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="text-slate-400">{p.price}</span>
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
    </div>
  );
};
