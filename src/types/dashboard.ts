export interface Product {
  productId: string;
  name: string;
  type: string;
  weight: string;
  price: string;
  link: string;
  image: string;
  available?: boolean;
}

export interface Diagnostics {
  modelUsed: string;
  latency?: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  fallback?: boolean;
  retry?: number;
  error?: string;
}

export interface FeedbackRecord {
  id: string;
  conversationId: string;
  messageId: string;
  userQuery: string;
  assistantResponse: string;
  assistantReply?: string;
  modelUsed: string;
  rating: 'positive' | 'negative' | 'like' | 'dislike';
  timestamp: any;
  issueType?: string;
  reviewStatus?: 'new' | 'reviewing' | 'fixed' | 'ignored';
  products?: Product[];
  productCards?: Product[];
  diagnostics?: Diagnostics;
  context?: Record<string, any>;
}

export interface FirestoreMessage {
  id: string;
  conversationId: string;
  messageId?: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: any;
  modelUsed?: string;
  products?: Product[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  conversationId: string;
  products?: Product[];
  diagnostics?: Diagnostics;
  feedbackId?: string;
  rating?: 'positive' | 'negative' | null;
}

export interface UnifiedMessage {
  id: string;
  messageId?: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date | null;
  modelUsed?: string;
  products?: Product[];
  rating?: 'positive' | 'negative' | null;
  issueType?: string;
  feedbackRecord?: FeedbackRecord;
}

export interface UnifiedThread {
  conversationId: string;
  clientIndex?: number;
  clientLabel?: string;
  startTime: Date | null;
  lastTime: Date | null;
  messageCount: number;
  userMessageCount?: number;
  assistantMessageCount?: number;
  firstUserQuery?: string;
  messages: UnifiedMessage[];
  hasNegative: boolean;
  hasPositive: boolean;
  latestRating?: 'positive' | 'negative';
}
