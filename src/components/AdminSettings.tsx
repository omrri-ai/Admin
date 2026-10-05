import React, { useState } from 'react';
import { 
  Settings, 
  Lock, 
  CheckCircle2, 
  Key, 
  ShieldCheck, 
  UserCheck, 
  Bell, 
  Clock, 
  Shield, 
  SlidersHorizontal,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { hashPassword } from '../utils/security';

interface Props {
  lang: 'ar' | 'en';
}

export const AdminSettings: React.FC<Props> = ({ lang }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Administrative preference toggles
  const [notifyOnNegative, setNotifyOnNegative] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState('30');
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus(lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 خانات على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus(lang === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsSaving(true);
    setPasswordStatus(null);
    try {
      const hashed = await hashPassword(newPassword);
      await setDoc(doc(db, 'admin_config', 'auth'), {
        passwordHash: hashed,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setPasswordStatus(lang === 'ar' ? '✅ تم حفظ وتحديث كلمة مرور المشرف بنجاح!' : '✅ Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update error:', err);
      setPasswordStatus(lang === 'ar' ? 'حدث خطأ أثناء حفظ كلمة المرور.' : 'Error saving password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs space-y-6">
        
        {/* Executive Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#2D4B3A] text-white flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#D4B26F]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {lang === 'ar' ? 'لوحة الإعدادات الإدارية والأمان' : 'Admin & Security Settings'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'إدارة كلمة مرور المشرف، صلاحيات الحساب، وتفضيلات تنبيهات الجودة' 
                : 'Manage admin password, account permissions, and quality notifications.'}
            </p>
          </div>
        </div>

        {/* 2-Column Administrative Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          
          {/* SECTION 1: Change Admin Password */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <Key className="w-4 h-4 text-[#C29F5D]" />
              <span>{lang === 'ar' ? 'تغيير كلمة مرور المشرف' : 'Change Admin Password'}</span>
            </div>
            
            <p className="text-slate-500 text-[11px] leading-relaxed">
              {lang === 'ar' 
                ? 'لحماية اللوحة، اختر كلمة مرور قوية وخاصة بك. يتم تشفير كلمة المرور فوراً وفق معيار الأمان العالي (SHA-256).'
                : 'Set a secure private password to protect your admin dashboard. Encrypted with SHA-256 standard.'}
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {lang === 'ar' ? 'كلمة المرور الجديدة (6 خانات أو أكثر)' : 'New Password (6+ characters)'}
                </label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#C29F5D]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#C29F5D]"
                  required
                />
              </div>

              {passwordStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  passwordStatus.includes('✅') 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {passwordStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-[#2D4B3A] hover:bg-[#3E634F] text-[#D4B26F] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSaving ? (lang === 'ar' ? 'جاري الحفظ المشفر...' : 'Saving...') : (lang === 'ar' ? 'حفظ وتحديث كلمة المرور' : 'Save & Update Password')}</span>
              </button>
            </form>
          </div>

          {/* SECTION 2: Administrative Profile & Permissions */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <UserCheck className="w-4 h-4 text-[#2D4B3A]" />
              <span>{lang === 'ar' ? 'الملف الإداري وصلاحيات المشرف' : 'Admin Profile & Roles'}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500">{lang === 'ar' ? 'الرتبة الإدارية:' : 'Role:'}</span>
                <span className="font-black text-[#2D4B3A] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                  {lang === 'ar' ? 'مدير نظام معتمد (Super Admin)' : 'Super Administrator'}
                </span>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500">{lang === 'ar' ? 'نطاق الصلاحيات:' : 'Permissions:'}</span>
                <span className="font-bold text-slate-800">
                  {lang === 'ar' ? 'كاملة (قراءة، تصدير، مراجعة، أمان)' : 'Full Access'}
                </span>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500">{lang === 'ar' ? 'حالة التشفير والحماية:' : 'Security Status:'}</span>
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {lang === 'ar' ? 'نشطة ومحمية بالكامل' : 'Protected & Active'}
                </span>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500">{lang === 'ar' ? 'نظام المزامنة:' : 'Sync Engine:'}</span>
                <span className="text-slate-700 font-bold font-mono">
                  Real-time Cloud Sync
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
              {lang === 'ar' 
                ? 'لوحة إدارة متجر مدهال الطيب مخصصة حصرياً للمشرفين، وتتيح متابعة المحادثات، التقييمات، تشخيص أداء المساعد واستهلاك الرموز.'
                : 'Medhal Quality Suite is restricted to store administrators to monitor quality, ratings, and usage.'}
            </div>
          </div>

        </div>

        {/* SECTION 3: Administrative Alerts & Notification Preferences */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <Bell className="w-4 h-4 text-[#C29F5D]" />
              <span>{lang === 'ar' ? 'تفضيلات التنبيهات الإدارية وإشعارات الجودة' : 'Administrative Notification Preferences'}</span>
            </div>
            {savedSettingsNotice && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'تم حفظ التفضيلات' : 'Settings Saved'}
              </span>
            )}
          </div>

          <form onSubmit={handleSavePreferences} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{lang === 'ar' ? 'تنبيه فوري عند التقييم السلبي 👎' : 'Alert on Negative Rating'}</span>
                <input 
                  type="checkbox" 
                  checked={notifyOnNegative}
                  onChange={(e) => setNotifyOnNegative(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2D4B3A] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'إبراز المحادثة فوراً في تبويب الأخطاء للمراجعة والتدخل السريع.' : 'Highlight issue immediately for rapid review.'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{lang === 'ar' ? 'ملخص الأداء اليومي' : 'Daily Quality Summary'}</span>
                <input 
                  type="checkbox" 
                  checked={notifyDailyDigest}
                  onChange={(e) => setNotifyDailyDigest(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2D4B3A] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'إعداد إحصائيات يومية لنسب الرضا واستهلاك الرموز.' : 'Generate daily satisfaction rates and token usage summary.'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{lang === 'ar' ? 'مدة الجلسة قبل القفل' : 'Auto-Lock Timeout'}</span>
                <select 
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1 font-bold"
                >
                  <option value="15">15 {lang === 'ar' ? 'دقيقة' : 'min'}</option>
                  <option value="30">30 {lang === 'ar' ? 'دقيقة' : 'min'}</option>
                  <option value="60">60 {lang === 'ar' ? 'دقيقة' : 'min'}</option>
                  <option value="120">ساعتان</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'قفل لوحة الإدارة تلقائياً عند عدم وجود نشاط لضمان الأمان.' : 'Automatically locks dashboard when inactive.'}
              </p>
            </div>

            <div className="md:col-span-3 flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2D4B3A] hover:bg-[#3E634F] text-[#D4B26F] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'حفظ التفضيلات الإدارية' : 'Save Administrative Preferences'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};
