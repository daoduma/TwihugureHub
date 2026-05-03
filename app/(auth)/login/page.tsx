// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn, Sprout } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { cn } from "@/lib/utils";


export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        if (result.error.includes("deactivated")) {
          setError(t("auth.login.accountDeactivated"));
        } else {
          setError(t("auth.login.invalidCredentials"));
        }
        return;
      }

      if (result?.url) {
        router.push(result.url);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError(t("auth.login.loginError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Card */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-earth-400 to-brand-600" />

        <div className="px-8 py-10">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              {/* Logo */}
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
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                {t("auth.login.title")}
              </h1>
              <p className="mt-1 text-sm text-brand-300">{t("auth.login.subtitle")}</p>
            </div>

            {/* Language switcher — works before login */}
            <LanguageSelector variant="dark" />
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300"
              >
                {t("auth.login.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t("auth.login.emailPlaceholder")}
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3",
                  "text-sm text-white placeholder-brand-600",
                  "transition-all duration-150",
                  "focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                  "disabled:opacity-50"
                )}
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-300"
              >
                {t("auth.login.passwordLabel")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder={t("auth.login.passwordPlaceholder")}
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3 pr-11",
                    "text-sm text-white placeholder-brand-600",
                    "transition-all duration-150",
                    "focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                    "disabled:opacity-50"
                  )}
                  disabled={isLoading}
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !formData.email || !formData.password}
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
                  {t("auth.login.signingIn")}
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  {t("auth.login.submitButton")}
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-brand-500">
            <span>
              {t("auth.login.noAccount")}{" "}
              <Link
                href="/register"
                className="font-semibold text-brand-300 hover:text-brand-200 hover:underline"
              >
                {t("auth.login.registerLink")}
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <p className="mt-6 text-center text-xs text-brand-700">
        {t("app.tagline")}
      </p>
    </div>
  );
}
