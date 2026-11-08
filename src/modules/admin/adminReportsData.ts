import { api } from '../../api';
import type { ScanType } from '../../types';

export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'unverified';
export type AdminReport = {
  id: string; type: ScanType; target: string; category: string; description: string;
  status: ReportStatus; reason: string; hidden: boolean; reportedAt: string;
  reporterName: string; reporterEmail: string; votes: number;
};
export type Summary = { total: number; pending: number; approved: number; rejected: number; hidden: number };
export type ReportPageData = { items: AdminReport[]; total: number; page: number; pageSize: number; summary: Summary };

const cacheLifetime = 30_000;
let cached: { userId: string; data: ReportPageData; expiresAt: number } | null = null;
let inFlight: { userId: string; promise: Promise<ReportPageData> } | null = null;

export function cachedAdminReports(userId: string): ReportPageData | null {
  return cached?.userId === userId && cached.expiresAt > Date.now() ? cached.data : null;
}

export function invalidateAdminReports() {
  cached = null;
  inFlight = null;
}

export function prefetchAdminReports(userId: string, force = false): Promise<ReportPageData> {
  if (!force) {
    const hit = cachedAdminReports(userId);
    if (hit) return Promise.resolve(hit);
    if (inFlight?.userId === userId) return inFlight.promise;
  }
  const promise = api<ReportPageData>('/admin/reports?page=1&pageSize=12&status=all&visibility=all&q=')
    .then(data => {
      if (inFlight?.promise === promise) cached = { userId, data, expiresAt: Date.now() + cacheLifetime };
      return data;
    })
    .finally(() => { if (inFlight?.promise === promise) inFlight = null; });
  inFlight = { userId, promise };
  return promise;
}
