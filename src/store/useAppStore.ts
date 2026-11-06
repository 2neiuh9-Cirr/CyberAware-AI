import { create } from 'zustand';
import type { ScanType, ScanResult, ScamReport, ScamScenario, Course, User } from '../types';
import { api, json, HttpError } from '../api';

interface AppStore {
  activeTab: ScanType; searchQuery: string; isScanning: boolean; scanResult: ScanResult | null;
  scanHistory: ScanResult[]; nextScanCursor: string | null; reports: ScamReport[]; scenarios: ScamScenario[]; courses: Course[];
  overview: any; personalStats: any; error: string | null; loading: boolean; authReady: boolean;
  isMobileMenuOpen: boolean; isReportModalOpen: boolean; selectedScenario: ScamScenario | null;
  completedCourseIds: string[]; lessonProgress: { courseId: string; lessonId: string; completedAt: string }[];
  currentUser: User | null;
  initialize: () => Promise<void>; refreshPersonal: () => Promise<void>; refreshOverview: () => Promise<void>;
  loadHistory: (more?: boolean) => Promise<void>; openScan: (id: string) => Promise<void>;
  setError: (error: string | null) => void; expireSession: () => void;
  setActiveTab: (tab: ScanType) => void; setSearchQuery: (query: string) => void;
  runScan: (customQuery?: string, customType?: ScanType) => Promise<void>; clearScan: () => void;
  setMobileMenuOpen: (open: boolean) => void; setReportModalOpen: (open: boolean) => void;
  setSelectedScenario: (scenario: ScamScenario | null) => Promise<void>;
  submitReport: (report: Pick<ScamReport, 'type' | 'target' | 'category' | 'description'>) => Promise<boolean>;
  voteReport: (reportId: string) => Promise<void>; completeLesson: (courseId: string, lessonId: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; error?: string }>;
  registerUser: (fullname: string, email: string, password: string) => Promise<{ success: boolean; error?: string; expiresInSeconds?: number; deliveryMode?: 'email' | 'local' }>;
  logout: () => Promise<void>;
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
let sessionGeneration = 0;
export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'url', searchQuery: '', isScanning: false, scanResult: null, scanHistory: [], nextScanCursor: null,
  reports: [], scenarios: [], courses: [], overview: null, personalStats: null, error: null, loading: true, authReady: false,
  isMobileMenuOpen: false, isReportModalOpen: false, selectedScenario: null, completedCourseIds: [], lessonProgress: [], currentUser: null,
  setError: error => set({ error }),
  expireSession: () => { sessionGeneration++; set({ currentUser: null, scanHistory: [], nextScanCursor: null, completedCourseIds: [], lessonProgress: [], personalStats: null, scanResult: null }); },
  initialize: async () => {
    set({ loading: true, error: null });
    const generation = sessionGeneration;
    const results = await Promise.allSettled([
      api('/scenarios?pageSize=100').then(data => set({ scenarios: data.items })),
      api('/courses?pageSize=100').then(data => set({ courses: data.items })),
      api('/reports').then(data => set({ reports: data.items })),
      get().refreshOverview(),
      api('/me').then(async data => { if (generation !== sessionGeneration) return; set({ currentUser: data.user }); await get().refreshPersonal(); }).catch(error => { if (!(error instanceof HttpError && error.status === 401)) throw error; }),
    ]);
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') set({ error: message(failed.reason) });
    set({ loading: false, authReady: true });
  },
  refreshOverview: async () => { const data = await api('/stats/overview'); set({ overview: data }); },
  refreshPersonal: async () => {
    if (!get().currentUser) return;
    const generation = sessionGeneration;
    const [progress, stats, history] = await Promise.all([api('/me/learning-progress'), api('/me/stats'), api('/scans')]);
    if (generation === sessionGeneration) set({ ...progress, personalStats: stats, scanHistory: history.items, nextScanCursor: history.nextCursor });
  },
  loadHistory: async (more = false) => {
    const generation = sessionGeneration;
    try { const data = await api(`/scans${more && get().nextScanCursor ? `?cursor=${get().nextScanCursor}` : ''}`); if (generation === sessionGeneration) set({ scanHistory: more ? [...get().scanHistory, ...data.items] : data.items, nextScanCursor: data.nextCursor }); }
    catch (error) { set({ error: message(error) }); }
  },
  openScan: async id => { try { set({ scanResult: await api(`/scans/${encodeURIComponent(id)}`) }); } catch (error) { set({ error: message(error) }); } },
  setActiveTab: activeTab => set({ activeTab }), setSearchQuery: searchQuery => set({ searchQuery }),
  runScan: async (customQuery, customType) => {
    if (get().isScanning) return;
    const query = (customQuery ?? get().searchQuery).trim(); const type = customType ?? get().activeTab;
    if (!query) return;
    const generation = sessionGeneration;
    set({ isScanning: true, scanResult: null, error: null });
    try {
      const result = await api<ScanResult>('/analyze', json('POST', { type, query }));
      if (generation === sessionGeneration) set({ scanResult: result, searchQuery: query });
      await get().refreshOverview(); if (get().currentUser) await get().refreshPersonal();
    } catch (error) { set({ error: message(error) }); }
    finally { set({ isScanning: false }); }
  },
  clearScan: () => set({ scanResult: null, searchQuery: '' }),
  setMobileMenuOpen: isMobileMenuOpen => set({ isMobileMenuOpen }),
  setReportModalOpen: isReportModalOpen => set({ isReportModalOpen }),
  setSelectedScenario: async scenario => {
    if (!scenario) { set({ selectedScenario: null }); return; }
    try { set({ selectedScenario: await api(`/scenarios/${encodeURIComponent(scenario.id)}`) }); }
    catch (error) { set({ error: message(error) }); }
  },
  submitReport: async report => {
    set({ error: null });
    try { await api('/report', json('POST', report)); if (get().currentUser) await get().refreshPersonal(); window.dispatchEvent(new Event('cyberaware-reports-changed')); return true; }
    catch (error) { set({ error: message(error) }); return false; }
  },
  voteReport: async id => {
    try { await api(`/reports/${encodeURIComponent(id)}/votes`, json('POST')); window.dispatchEvent(new Event('cyberaware-reports-changed')); }
    catch (error) { set({ error: message(error) }); }
  },
  completeLesson: async (courseId, lessonId) => {
    try { const data = await api(`/me/learning-progress/${encodeURIComponent(courseId)}`, json('PUT', { lessonId, completion: true })); set(data); await get().refreshPersonal(); return { ok: true }; }
    catch (error) { return { ok: false, error: message(error) }; }
  },
  login: async (email, password, remember) => {
    try { const data = await api('/auth/login', json('POST', { email, password, remember })); sessionGeneration++; set({ currentUser: data.user, error: null }); await get().refreshPersonal().catch(error => set({ error: message(error) })); return { success: true }; }
    catch (error) { return { success: false, error: message(error) }; }
  },
  registerUser: async (fullname, email, password) => {
    try { const data = await api('/auth/register', json('POST', { fullname, email, password })); return { success: true, expiresInSeconds: data.expiresInSeconds, deliveryMode: data.deliveryMode }; }
    catch (error) { return { success: false, error: message(error) }; }
  },
  logout: async () => {
    try { await api('/auth/logout', json('POST')); get().expireSession(); set({ error: null }); }
    catch (error) { set({ error: message(error) }); }
  },
}));
