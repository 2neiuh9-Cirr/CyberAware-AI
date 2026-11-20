export type ScanType = 'url' | 'sms' | 'phone' | 'bank';

export interface ScanResult {
  id?: string;
  source?: string;
  confidence?: 'limited';
  aiStatus?: 'disabled' | 'available' | 'unavailable';
  query: string;
  type: ScanType;
  riskScore: number;
  level: 'AN_TOAN' | 'CANH_GIAC' | 'NGUY_HIEM';
  title: string;
  flags: string[];
  recommendations: string[];
  scannedAt: string;
  analysisTimeMs: number;
  aiReasoning?: string;
  threatCategory?: string;
  actionAdvice?: string;
    evidenceSources?: Array<{ title: string; sourceName: string; url: string; date: string }>;
}

export interface ScamReport {
  status?: 'pending' | 'approved' | 'rejected' | 'unverified';
  hidden?: boolean;
  votedByMe?: boolean;
  id: string;
  type: ScanType;
  target: string;
  category: string;
  description: string;
  riskScore: number;
  reportedAt: string;
  votes: number;
  verified: boolean;
}

export interface ScamScenario {
  id: string;
  title: string;
  category: string;
  badgeColor: string;
  iconType: 'bank' | 'gift' | 'job' | 'police' | 'phone' | 'deepfake';
  summary: string;
  detailStory: string;
  signs: string;
  victimPsychology: string;
  preventionTips: string[];
  sampleMessage?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'interactive' | 'quiz';
  content?: string;
  quizId?: string;
  completed?: boolean;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  tag: string;
  description: string;
  duration: string;
  lessonsCount: number;
  rating: number;
  learnersCount: number;
  thumbnail: string;
  incidentGuidance?: { title: string; intro: string; steps: string[] };
  modules: CourseLesson[];
}

export interface NationalStats {
  blockedDomainsThisWeek: number;
  totalScansToday: number;
  verifiedCommunityReports: number;
  activeThreatCampaigns: number;
  accuracyRate: number;
  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  level: string;
  phone: string;
  emailVerified: boolean;
  citizenVerified: boolean;
  gmailShieldActive: boolean;
}

export interface ChatSource { kind: string; title: string; url: string; sourceDate?: string }
export interface ChatAttachment { kind: 'image' | 'document'; name: string; mimeType: string; preview?: string }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; sources: ChatSource[]; attachment?: ChatAttachment; deliveryState?: 'sending' | 'failed' }
export interface ChatConversation { id: string; title: string; messageCount: number; messages: ChatMessage[] }
export interface ChatCapabilities { enabled: boolean; imagesEnabled: boolean; limits: { maxImageBytes: number; maxDocumentBytes: number; maxFilesPerTurn: number; maxMessageChars: number; maxUserTokens?: number }; usage: { turnsRemainingToday: number; tokensRemainingToday: number; imagesRemainingToday: number } }
