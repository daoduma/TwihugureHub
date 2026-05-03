// types/index.ts

export type Role = "FARMER" | "TRAINER" | "ADMIN" | "MBAZA_STAFF";
export type Language = "en" | "fr" | "rw";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  preferredLanguage: Language;
}

export interface NavLink {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  preferredLanguage: Language;
}

export interface LoginFormData {
  email: string;
  password: string;
  preferredLanguage?: Language;
}

// Role display config
export const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  FARMER: "/farmer/dashboard",
  TRAINER: "/trainer/dashboard",
  ADMIN: "/admin/dashboard",
  MBAZA_STAFF: "/mbaza/dashboard",
};

export const SUPPORTED_LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "rw", label: "Kinyarwanda", nativeLabel: "Ikinyarwanda" },
];

// ─── CMS Types ────────────────────────────────────────────────────────────────

export type CourseStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";

export interface MultilingualText {
  en: string;
  fr: string;
  rw: string;
}

export interface LessonAttachment {
  id: string;
  lessonId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: Date;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: MultilingualText;
  body: MultilingualText;
  videoUrl?: string | null;
  audioUrl?: string | null;
  imageUrls: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
  attachments?: LessonAttachment[];
}

export interface Module {
  id: string;
  courseId: string;
  title: MultilingualText;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  title: MultilingualText;
  description: MultilingualText;
  trainerId: string;
  status: CourseStatus;
  thumbnailUrl?: string | null;
  availableLanguages: string[];
  createdAt: Date;
  updatedAt: Date;
  modules?: Module[];
  trainer?: { id: string; name: string; email: string };
  _count?: { modules: number };
}

export interface TrainerStats {
  totalCourses: number;
  publishedCourses: number;
  pendingApproval: number;
  totalEnrolledFarmers: number;
}

// ─── Quiz Types ───────────────────────────────────────────────────────────────

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
export type TranslationStatusValue = "MANUAL" | "AI" | "PENDING";

export interface TranslationStatus {
  en: TranslationStatusValue;
  fr: TranslationStatusValue;
  rw: TranslationStatusValue;
}

export interface AnswerOption {
  id: string;
  questionId: string;
  text: MultilingualText;
  isCorrect: boolean;
  order: number;
}

export interface QuestionFeedback {
  id: string;
  questionId: string;
  correctFeedback: MultilingualText;
  incorrectFeedback: MultilingualText;
}

export interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  stem: MultilingualText;
  order: number;
  translationStatus: TranslationStatus;
  options: AnswerOption[];
  feedback?: QuestionFeedback;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: MultilingualText;
  passingScore: number;
  allowRetry: boolean;
  questions: Question[];
}
