// lib/utils.ts
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(date: Date | string, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Map roles to their readable display name key (used with i18n)
export function getRoleI18nKey(role: string): string {
  const map: Record<string, string> = {
    FARMER: "roles.farmer",
    TRAINER: "roles.trainer",
    ADMIN: "roles.admin",
    MBAZA_STAFF: "roles.mbazaStaff",
  };
  return map[role] ?? role;
}
