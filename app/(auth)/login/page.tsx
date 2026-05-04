// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn, Sprout, Leaf, Users, BookOpen } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { cn } from "@/lib/utils";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  ADMIN:       "/admin/dashboard",
  TRAINER:     "/trainer/dashboard",
  FARMER:      "/farmer/dashboard",
  MBAZA_STAFF: "/mbaza/dashboard",
};

// STATS defined inside component to access t()

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
      });

      if (result?.error) {
        if (result.error.includes("deactivated")) {
          setError(t("auth.login.accountDeactivated"));
        } else {
          setError(t("auth.login.invalidCredentials"));
        }
        return;
      }

      const session = await getSession();
      const role = session?.user?.role as string | undefined;
      const destination = callbackUrl ?? (role ? ROLE_DASHBOARD_MAP[role] : null) ?? "/";
      router.push(destination);
      router.refresh();
    } catch {
      setError(t("auth.login.loginError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      {/* ── Left hero panel (hidden on mobile) ── */}
      <aside className="login-hero">
        <div className="hero-logo">
          <div className="logo-icon" style={{overflow:"hidden",padding:0}}>
            <img src="/icons/icon.svg" alt="TwihugureHub" style={{width:"100%",height:"100%",display:"block"}} />
          </div>
          <span className="logo-text">TwihugureHub</span>
        </div>

        <div className="hero-copy">
          <p className="hero-eyebrow">{t("auth.hero.eyebrow")}</p>
          <h2 className="hero-headline">
            {t("auth.hero.headline1")}<br />
            <span className="hero-accent">{t("auth.hero.headline2")}</span>
          </h2>
          <p className="hero-body">{t("auth.hero.body")}</p>
        </div>

        <div className="hero-stats">
          {[
            { icon: Users,    value: "2,400+", labelKey: "auth.hero.stat1Label" },
            { icon: BookOpen, value: "180+",   labelKey: "auth.hero.stat2Label" },
            { icon: Leaf,     value: "30",     labelKey: "auth.hero.stat3Label" },
          ].map(({ icon: Icon, value, labelKey }) => (
            <div key={labelKey} className="hero-stat">
              <Icon className="stat-icon" />
              <span className="stat-value">{value}</span>
              <span className="stat-label">{t(labelKey as never)}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right form panel ── */}
      <main className="login-form-panel animate-slide-up">
        <div className="form-lang-row">
          <LanguageSelector variant="dark" />
        </div>

        <div className="login-card">
          <div className="card-accent-bar" />

          <div className="card-body">
            <div className="mobile-logo">
              <div className="logo-icon-sm" style={{overflow:"hidden",padding:0}}>
                <img src="/icons/icon.svg" alt="TwihugureHub" style={{width:"100%",height:"100%",display:"block"}} />
              </div>
              <span className="logo-text-sm">TwihugureHub</span>
            </div>

            <div className="card-header">
              <h1 className="card-title">{t("auth.login.title")}</h1>
              <p className="card-subtitle">{t("auth.login.subtitle")}</p>
            </div>

            {error && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="field">
                <label htmlFor="email" className="field-label">
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
                  className={cn("field-input", isLoading && "opacity-50")}
                  disabled={isLoading}
                />
              </div>

              <div className="field">
                <label htmlFor="password" className="field-label">
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
                    className={cn("field-input pr-11", isLoading && "opacity-50")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="pw-toggle"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password}
                className="submit-btn"
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

            <div className="card-footer">
              <span>
                {t("auth.login.noAccount")}{" "}
                <Link href="/register" className="footer-link">
                  {t("auth.login.registerLink")}
                </Link>
              </span>
            </div>
          </div>
        </div>

        <p className="tagline">{t("app.tagline")}</p>
      </main>

      <style jsx>{`
        .login-wrapper {
          display: flex;
          min-height: 100vh;
          width: 100%;
          align-items: stretch;
          position: relative;
        }

        /* ── Left hero ── */
        .login-hero {
          display: none;
          flex-direction: column;
          justify-content: flex-end;
          gap: 2.5rem;
          padding: 3rem;
          width: 46%;
          flex-shrink: 0;
          position: relative;
        }
        @media (min-width: 900px) {
          .login-hero { display: flex; }
        }

        .hero-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          position: absolute;
          top: 2.5rem;
          left: 3rem;
        }

        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          background: #2D6A4F;
          box-shadow: 0 4px 24px rgba(45,106,79,0.6);
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
          text-shadow: 0 1px 8px rgba(0,0,0,0.4);
        }

        .hero-eyebrow {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #86efac;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        .hero-headline {
          font-size: 2.75rem;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
          text-shadow: 0 2px 24px rgba(0,0,0,0.5);
        }

        .hero-accent { color: #E9C46A; }

        .hero-body {
          font-size: 1rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.7;
          max-width: 28rem;
        }

        .hero-stats {
          display: flex;
          gap: 1.5rem;
          padding: 1.25rem 1.5rem;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 1rem;
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.15rem;
          flex: 1;
        }

        .stat-icon {
          width: 1rem;
          height: 1rem;
          color: #86efac;
          margin-bottom: 0.2rem;
        }

        .stat-value {
          font-size: 1.375rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.02em;
        }

        .stat-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }

        /* ── Right form panel ── */
        .login-form-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 2rem 1.25rem;
          gap: 1rem;
        }

        .form-lang-row {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          max-width: 26rem;
        }

        /* ── Card ── */
        .login-card {
          width: 100%;
          max-width: 26rem;
          border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(6, 20, 12, 0.7);
          backdrop-filter: blur(24px) saturate(1.5);
          box-shadow:
            0 32px 100px rgba(0,0,0,0.55),
            0 0 0 1px rgba(45,106,79,0.25) inset;
          overflow: hidden;
        }

        .card-accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #2D6A4F 0%, #E9C46A 50%, #2D6A4F 100%);
        }

        .card-body { padding: 2.25rem 2rem; }

        .mobile-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 900px) { .mobile-logo { display: none; } }

        .logo-icon-sm {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
          background: #2D6A4F;
        }

        .logo-text-sm {
          font-size: 1rem;
          font-weight: 700;
          color: white;
        }

        .card-header { margin-bottom: 1.75rem; }

        .card-title {
          font-size: 1.625rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .card-subtitle {
          margin-top: 0.375rem;
          font-size: 0.875rem;
          color: rgba(134,239,172,0.75);
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(239,68,68,0.3);
          background: rgba(239,68,68,0.1);
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          color: #fca5a5;
          margin-bottom: 1.25rem;
        }
        .error-icon { margin-top: 1px; flex-shrink: 0; }

        .login-form { display: flex; flex-direction: column; gap: 1.125rem; }
        .field { display: flex; flex-direction: column; }

        .field-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(134,239,172,0.75);
          margin-bottom: 0.375rem;
        }

        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          color: white;
          transition: all 0.15s ease;
          outline: none;
        }
        .field-input::placeholder { color: rgba(134,239,172,0.3); }
        .field-input:focus {
          border-color: rgba(45,106,79,0.8);
          background: rgba(255,255,255,0.09);
          box-shadow: 0 0 0 3px rgba(45,106,79,0.25);
        }

        .pw-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          padding: 0.25rem;
          color: rgba(134,239,172,0.45);
          border-radius: 0.375rem;
          transition: color 0.15s;
          background: none;
          border: none;
          cursor: pointer;
        }
        .pw-toggle:hover { color: rgba(134,239,172,0.9); }

        .submit-btn {
          margin-top: 0.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.25rem;
          border-radius: 0.875rem;
          background: linear-gradient(135deg, #2D6A4F 0%, #1a4a36 100%);
          color: white;
          font-size: 0.9375rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 20px rgba(45,106,79,0.5), 0 0 0 1px rgba(45,106,79,0.4) inset;
          transition: all 0.15s ease;
          cursor: pointer;
          border: none;
        }
        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #38836a 0%, #2D6A4F 100%);
          box-shadow: 0 8px 32px rgba(45,106,79,0.65), 0 0 0 1px rgba(45,106,79,0.5) inset;
          transform: translateY(-1px);
        }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .card-footer {
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          font-size: 0.8125rem;
          color: rgba(134,239,172,0.45);
          text-align: center;
        }

        .footer-link {
          font-weight: 700;
          color: #86efac;
          transition: color 0.15s;
          text-decoration: none;
        }
        .footer-link:hover { color: white; text-decoration: underline; }

        .tagline {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.25);
          text-align: center;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );
}
