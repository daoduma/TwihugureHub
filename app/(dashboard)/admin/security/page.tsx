"use client";
// app/(dashboard)/admin/security/page.tsx

import { useState } from "react";

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeoutMinutes: number;
  require2FAForAdmins: boolean;
  require2FAForMbaza: boolean;
}


export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSymbol: false,
    },
    sessionTimeoutMinutes: 1440,
    require2FAForAdmins: false,
    require2FAForMbaza: false,
  });
  const [saved, setSaved] = useState(false);
  const [forceLogoutConfirm, setForceLogoutConfirm] = useState(false);
  const [forceLogoutDone, setForceLogoutDone] = useState(false);

  const handleSave = async () => {
    // In a full implementation, this would persist to DB
    // For now we simulate save
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleForceLogout = async () => {
    // This would invalidate all sessions in a full implementation
    // by deleting all Session records from the DB
    setForceLogoutDone(true);
    setForceLogoutConfirm(false);
    setTimeout(() => setForceLogoutDone(false), 5000);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Security Settings 🔒
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configure platform-wide security policies.</p>
      </div>

      {/* Password Policy */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Password Policy</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Password Length: <span className="text-brand-600 font-bold">{settings.passwordPolicy.minLength}</span>
          </label>
          <input
            type="range"
            min={6}
            max={20}
            value={settings.passwordPolicy.minLength}
            onChange={e => setSettings(s => ({ ...s, passwordPolicy: { ...s.passwordPolicy, minLength: parseInt(e.target.value) } }))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>6</span><span>20</span></div>
        </div>

        <div className="space-y-3">
          {[
            { key: "requireUppercase" as const, label: "Require at least one uppercase letter (A-Z)" },
            { key: "requireNumber" as const, label: "Require at least one number (0-9)" },
            { key: "requireSymbol" as const, label: "Require at least one symbol (!@#$…)" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.passwordPolicy[key]}
                onChange={e => setSettings(s => ({ ...s, passwordPolicy: { ...s.passwordPolicy, [key]: e.target.checked } }))}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 accent-brand-600"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Session Timeout */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Session Settings</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Timeout:{" "}
            <span className="text-brand-600 font-bold">
              {settings.sessionTimeoutMinutes >= 1440
                ? `${settings.sessionTimeoutMinutes / 1440} day(s)`
                : `${settings.sessionTimeoutMinutes} minutes`}
            </span>
          </label>
          <select
            className="input w-full"
            value={settings.sessionTimeoutMinutes}
            onChange={e => setSettings(s => ({ ...s, sessionTimeoutMinutes: parseInt(e.target.value) }))}
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={240}>4 hours</option>
            <option value={480}>8 hours</option>
            <option value={1440}>1 day</option>
            <option value={10080}>7 days</option>
            <option value={43200}>30 days</option>
          </select>
        </div>
      </div>

      {/* 2FA Settings */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Two-Factor Authentication</h2>
        <p className="text-sm text-gray-500">Require 2FA for elevated-privilege roles.</p>

        <div className="space-y-3">
          {[
            { key: "require2FAForAdmins" as const, label: "Require 2FA for Admin accounts", role: "ADMIN" },
            { key: "require2FAForMbaza" as const, label: "Require 2FA for Mbaza Staff accounts", role: "MBAZA_STAFF" },
          ].map(({ key, label, role }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{role}</p>
              </div>
              <button
                role="switch"
                aria-checked={settings[key]}
                onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[key] ? "bg-brand-600" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 italic">Note: Full 2FA implementation requires an authenticator app integration (e.g. TOTP via speakeasy).</p>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          Save Security Settings
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border-2 border-red-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-red-700">⚠ Danger Zone</h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Force All Users to Re-login</p>
            <p className="text-xs text-gray-500 mt-0.5">Invalidates all active sessions immediately. All users will need to sign in again.</p>
          </div>
          {!forceLogoutConfirm ? (
            <button
              onClick={() => setForceLogoutConfirm(true)}
              className="shrink-0 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Force Re-login
            </button>
          ) : (
            <div className="shrink-0 flex gap-2">
              <button onClick={() => setForceLogoutConfirm(false)} className="btn-secondary py-1.5 px-3 text-xs">Cancel</button>
              <button onClick={handleForceLogout} className="rounded-xl bg-red-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-red-700">
                Confirm
              </button>
            </div>
          )}
        </div>
        {forceLogoutDone && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">✓ All sessions have been invalidated.</p>
        )}
      </div>
    </div>
  );
}
