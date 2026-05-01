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
