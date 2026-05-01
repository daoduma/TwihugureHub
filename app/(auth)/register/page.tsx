// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, UserPlus, Sprout, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { SUPPORTED_LANGUAGES } from "@/types";
import { cn } from "@/lib/utils";
import type { Language } from "@/types";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  preferredLanguage: Language;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    preferredLanguage: "en",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!form.name.trim() || form.name.trim().length < 2) {
      errors.name = t("errors.required");
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = t("errors.invalidEmail");
    }
    if (form.password.length < 8) {
      errors.password = t("errors.passwordTooShort");
    } else if (!/[A-Z]/.test(form.password)) {
      errors.password = t("errors.passwordNeedsUppercase");
    } else if (!/[0-9]/.test(form.password)) {
      errors.password = t("errors.passwordNeedsNumber");
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = t("auth.register.passwordMismatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    if (!validate()) return;

    setServerError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          preferredLanguage: form.preferredLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setServerError(t("auth.register.emailExists"));
        } else {
          setServerError(data.error ?? t("auth.register.registrationError"));
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setServerError(t("auth.register.registrationError"));
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors((p) => ({ ...p, [field]: undefined }));
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md animate-slide-up">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
          <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-earth-400 to-brand-600" />
          <div className="flex flex-col items-center px-8 py-14 text-center">
            <CheckCircle2 className="mb-4 h-14 w-14 text-brand-400" />
            <h2
              className="mb-2 text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("ui.success")}
            </h2>
            <p className="text-sm text-brand-300">{t("auth.register.success")}</p>
            <p className="mt-3 text-xs text-brand-600">{t("ui.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-earth-400 to-brand-600" />

        <div className="px-8 py-10">
          {/* Header */}
          <div className="mb-7 flex items-start justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/40">
                  <Sprout className="h-5 w-5 text-white" />
                </div>
                <span
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  TwihugureHub
                </span>
              </div>
              <h1
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("auth.register.title")}
              </h1>
              <p className="mt-1 text-sm text-brand-300">{t("auth.register.subtitle")}</p>
            </div>
            <LanguageSelector variant="dark" />
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300">
                {t("auth.register.nameLabel")}
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                placeholder={t("auth.register.namePlaceholder")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3",
                  "text-sm text-white placeholder-brand-600 transition-all duration-150",
                  "focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                  fieldErrors.name && "border-red-500/50 focus:border-red-400"
                )}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300">
                {t("auth.register.emailLabel")}
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder={t("auth.register.emailPlaceholder")}
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3",
                  "text-sm text-white placeholder-brand-600 transition-all duration-150",
                  "focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                  fieldErrors.email && "border-red-500/50 focus:border-red-400"
                )}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300">
                {t("auth.register.passwordLabel")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder={t("auth.register.passwordPlaceholder")}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3 pr-11",
                    "text-sm text-white placeholder-brand-600 transition-all duration-150",
                    "focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                    fieldErrors.password && "border-red-500/50 focus:border-red-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-brand-500 hover:text-brand-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300">
                {t("auth.register.confirmPasswordLabel")}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder={t("auth.register.confirmPasswordPlaceholder")}
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3 pr-11",
                    "text-sm text-white placeholder-brand-600 transition-all duration-150",
                    "focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                    fieldErrors.confirmPassword && "border-red-500/50 focus:border-red-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-brand-500 hover:text-brand-300"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Preferred language */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300">
                {t("auth.register.languageLabel")}
              </label>
              <select
                value={form.preferredLanguage}
                onChange={(e) => updateField("preferredLanguage", e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-brand-900 px-4 py-3",
                  "text-sm text-white transition-all duration-150",
                  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                )}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeLabel} — {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl",
                "bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-900/40",
                "transition-all duration-150 hover:bg-brand-500 active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("auth.register.creating")}
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  {t("auth.register.submitButton")}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-brand-500">
            {t("auth.register.hasAccount")}{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-300 hover:text-brand-200 hover:underline"
            >
              {t("auth.register.loginLink")}
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-brand-700">{t("app.tagline")}</p>
    </div>
  );
}
