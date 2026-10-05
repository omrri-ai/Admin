import { FeedbackRecord, FirestoreMessage, UnifiedThread, UnifiedMessage } from '../types/dashboard';

export const isPositive = (rating?: string | null) => rating === 'positive' || rating === 'like';
export const isNegative = (rating?: string | null) => rating === 'negative' || rating === 'dislike';

export const getRecordTimestamp = (record: { timestamp?: any }): Date | null => {
  if (!record || !record.timestamp) return null;
  if (record.timestamp.seconds) return new Date(record.timestamp.seconds * 1000);
  if (record.timestamp instanceof Date) return record.timestamp;
  const parsed = new Date(record.timestamp);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Safe deduplication: keep only the latest record for each conversationId + messageId
export const deduplicateFeedbacks = (records: FeedbackRecord[]): FeedbackRecord[] => {
  const map = new Map<string, FeedbackRecord>();
  for (const r of records) {
    const key = `${r.conversationId || 'unknown'}_${r.messageId || r.id}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      const timeNew = getRecordTimestamp(r)?.getTime() || 0;
      const timeOld = getRecordTimestamp(existing)?.getTime() || 0;
      if (timeNew > timeOld) {
        map.set(key, r);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = getRecordTimestamp(a)?.getTime() || 0;
    const timeB = getRecordTimestamp(b)?.getTime() || 0;
    return timeB - timeA;
  });
};

// Group records and messages into unified conversation threads per customer
export const buildUnifiedThreads = (
  feedbacks: FeedbackRecord[], 
  messages: FirestoreMessage[] = []
): UnifiedThread[] => {
  const threadsMap = new Map<string, UnifiedThread>();

  // 1. Process messages from the messages collection
  const messagesByConv = new Map<string, FirestoreMessage[]>();
  for (const msg of messages) {
    const cid = msg.conversationId || 'unassigned';
    if (!messagesByConv.has(cid)) messagesByConv.set(cid, []);
    messagesByConv.get(cid)!.push(msg);
  }

  // 2. Map feedbacks by conversationId
  const feedbacksByConv = new Map<string, FeedbackRecord[]>();
  for (const fb of feedbacks) {
    const cid = fb.conversationId || 'unassigned';
    if (!feedbacksByConv.has(cid)) feedbacksByConv.set(cid, []);
    feedbacksByConv.get(cid)!.push(fb);
  }

  // Gather all unique conversation IDs
  const allConvIds = new Set<string>([...messagesByConv.keys(), ...feedbacksByConv.keys()]);

  for (const cid of allConvIds) {
    const rawMsgs = messagesByConv.get(cid) || [];
    const convFeedbacks = feedbacksByConv.get(cid) || [];

    // Filter out ghost conversations that only have empty test feedback with no user message and no text
    if (rawMsgs.length === 0) {
      const hasRealContent = convFeedbacks.some(f => 
        (f.userQuery && f.userQuery !== 'لم يتوفر سؤال سابق' && f.userQuery.trim().length > 0) ||
        (f.assistantResponse && f.assistantResponse.trim().length > 0) ||
        (f.assistantReply && f.assistantReply.trim().length > 0)
      );
      if (!hasRealContent) {
        continue; // Skip ghost/corrupted test entries
      }
    }

    const unifiedMap = new Map<string, UnifiedMessage>();

    // 1. Add all raw messages from messages collection
    for (const m of rawMsgs) {
      const time = getRecordTimestamp(m);
      const fb = convFeedbacks.find(f => 
        (m.messageId && f.messageId === m.messageId) || 
        (f.id === m.id) ||
        (f.assistantResponse && m.role === 'assistant' && f.assistantResponse.trim() === m.text.trim()) ||
        (f.assistantReply && m.role === 'assistant' && f.assistantReply.trim() === m.text.trim())
      );

      const msgKey = m.messageId || m.id || `${m.role}-${time?.getTime() || Math.random()}`;
      unifiedMap.set(msgKey, {
        id: m.id,
        messageId: m.messageId,
        role: m.role,
        text: m.text,
        timestamp: time,
        modelUsed: m.modelUsed || fb?.modelUsed,
        products: m.products || fb?.products || fb?.productCards,
        rating: fb ? (isPositive(fb.rating) ? 'positive' : isNegative(fb.rating) ? 'negative' : null) : null,
        issueType: fb?.issueType,
        feedbackRecord: fb
      });
    }

    // 2. Add any feedback messages not already captured in raw messages
    for (const fb of convFeedbacks) {
      const fbTime = getRecordTimestamp(fb);
      
      // Check if userQuery already exists in unifiedMap
      const userAlreadyExists = Array.from(unifiedMap.values()).some(
        m => m.role === 'user' && m.text.trim() === (fb.userQuery || '').trim()
      );
      if (!userAlreadyExists && fb.userQuery && fb.userQuery !== 'لم يتوفر سؤال سابق') {
        const userTime = fbTime ? new Date(fbTime.getTime() - 2000) : null;
        const userKey = `fb-user-${fb.id}`;
        unifiedMap.set(userKey, {
          id: userKey,
          role: 'user',
          text: fb.userQuery,
          timestamp: userTime
        });
      }

      // Check if assistant reply already exists in unifiedMap
      const assistantText = fb.assistantResponse || fb.assistantReply || '';
      const assistantAlreadyExists = Array.from(unifiedMap.values()).some(
        m => (fb.messageId && m.messageId === fb.messageId) || 
             (m.role === 'assistant' && assistantText && m.text.trim() === assistantText.trim())
      );
      if (!assistantAlreadyExists && assistantText) {
        const asstKey = fb.messageId || `fb-asst-${fb.id}`;
        unifiedMap.set(asstKey, {
          id: fb.id,
          messageId: fb.messageId,
          role: 'assistant',
          text: assistantText,
          timestamp: fbTime,
          modelUsed: fb.modelUsed,
          products: fb.products || fb.productCards,
          rating: isPositive(fb.rating) ? 'positive' : isNegative(fb.rating) ? 'negative' : null,
          issueType: fb.issueType,
          feedbackRecord: fb
        });
      } else if (assistantAlreadyExists) {
        // Enhance existing message with feedback metadata
        for (const [k, existing] of unifiedMap.entries()) {
          if (
            (fb.messageId && existing.messageId === fb.messageId) ||
            (existing.role === 'assistant' && assistantText && existing.text.trim() === assistantText.trim())
          ) {
            existing.rating = isPositive(fb.rating) ? 'positive' : isNegative(fb.rating) ? 'negative' : existing.rating;
            existing.issueType = fb.issueType || existing.issueType;
            existing.feedbackRecord = fb;
            if (!existing.products && (fb.products || fb.productCards)) {
              existing.products = fb.products || fb.productCards;
            }
          }
        }
      }
    }

    // Sort all messages chronologically with smart conversational priority:
    // If user and assistant have identical or very close timestamps (< 4 seconds),
    // user inquiry comes first, followed by the assistant answer.
    const rawUnifiedList = Array.from(unifiedMap.values());
    rawUnifiedList.sort((a, b) => {
      const tA = a.timestamp?.getTime() || 0;
      const tB = b.timestamp?.getTime() || 0;
      const diff = tA - tB;
      if (Math.abs(diff) < 4000) {
        if (a.role === 'user' && b.role === 'assistant') return -1;
        if (a.role === 'assistant' && b.role === 'user') return 1;
      }
      return diff;
    });

    // Remove immediate duplicate messages with identical text and role
    const unifiedList: UnifiedMessage[] = [];
    for (let i = 0; i < rawUnifiedList.length; i++) {
      const curr = rawUnifiedList[i];
      const prev = unifiedList[unifiedList.length - 1];
      if (prev && prev.role === curr.role && prev.text.trim() === curr.text.trim()) {
        continue;
      }
      unifiedList.push(curr);
    }

    if (unifiedList.length === 0) continue;

    const hasNegative = convFeedbacks.some(f => isNegative(f.rating)) || unifiedList.some(m => m.rating === 'negative');
    const hasPositive = convFeedbacks.some(f => isPositive(f.rating)) || unifiedList.some(m => m.rating === 'positive');
    const latestRating = convFeedbacks[convFeedbacks.length - 1]?.rating;
    const userMsgs = unifiedList.filter(m => m.role === 'user');
    const asstMsgs = unifiedList.filter(m => m.role === 'assistant');
    const firstUserQuery = userMsgs[0]?.text || convFeedbacks[0]?.userQuery || '';

    threadsMap.set(cid, {
      conversationId: cid,
      startTime: unifiedList[0]?.timestamp || null,
      lastTime: unifiedList[unifiedList.length - 1]?.timestamp || null,
      messageCount: unifiedList.length,
      userMessageCount: userMsgs.length,
      assistantMessageCount: asstMsgs.length,
      firstUserQuery,
      messages: unifiedList,
      hasNegative,
      hasPositive,
      latestRating: isPositive(latestRating) ? 'positive' : isNegative(latestRating) ? 'negative' : undefined
    });
  }

  const sortedThreads = Array.from(threadsMap.values()).sort(
    (a, b) => (b.lastTime?.getTime() || 0) - (a.lastTime?.getTime() || 0)
  );

  // Assign clean client index & label to each customer session
  sortedThreads.forEach((thread, idx) => {
    thread.clientIndex = idx + 1;
    thread.clientLabel = `العميل #${idx + 1}`;
  });

  return sortedThreads;
};

// Realistic Token Estimation & Calculation Engine
// In Arabic, Gemini tokenizer averages ~1 token per ~2.8 Arabic characters.
// Medhal Assistant system prompt + product catalog context is ~1,400 input tokens.
const SYSTEM_PROMPT_TOKENS = 1400;

export interface TokenMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  grandTotalTokens: number;
  explicitLoggedTokens: number;
  estimatedCalculatedTokens: number;
  totalCostUSD: number;
  totalCostSAR: number;
  avgTokensPerInteraction: number;
  conversationsBreakdown: {
    conversationId: string;
    clientIndex?: number;
    clientLabel?: string;
    firstQuery?: string;
    messageCount: number;
    userMessageCount?: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUSD: number;
    costSAR: number;
    lastTime: Date | null;
  }[];
}

export const calculateRealisticTokens = (
  feedbacks: FeedbackRecord[], 
  messages: FirestoreMessage[] = []
): TokenMetrics => {
  const threads = buildUnifiedThreads(feedbacks, messages);
  
  let totalInput = 0;
  let totalOutput = 0;
  let explicitTokens = 0;
  let calculatedTokens = 0;

  const convBreakdown: TokenMetrics['conversationsBreakdown'] = [];

  for (const thread of threads) {
    let convInput = 0;
    let convOutput = 0;

    let cumulativeUserChars = 0;

    for (const msg of thread.messages) {
      if (msg.role === 'user') {
        cumulativeUserChars += msg.text.length;
      } else if (msg.role === 'assistant') {
        const fb = msg.feedbackRecord;
        const diagTu = fb?.diagnostics?.tokenUsage;

        if (diagTu?.promptTokens && diagTu?.completionTokens) {
          convInput += diagTu.promptTokens;
          convOutput += diagTu.completionTokens;
          explicitTokens += (diagTu.totalTokens || (diagTu.promptTokens + diagTu.completionTokens));
        } else {
          // Realistic calculation
          // Input: System context (~1400 tokens) + cumulative user queries length
          const promptEst = SYSTEM_PROMPT_TOKENS + Math.round(cumulativeUserChars / 2.8);
          
          // Output: Response characters + product cards payload
          const respChars = msg.text.length;
          const productCardsCount = (msg.products || []).length;
          const outputEst = Math.round(respChars / 2.6) + (productCardsCount * 90);

          convInput += promptEst;
          convOutput += outputEst;
          calculatedTokens += (promptEst + outputEst);
        }
      }
    }

    const convTotal = convInput + convOutput;
    // Pricing for Gemini Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
    const convCostUSD = (convInput * 0.000000075) + (convOutput * 0.00000030);
    const convCostSAR = convCostUSD * 3.75;

    convBreakdown.push({
      conversationId: thread.conversationId,
      clientIndex: thread.clientIndex,
      clientLabel: thread.clientLabel,
      firstQuery: thread.firstUserQuery,
      messageCount: thread.messages.length,
      userMessageCount: thread.userMessageCount,
      inputTokens: convInput,
      outputTokens: convOutput,
      totalTokens: convTotal,
      costUSD: convCostUSD,
      costSAR: convCostSAR,
      lastTime: thread.lastTime
    });

    totalInput += convInput;
    totalOutput += convOutput;
  }

  const grandTotal = totalInput + totalOutput;
  const totalCostUSD = (totalInput * 0.000000075) + (totalOutput * 0.00000030);
  const totalCostSAR = totalCostUSD * 3.75;
  const totalInteractions = threads.reduce((acc, t) => acc + t.messages.filter(m => m.role === 'assistant').length, 0) || 1;

  convBreakdown.sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    grandTotalTokens: grandTotal,
    explicitLoggedTokens: explicitTokens,
    estimatedCalculatedTokens: calculatedTokens,
    totalCostUSD,
    totalCostSAR,
    avgTokensPerInteraction: Math.round(grandTotal / totalInteractions),
    conversationsBreakdown: convBreakdown
  };
};

// Intent keyword automated clustering
export const analyzeCommonIntents = (records: FeedbackRecord[]) => {
  const categories: Record<string, { label: string; count: number; items: FeedbackRecord[] }> = {
    maroki: { label: 'استفسارات العود المروكي', count: 0, items: [] },
    trad: { label: 'استفسارات دهن تراد المعتق', count: 0, items: [] },
    kalimantan: { label: 'استفسارات بخور كليمنتان', count: 0, items: [] },
    musk: { label: 'استفسارات المسك الخاص', count: 0, items: [] },
    prices: { label: 'استفسار عن الأسعار والأوزان', count: 0, items: [] },
    unsupported: { label: 'سؤال عن منتجات غير متوفرة (مثل الزعفران/عطور)', count: 0, items: [] },
    general: { label: 'استفسارات عامة وترحيب', count: 0, items: [] },
  };

  records.forEach(r => {
    const text = (r.userQuery || '').toLowerCase();
    if (text.includes('مروكي')) {
      categories.maroki.count++;
      categories.maroki.items.push(r);
    } else if (text.includes('تراد')) {
      categories.trad.count++;
      categories.trad.items.push(r);
    } else if (text.includes('كليمنتان')) {
      categories.kalimantan.count++;
      categories.kalimantan.items.push(r);
    } else if (text.includes('مسك')) {
      categories.musk.count++;
      categories.musk.items.push(r);
    } else if (text.includes('سعر') || text.includes('بكم') || text.includes('أوقية') || text.includes('تولة')) {
      categories.prices.count++;
      categories.prices.items.push(r);
    } else if (text.includes('زعفران') || text.includes('عطر') || text.includes('شنط')) {
      categories.unsupported.count++;
      categories.unsupported.items.push(r);
    } else {
      categories.general.count++;
      categories.general.items.push(r);
    }
  });

  return Object.values(categories).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
};

// Export to CSV with UTF-8 BOM
export const exportRecordsToCSV = (records: FeedbackRecord[], filename: string = 'medhal_feedbacks.csv') => {
  const headers = [
    'Conversation ID',
    'Message ID',
    'User Query',
    'Assistant Response',
    'Rating',
    'Model Used',
    'Timestamp',
    'Latency (ms)',
    'Prompt Tokens',
    'Completion Tokens',
    'Products Shown'
  ];

  const rows = records.map(r => [
    `"${(r.conversationId || '').replace(/"/g, '""')}"`,
    `"${(r.messageId || '').replace(/"/g, '""')}"`,
    `"${(r.userQuery || '').replace(/"/g, '""')}"`,
    `"${(r.assistantResponse || r.assistantReply || '').replace(/"/g, '""')}"`,
    isPositive(r.rating) ? 'Positive' : isNegative(r.rating) ? 'Negative' : 'Unrated',
    `"${(r.modelUsed || 'Unspecified').replace(/"/g, '""')}"`,
    getRecordTimestamp(r)?.toISOString() || 'N/A',
    r.diagnostics?.latency ?? 'N/A',
    r.diagnostics?.tokenUsage?.promptTokens ?? 'N/A',
    r.diagnostics?.tokenUsage?.completionTokens ?? 'N/A',
    `"${((r.products || r.productCards || []).map(p => p.name).join(' | ')).replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
