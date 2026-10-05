import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Settings, 
  Layers, 
  Send, 
  Copy, 
  Check, 
  RotateCcw, 
  Code, 
  FileText, 
  Sliders, 
  Languages, 
  BookOpen, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Lock, 
  ShieldAlert, 
  PieChart, 
  HelpCircle, 
  Activity, 
  Info, 
  X, 
  ChevronRight, 
  RefreshCw, 
  SlidersHorizontal, 
  ShoppingBag, 
  Tag,
  Star,
  Download,
  Menu,
  Home,
  MessageSquare,
  Users,
  Cpu,
  Key
} from 'lucide-react';

// Import initialized Firebase objects
import { db, auth } from './firebase';
import { 
  collection, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

import { Product, Diagnostics, FeedbackRecord, FirestoreMessage, ChatMessage } from './types/dashboard';
import { 
  deduplicateFeedbacks, 
  exportRecordsToCSV, 
  isPositive, 
  isNegative, 
  getRecordTimestamp 
} from './utils/analytics';
import { hashPassword } from './utils/security';
import { DashboardOverview } from './components/DashboardOverview';
import { UsageAnalytics } from './components/UsageAnalytics';
import { ConversationsLog } from './components/ConversationsLog';
import { MessagesStream } from './components/MessagesStream';
import { ProductAnalytics } from './components/ProductAnalytics';
import { RecordModal } from './components/RecordModal';
import { AdminOffers } from './components/AdminOffers';
import { AdminPerformance } from './components/AdminPerformance';
import { AdminReports } from './components/AdminReports';
import { AdminSettings } from './components/AdminSettings';

// Arabic Names for Categories
const ISSUE_LABELS_AR: Record<string, string> = {
  none: 'بدون مشكلة',
  unanswered: 'بدون إجابة',
  price_error: 'خطأ في السعر',
  weight_error: 'خطأ في الوزن',
  product_error: 'خطأ في المنتج',
  context_error: 'خطأ في السياق',
  link_error: 'رابط منتج خاطئ',
  image_error: 'صورة منتج خاطئة',
  incorrect_info: 'معلومات غير صحيحة',
  filtering_error: 'مشكلة في الترشيح',
  other: 'مشكلة أخرى'
};

const ISSUE_LABELS_EN: Record<string, string> = {
  none: 'No Issue',
  unanswered: 'Unanswered',
  price_error: 'Price Error',
  weight_error: 'Weight Error',
  product_error: 'Product Error',
  context_error: 'Context Error',
  link_error: 'Wrong Product Link',
  image_error: 'Wrong Product Image',
  incorrect_info: 'Incorrect Info',
  filtering_error: 'Filtering Issue',
  other: 'Other Issue'
};

const STATUS_LABELS_AR: Record<string, string> = {
  new: 'جديد 🆕',
  reviewing: 'قيد المراجعة ⏳',
  fixed: 'تم التصحيح ✅',
  ignored: 'تم التجاهل 💤'
};

const STATUS_LABELS_EN: Record<string, string> = {
  new: 'New 🆕',
  reviewing: 'Reviewing ⏳',
  fixed: 'Fixed ✅',
  ignored: 'Ignored 💤'
};

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState<boolean>(false);

  // Dynamic Password Configuration State from Firestore
  const [storedPasswordHash, setStoredPasswordHash] = useState<string | null>(null);
  const [hasCheckedPasswordConfig, setHasCheckedPasswordConfig] = useState<boolean>(false);
  const [initialPassword, setInitialPassword] = useState<string>('');
  const [confirmInitialPassword, setConfirmInitialPassword] = useState<string>('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSettingUpPassword, setIsSettingUpPassword] = useState<boolean>(false);

  // Firestore Feedback & Messages Data State
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Active Admin Tab
  const [activeAdminTab, setActiveAdminTab] = useState<
    'dashboard' | 'conversations' | 'messages' | 'feedback' | 'products' | 'usage' | 'models' | 'performance' | 'offers' | 'issues' | 'reports' | 'settings'
  >('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Sidebar position: default to 'left' as requested by the user, persisted in localStorage
  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'left'>(() => {
    return (localStorage.getItem('medhal_sidebar_pos') as 'right' | 'left') || 'left';
  });

  const toggleSidebarPosition = () => {
    const next = sidebarPosition === 'left' ? 'right' : 'left';
    setSidebarPosition(next);
    localStorage.setItem('medhal_sidebar_pos', next);
  };

  // Deep linking to specific conversation / message
  const [targetConversationId, setTargetConversationId] = useState<string | null>(null);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterIssue, setFilterIssue] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all'); 
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Selected Record for Modal Overlay
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);

  // Success message toaster
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Handle Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to Admin Password Config in Firestore
  useEffect(() => {
    const configRef = doc(db, 'admin_config', 'auth');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().passwordHash) {
        setStoredPasswordHash(docSnap.data().passwordHash);
      } else {
        setStoredPasswordHash(null);
      }
      setHasCheckedPasswordConfig(true);
    }, (err) => {
      console.error("Config fetch error:", err);
      setHasCheckedPasswordConfig(true);
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen to Firestore Feedbacks Collection in Real-Time
  useEffect(() => {
    setDataLoading(true);
    const colRef = collection(db, 'feedbacks');
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const records: FeedbackRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push({
          id: docSnap.id,
          ...docSnap.data()
        } as FeedbackRecord);
      });

      const dedupedRecords = deduplicateFeedbacks(records);
      setFeedbacks(dedupedRecords);
      setDataLoading(false);
    }, (error) => {
      console.error("Firestore feedbacks loading error:", error);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 4. Listen to Firestore Messages Collection in Real-Time
  useEffect(() => {
    const messagesCol = collection(db, 'messages');
    const unsubscribe = onSnapshot(messagesCol, (snapshot) => {
      const msgs: FirestoreMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({
          id: docSnap.id,
          ...docSnap.data()
        } as FirestoreMessage);
      });
      setMessages(msgs);
    }, (err) => {
      console.warn("Messages collection listener error:", err);
    });

    return () => unsubscribe();
  }, []);

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(lang === 'ar' ? 'فشل تسجيل الدخول بحساب Google. جرب كلمة المرور.' : 'Google auth failed. Use password.');
    }
  };

  const handleCustomPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!storedPasswordHash) {
      setAuthError(lang === 'ar' ? 'لم يتم تعيين كلمة مرور المشرف بعد. يرجى إعدادها أولاً.' : 'Admin password not set yet.');
      return;
    }

    const inputHash = await hashPassword(adminPasscode);
    if (inputHash === storedPasswordHash) {
      setIsBypassed(true);
      setUser({
        displayName: lang === 'ar' ? 'مشرف مدهال الطيب' : 'Medhal Admin',
        email: 'admin@medhal-altayeb.com'
      });
    } else {
      setAuthError(lang === 'ar' ? 'كلمة المرور غير صحيحة!' : 'Incorrect password!');
    }
  };

  const handleInitialPasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (!initialPassword || initialPassword.length < 6) {
      setSetupError(lang === 'ar' ? 'يجب ألا تقل كلمة المرور عن 6 خانات.' : 'Password must be at least 6 characters.');
      return;
    }
    if (initialPassword !== confirmInitialPassword) {
      setSetupError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsSettingUpPassword(true);
    try {
      const hashed = await hashPassword(initialPassword);
      await setDoc(doc(db, 'admin_config', 'auth'), {
        passwordHash: hashed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsBypassed(true);
      setUser({
        displayName: lang === 'ar' ? 'مشرف مدهال الطيب' : 'Medhal Admin',
        email: 'admin@medhal-altayeb.com'
      });
      triggerToast(lang === 'ar' ? 'تم إنشاء كلمة مرور المشرف وتسجيل الدخول بنجاح!' : 'Admin password created and logged in!');
    } catch (err: any) {
      console.error("Setup password error:", err);
      setSetupError(lang === 'ar' ? 'فشل حفظ كلمة المرور في Firestore.' : 'Failed to save password in Firestore.');
    } finally {
      setIsSettingUpPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsBypassed(false);
    setUser(null);
    setAdminPasscode('');
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteDoc(doc(db, 'feedbacks', recordId));
      if (selectedRecord && selectedRecord.id === recordId) {
        setSelectedRecord(null);
      }
      triggerToast(lang === 'ar' ? 'تم حذف سجل التقييم بنجاح' : 'Record deleted successfully');
    } catch (err) {
      console.error("Delete record error:", err);
      triggerToast(lang === 'ar' ? 'فشل حذف السجل' : 'Failed to delete record');
    }
  };

  const handleUpdateRecordFields = async (recordId: string, updates: Partial<FeedbackRecord>) => {
    setUpdatingRecordId(recordId);
    try {
      const recordRef = doc(db, 'feedbacks', recordId);
      await updateDoc(recordRef, updates);
      
      if (selectedRecord && selectedRecord.id === recordId) {
        setSelectedRecord(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      console.error("Update feedback status error:", err);
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const triggerToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const searchMatch = term === '' || 
      (item.userQuery || '').toLowerCase().includes(term) || 
      (item.assistantResponse || item.assistantReply || '').toLowerCase().includes(term) ||
      (item.conversationId || '').toLowerCase().includes(term) ||
      (item.messageId || '').toLowerCase().includes(term) ||
      (item.modelUsed || '').toLowerCase().includes(term) ||
      ((item.products || item.productCards || []).some(p => p.name?.toLowerCase().includes(term)));
    
    const ratingMatch = filterRating === 'all' || 
      (filterRating === 'positive' && isPositive(item.rating)) || 
      (filterRating === 'negative' && isNegative(item.rating)) ||
      (filterRating === 'unrated' && !isPositive(item.rating) && !isNegative(item.rating));

    const issueMatch = filterIssue === 'all' || item.issueType === filterIssue;
    const statusMatch = filterStatus === 'all' || item.reviewStatus === filterStatus;
    const modelMatch = filterModel === 'all' || item.modelUsed === filterModel;
    const productMatch = filterProduct === 'all' || 
      ((item.products || item.productCards || []).some(p => p.productId === filterProduct || p.name === filterProduct));

    let dateMatch = true;
    const itemDate = getRecordTimestamp(item);
    const nowTime = new Date();
    if (filterDate === 'today') {
      const todayStart = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate()).getTime();
      dateMatch = !!itemDate && itemDate.getTime() >= todayStart;
    } else if (filterDate === '7days') {
      dateMatch = !!itemDate && itemDate.getTime() >= (nowTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterDate === '30days') {
      dateMatch = !!itemDate && itemDate.getTime() >= (nowTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (filterDate === 'custom') {
      if (customStartDate && itemDate) {
        const start = new Date(customStartDate).getTime();
        if (itemDate.getTime() < start) dateMatch = false;
      }
      if (customEndDate && itemDate) {
        const end = new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000;
        if (itemDate.getTime() > end) dateMatch = false;
      }
    }

    return searchMatch && ratingMatch && issueMatch && statusMatch && modelMatch && productMatch && dateMatch;
  });

  const uniqueModels = Array.from(new Set(feedbacks.map(f => f.modelUsed).filter(Boolean)));
  const dislikesCount = feedbacks.filter(f => isNegative(f.rating)).length;
  const issueBreakdown = feedbacks.reduce((acc, curr) => {
    if (isNegative(curr.rating) && curr.issueType && curr.issueType !== 'none') {
      acc[curr.issueType] = (acc[curr.issueType] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* GLOBAL SYSTEM HEADER */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between text-xs font-bold border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* ONLY ONE 3-lines menu button strictly on the right side in Arabic */}
          <button 
            onClick={() => setMobileSidebarOpen(prev => !prev)}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-[#D4B26F] border border-slate-700 rounded-xl cursor-pointer transition-colors flex items-center justify-center shadow-xs"
            title={lang === 'ar' ? 'القائمة (3 خطوط)' : 'Menu'}
          >
            <Menu className="w-5 h-5 text-[#D4B26F]" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-[#C29F5D] text-slate-950 flex items-center justify-center font-black text-sm">
            م
          </div>
          <div>
            <span className="font-extrabold text-xs sm:text-sm text-[#D4B26F]">{lang === 'ar' ? 'مركز مراقبة وتحليلات مدهال الطيب' : 'Medhal Quality Suite'}</span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 mr-2 ml-2">· Enterprise Live Console</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] text-slate-300">Firestore Real-time Active</span>
          </div>

          <button 
            onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      {/* TOASTER */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 bg-slate-900 text-[#D4B26F] text-xs font-bold py-3.5 px-5 rounded-xl shadow-xl z-50 flex items-center gap-3 border border-slate-800 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* AUTH SCREEN OR DASHBOARD                                 */}
      {/* ======================================================== */}
      {!user && !isBypassed ? (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
          
          {/* Case A: Initial Password Setup Required */}
          {hasCheckedPasswordConfig && !storedPasswordHash ? (
            <div className="bg-white max-w-md w-full rounded-3xl border border-amber-200/60 shadow-xl p-8 space-y-6 text-center animate-fade-in">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2D4B3A] to-[#3E634F] flex items-center justify-center text-white shadow-md mx-auto">
                  <Key className="w-7 h-7 text-[#D4B26F]" />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {lang === 'ar' ? 'إعداد كلمة مرور المشرف لأول مرة' : 'Create Admin Password'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  {lang === 'ar' ? 'مرحباً بك! اختر كلمة مرور إدارية خاصة بك لحماية لوحة الإدارة.' : 'Set a private custom admin password to secure your analytics dashboard.'}
                </p>
              </div>

              <form onSubmit={handleInitialPasswordSetup} className="space-y-3.5 text-start">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {lang === 'ar' ? 'كلمة المرور الإدارية (6 خانات أو أكثر)' : 'Admin Password (6+ chars)'}
                  </label>
                  <input 
                    type="password" 
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#C29F5D]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <input 
                    type="password" 
                    value={confirmInitialPassword}
                    onChange={(e) => setConfirmInitialPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#C29F5D]"
                    required
                  />
                </div>

                {setupError && (
                  <p className="text-[11px] text-rose-600 font-bold">{setupError}</p>
                )}

                <button 
                  type="submit" 
                  disabled={isSettingUpPassword}
                  className="w-full py-3 bg-[#2D4B3A] hover:bg-[#3E634F] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSettingUpPassword ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تعيين كلمة المرور وبدء الاستخدام' : 'Set Password & Launch')}
                </button>
              </form>
            </div>
          ) : (
            /* Case B: Standard Secure Login Screen */
            <div className="bg-white max-w-md w-full rounded-3xl border border-amber-200/60 shadow-xl p-8 space-y-6 text-center animate-fade-in">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2D4B3A] to-[#3E634F] flex items-center justify-center text-white shadow-md mx-auto">
                  <Lock className="w-6 h-6 text-[#D4B26F]" />
                </div>
                <h2 className="text-xl font-black text-slate-900">{lang === 'ar' ? 'تسجيل دخول المشرف' : 'Administrative Login'}</h2>
                <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto">
                  {lang === 'ar' ? 'الرجاء تسجيل الدخول للوصول إلى تحليلات وسجلات مساعد مدهال الطيب.' : 'Authenticate to access Medhal assistant analytics and audit logs.'}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span>{lang === 'ar' ? 'تسجيل الدخول بحساب Google' : 'Sign In with Google'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-[1px] bg-slate-200 flex-1"></span>
                  <span>{lang === 'ar' ? 'أو بكلمة مرور المشرف' : 'Or Admin Password'}</span>
                  <span className="h-[1px] bg-slate-200 flex-1"></span>
                </div>

                <form onSubmit={handleCustomPasswordSignIn} className="space-y-3 text-start">
                  <input 
                    type="password" 
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل كلمة المرور المخصصة...' : 'Enter your password...'}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-center font-mono focus:outline-none focus:border-[#C29F5D]"
                    required
                  />
                  {authError && (
                    <p className="text-[11px] text-rose-600 font-bold text-center">{authError}</p>
                  )}
                  <button type="submit" className="w-full py-2.5 bg-[#2D4B3A] hover:bg-[#3E634F] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    {lang === 'ar' ? 'فتح لوحة الإدارة' : 'Unlock Dashboard'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ======================================================== */
        /* AUTHENTICATED ADMIN CONSOLE LAYOUT                       */
        /* ======================================================== */
        <div className="flex flex-col md:flex-row min-h-[90vh]">
          
          {/* Sidebar Navigation (Right side in Arabic) */}
          <aside className={`w-64 bg-slate-900 text-white p-5 flex flex-col justify-between shrink-0 transition-all z-50 ${
            mobileSidebarOpen 
              ? 'fixed inset-y-0 right-0 shadow-2xl block' 
              : 'hidden md:flex'
          }`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C29F5D] text-slate-950 flex items-center justify-center font-black">
                    م
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#D4B26F]">{lang === 'ar' ? 'لوحة تحكم مدهال' : 'Medhal Admin'}</h3>
                    <span className="text-[9px] text-slate-400">Enterprise v2.8</span>
                  </div>
                </div>
                {mobileSidebarOpen && (
                  <button onClick={() => setMobileSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <nav className="space-y-1 font-semibold text-xs">
                {[
                  { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Dashboard', icon: Home },
                  { id: 'conversations', labelAr: 'محادثات العملاء', labelEn: 'Customer Conversations', icon: MessageSquare },
                  { id: 'feedback', labelAr: 'التقييمات', labelEn: 'Ratings & Feedbacks', icon: ThumbsUp },
                  { id: 'products', labelAr: 'المنتجات', labelEn: 'Products', icon: ShoppingBag },
                  { id: 'usage', labelAr: 'استهلاك الرموز والتكلفة', labelEn: 'Tokens & Usage', icon: Users },
                  { id: 'models', labelAr: 'تحليلات النموذج', labelEn: 'Model Analytics', icon: Cpu },
                  { id: 'performance', labelAr: 'تحليلات الأداء', labelEn: 'Performance', icon: Activity },
                  { id: 'offers', labelAr: 'العروض', labelEn: 'Offers', icon: Tag },
                  { id: 'issues', labelAr: 'الأخطاء والمشاكل', labelEn: 'Errors & Issues', icon: ShieldAlert },
                  { id: 'reports', labelAr: 'التقارير والتصدير', labelEn: 'Reports & Export', icon: Download },
                  { id: 'settings', labelAr: 'إعدادات الإدارة', labelEn: 'Settings', icon: Settings }
                ].map(item => {
                  const IconComp = item.icon;
                  const isActive = activeAdminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveAdminTab(item.id as any);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-start ${isActive ? 'bg-[#C29F5D] text-slate-950 font-black shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User Signout */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email || 'admin@medhal-altayeb.com'}
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full py-2 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
            
            {/* Active Section Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {activeAdminTab === 'dashboard' && (lang === 'ar' ? 'الرئيسية وملخص الحالة' : 'Dashboard Overview')}
                  {activeAdminTab === 'conversations' && (lang === 'ar' ? 'محادثات العملاء (مجمّعة حسب كل عميل)' : 'Customer Conversations')}
                  {activeAdminTab === 'feedback' && (lang === 'ar' ? 'سجل التقييمات (👍 / 👎)' : 'Ratings & Feedbacks Audit')}
                  {activeAdminTab === 'products' && (lang === 'ar' ? 'تحليل بطاقات المنتجات' : 'Product Analytics')}
                  {activeAdminTab === 'usage' && (lang === 'ar' ? 'تحليلات استهلاك الرموز والتكلفة (Gemini)' : 'Token Usage & Cost Analytics')}
                  {activeAdminTab === 'models' && (lang === 'ar' ? 'تحليلات نموذج Gemini' : 'Model Analytics')}
                  {activeAdminTab === 'performance' && (lang === 'ar' ? 'تحليلات أداء الاستجابة' : 'Performance Analytics')}
                  {activeAdminTab === 'offers' && (lang === 'ar' ? 'عروض متجر مدهال الطيب' : 'Store Offers & Catalog')}
                  {activeAdminTab === 'issues' && (lang === 'ar' ? 'مراقبة الأخطاء والمشاكل' : 'Errors & Issues Monitoring')}
                  {activeAdminTab === 'reports' && (lang === 'ar' ? 'التقارير وتصدير CSV' : 'Reports & Export')}
                  {activeAdminTab === 'settings' && (lang === 'ar' ? 'إعدادات الإدارة و Firestore' : 'Admin Settings')}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'بيانات حقيقية ومتزامنة فورياً مع مجموعتي feedbacks و messages في Firestore' : 'Live synchronized Firestore production data'}
                </p>
              </div>
            </div>

            {/* Tab Views */}
            {activeAdminTab === 'dashboard' && (
              <DashboardOverview 
                records={feedbacks} 
                messages={messages}
                onOpenRecord={setSelectedRecord} 
                onNavigateTab={(tabId, filterRating) => {
                  setActiveAdminTab(tabId as any);
                  if (filterRating) setFilterRating(filterRating);
                }}
                lang={lang} 
              />
            )}
            
            {activeAdminTab === 'conversations' && (
              <ConversationsLog 
                records={feedbacks} 
                messages={messages} 
                targetConversationId={targetConversationId}
                targetMessageId={targetMessageId}
                onOpenRecord={setSelectedRecord} 
                lang={lang} 
              />
            )}

            {activeAdminTab === 'messages' && (
              <MessagesStream 
                messages={messages} 
                onViewConversation={(cid, mid) => {
                  setTargetConversationId(cid);
                  setTargetMessageId(mid || null);
                  setActiveAdminTab('conversations');
                }} 
                lang={lang} 
              />
            )}

            {activeAdminTab === 'feedback' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-3xs space-y-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center text-xs font-semibold">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={lang === 'ar' ? 'ابحث في الأسئلة أو الأجوبة...' : 'Search records...'}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    <select 
                      value={filterRating}
                      onChange={(e) => setFilterRating(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="all">كل التقييمات (👍 / 👎)</option>
                      <option value="positive">👍 إيجابي (Positive)</option>
                      <option value="negative">👎 سلبي (Negative)</option>
                    </select>

                    <select 
                      value={filterIssue}
                      onChange={(e) => setFilterIssue(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="all">كل تصنيفات الأخطاء</option>
                      {Object.entries(ISSUE_LABELS_AR).map(([k, v]) => (
                        <option key={k} value={k}>{lang === 'ar' ? v : ISSUE_LABELS_EN[k]}</option>
                      ))}
                    </select>

                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="all">كل حالات المراجعة</option>
                      {Object.entries(STATUS_LABELS_AR).map(([k, v]) => (
                        <option key={k} value={k}>{lang === 'ar' ? v : STATUS_LABELS_EN[k]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredFeedbacks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-12 text-center">{lang === 'ar' ? 'لا توجد تقييمات مطابقة للفلاتر النشطة.' : 'No evaluations match your search'}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60 shadow-3xs">
                    <table className="w-full text-start text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="p-3 text-start">{lang === 'ar' ? 'التقييم' : 'Rating'}</th>
                          <th className="p-3 text-start">{lang === 'ar' ? 'سؤال العميل' : 'User Query'}</th>
                          <th className="p-3 text-start">{lang === 'ar' ? 'رد المساعد' : 'Assistant Response'}</th>
                          <th className="p-3 text-start">{lang === 'ar' ? 'تصنيف المشكلة' : 'Issue'}</th>
                          <th className="p-3 text-start">{lang === 'ar' ? 'حالة المراجعة' : 'Review Status'}</th>
                          <th className="p-3 text-start">{lang === 'ar' ? 'التوقيت والتاريخ' : 'Time'}</th>
                          <th className="p-3 text-center">{lang === 'ar' ? 'محادثة التقييم كاملة' : 'Full Thread'}</th>
                          <th className="p-3 text-end">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredFeedbacks.map((f) => (
                          <tr 
                            key={f.id}
                            onClick={() => setSelectedRecord(f)}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                          >
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] inline-flex items-center gap-1 ${isPositive(f.rating) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {isPositive(f.rating) ? '👍 إيجابي' : '👎 سلبي'}
                              </span>
                            </td>
                            <td className="p-3 truncate max-w-[180px] font-bold text-slate-800" dir="auto">{f.userQuery}</td>
                            <td className="p-3 truncate max-w-[280px] text-slate-500" dir="auto">{f.assistantResponse}</td>
                            <td className="p-3 whitespace-nowrap text-[#C29F5D]">{lang === 'ar' ? (ISSUE_LABELS_AR[f.issueType || 'none'] || f.issueType || 'بدون مشكلة') : (ISSUE_LABELS_EN[f.issueType || 'none'] || f.issueType || 'No Issue')}</td>
                            <td className="p-3 whitespace-nowrap text-slate-700">{lang === 'ar' ? (STATUS_LABELS_AR[f.reviewStatus || 'new'] || f.reviewStatus || 'جديد 🆕') : (STATUS_LABELS_EN[f.reviewStatus || 'new'] || f.reviewStatus || 'New 🆕')}</td>
                            <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                              {f.timestamp?.seconds ? new Date(f.timestamp.seconds * 1000).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US') : 'Now'}
                            </td>
                            <td className="p-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setTargetConversationId(f.conversationId);
                                  setTargetMessageId(f.messageId);
                                  setActiveAdminTab('conversations');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-[#2D4B3A] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <MessageSquare className="w-3 h-3 text-[#C29F5D]" />
                                <span>{lang === 'ar' ? 'محادثة التقييم كاملة' : 'Full Thread'}</span>
                              </button>
                            </td>
                            <td className="p-3 whitespace-nowrap text-end" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteRecord(f.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title={lang === 'ar' ? 'حذف من Firestore' : 'Delete from Firestore'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeAdminTab === 'products' && <ProductAnalytics records={feedbacks} lang={lang} />}
            {activeAdminTab === 'usage' && (
              <UsageAnalytics 
                records={feedbacks} 
                messages={messages} 
                onViewConversation={(cid) => {
                  setTargetConversationId(cid);
                  setActiveAdminTab('conversations');
                }}
                lang={lang} 
              />
            )}
            {activeAdminTab === 'models' && (
              <UsageAnalytics 
                records={feedbacks} 
                messages={messages} 
                onViewConversation={(cid) => {
                  setTargetConversationId(cid);
                  setActiveAdminTab('conversations');
                }}
                lang={lang} 
              />
            )}
            {activeAdminTab === 'performance' && <AdminPerformance records={feedbacks} lang={lang} />}
            {activeAdminTab === 'offers' && <AdminOffers records={feedbacks} lang={lang} />}
            {activeAdminTab === 'issues' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/50 shadow-3xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      {lang === 'ar' ? 'الردود التي تحتاج مراجعة (👎 التقييمات السلبية)' : 'Disliked Responses'}
                    </h3>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      {dislikesCount} {lang === 'ar' ? 'سجل' : 'cases'}
                    </span>
                  </div>
                  {feedbacks.filter(f => isNegative(f.rating)).length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">{lang === 'ar' ? 'لا توجد تقييمات سلبية مسجلة حتى الآن!' : 'No dislike ratings logged yet!'}</p>
                  ) : (
                    <div className="space-y-3">
                      {feedbacks.filter(f => isNegative(f.rating)).map((f) => (
                        <div 
                          key={f.id}
                          onClick={() => setSelectedRecord(f)}
                          className="p-3 bg-rose-50/20 hover:bg-rose-50/40 rounded-xl border border-rose-100/50 flex items-center justify-between transition-all cursor-pointer text-xs"
                        >
                          <div className="space-y-1 truncate max-w-[75%]">
                            <h4 className="font-bold text-slate-800 truncate" dir="auto">"{f.userQuery}"</h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="text-[#C29F5D] font-bold">{ISSUE_LABELS_AR[f.issueType || 'none']}</span>
                              <span>·</span>
                              <span className="font-mono text-slate-400">Model: {f.modelUsed}</span>
                            </div>
                          </div>
                          <span className="text-[9px] bg-white text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 font-bold">
                            {STATUS_LABELS_AR[f.reviewStatus || 'new']}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/50 shadow-3xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{lang === 'ar' ? 'تكرار المشاكل والأعطال' : 'Common Issues Classified'}</h3>
                  </div>
                  {Object.keys(issueBreakdown).length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">{lang === 'ar' ? 'لا توجد أخطاء مصنفة حالياً.' : 'No errors categorized yet.'}</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(issueBreakdown).map(([issue, count]) => (
                        <div key={issue} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">{lang === 'ar' ? ISSUE_LABELS_AR[issue] : ISSUE_LABELS_EN[issue]}</span>
                            <span className="font-mono text-[#C29F5D]">{count}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#C29F5D] h-full transition-all"
                              style={{ width: `${Math.min(100, (count / (dislikesCount || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeAdminTab === 'reports' && <AdminReports records={feedbacks} lang={lang} />}
            {activeAdminTab === 'settings' && <AdminSettings lang={lang} />}

          </main>

        </div>
      )}

      {/* RECORD MODAL OVERLAY */}
      {selectedRecord && (
        <RecordModal 
          record={selectedRecord}
          allMessages={messages}
          allFeedbacks={feedbacks}
          onClose={() => setSelectedRecord(null)}
          onDelete={handleDeleteRecord}
          onOpenFullConversation={(cid, mid) => {
            setSelectedRecord(null);
            setTargetConversationId(cid);
            setTargetMessageId(mid || null);
            setActiveAdminTab('conversations');
          }}
          onUpdateStatus={(id, issue, status) => handleUpdateRecordFields(id, { issueType: issue, reviewStatus: status as any })}
          lang={lang}
        />
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200/50 py-6 px-6 text-center text-xs text-slate-400">
        <p>{lang === 'ar' ? 'مركز مراقبة وتحليلات جودة مساعد مدهال الطيب © 2026. كافة الحقوق محفوظة للمشرفين.' : 'Medhal Quality Assurance & Analytics Suite © 2026. All rights reserved.'}</p>
      </footer>

    </div>
  );
}
