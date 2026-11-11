import { z } from 'zod';

export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum AuditStatus {
  QUEUED = 'QUEUED',
  DISCOVERING = 'DISCOVERING',
  CRAWLING = 'CRAWLING',
  TESTING = 'TESTING',
  ANALYZING = 'ANALYZING',
  REPORTING = 'REPORTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
}

export enum IssueSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFORMATIONAL = 'INFORMATIONAL',
}

export enum IssueCategory {
  FUNCTIONAL = 'FUNCTIONAL',
  BROKEN_LINK = 'BROKEN_LINK',
  SEO = 'SEO',
  PERFORMANCE = 'PERFORMANCE',
  ACCESSIBILITY = 'ACCESSIBILITY',
  RESPONSIVE = 'RESPONSIVE',
  SECURITY_CONFIGURATION = 'SECURITY_CONFIGURATION',
  NETWORK = 'NETWORK',
  RESOURCE = 'RESOURCE',
  CONTENT = 'CONTENT',
}

export enum IssueStatus {
  NEW = 'NEW',
  PERSISTENT = 'PERSISTENT',
  RESOLVED = 'RESOLVED',
  REOPENED = 'REOPENED',
  CHANGED = 'CHANGED',
  UNVERIFIED = 'UNVERIFIED',
}

export enum InteractionOutcome {
  NAVIGATION = 'NAVIGATION',
  MODAL_OPENED = 'MODAL_OPENED',
  DRAWER_OPENED = 'DRAWER_OPENED',
  DROPDOWN_OPENED = 'DROPDOWN_OPENED',
  ACCORDION_EXPANDED = 'ACCORDION_EXPANDED',
  DOWNLOAD_STARTED = 'DOWNLOAD_STARTED',
  API_ACTION = 'API_ACTION',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  NO_OBSERVABLE_CHANGE = 'NO_OBSERVABLE_CHANGE',
  CLICK_FAILED = 'CLICK_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export enum NetworkErrorType {
  CLIENT_ERROR = 'CLIENT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  TIMEOUT = 'TIMEOUT',
  CORS_ERROR = 'CORS_ERROR',
  THIRD_PARTY_FAILURE = 'THIRD_PARTY_FAILURE',
  UNKNOWN = 'UNKNOWN',
}

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// -------------------------------------------------------------
// Zod Schemas for Validation
// -------------------------------------------------------------

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const CreateWebsiteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid HTTP or HTTPS URL'),
  description: z.string().optional(),
  category: z.string().optional(),
  maxPages: z.number().int().min(1).max(500).default(50),
  maxDepth: z.number().int().min(1).max(10).default(3),
  frequency: z.nativeEnum(ScheduleFrequency).default(ScheduleFrequency.WEEKLY),
});
export type CreateWebsiteDto = z.infer<typeof CreateWebsiteSchema>;

export const UpdateWebsiteSchema = CreateWebsiteSchema.partial();
export type UpdateWebsiteDto = z.infer<typeof UpdateWebsiteSchema>;

export const TriggerAuditSchema = z.object({
  maxPages: z.number().int().min(1).max(500).optional(),
  maxDepth: z.number().int().min(1).max(10).optional(),
  testInteractions: z.boolean().default(true),
  testPerformance: z.boolean().default(true),
  testAccessibility: z.boolean().default(true),
});
export type TriggerAuditDto = z.infer<typeof TriggerAuditSchema>;

export const IssueFilterSchema = z.object({
  websiteId: z.string().optional(),
  auditId: z.string().optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  category: z.nativeEnum(IssueCategory).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type IssueFilterDto = z.infer<typeof IssueFilterSchema>;

export const AIExplanationSchema = z.object({
  summary: z.string(),
  businessImpact: z.string(),
  recommendation: z.string(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
});
export type AIExplanation = z.infer<typeof AIExplanationSchema>;

export const AIExecutiveSummarySchema = z.object({
  executiveSummary: z.string(),
  criticalObservations: z.array(z.string()),
  actionPlan: z.array(
    z.object({
      step: z.number(),
      action: z.string(),
      expectedImpact: z.string(),
    })
  ),
});
export type AIExecutiveSummary = z.infer<typeof AIExecutiveSummarySchema>;

export interface NormalizedIssue {
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  confidence: number;
  affectedUrl: string;
  elementSelector?: string;
  evidence: Record<string, any>;
  recommendedFix: string;
  issueFingerprint: string;
}

export interface ProgressUpdate {
  auditId: string;
  status: AuditStatus;
  progressPercent: number;
  currentStep: string;
  pagesCrawled: number;
  issuesFound: number;
  timestamp: string;
}

