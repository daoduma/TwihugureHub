"use client";
// app/(dashboard)/trainer/profile/page.tsx

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Mail, Globe, ShieldCheck, Loader2, CheckCircle } from "lucide-react";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "rw", label: "Kinyarwanda" },
];

export default function TrainerProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName]           = useState("");
  const [language, setLanguage]   = useState("en");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [saving, setSaving]       = useState(false);
  const [pwSaving, setPwSaving]   = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg]           = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setLanguage((session.user as { preferredLanguage?: string }).preferredLanguage ?? "en");
    }
  }, [session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const res  = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, preferredLanguage: language }),
      });
      const data = await res.json();
      if (res.ok) {
        await update({ name });
        setProfileMsg({ type: "ok", text: "Profile updated successfully." });
      } else {
        setProfileMsg({ type: "err", text: data.error ?? "Failed to update profile." });
      }
    } catch {
      setProfileMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res  = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: "ok", text: "Password changed successfully." });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        setPwMsg({ type: "err", text: data.error ?? "Failed to change password." });
      }
    } catch {
      setPwMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setPwSaving(false);
    }
  }

  const inputCls = "input-field";

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
          My Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account details and preferences</p>
      </div>

      {/* Avatar + role chip */}
      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-900/20">
          <User size={28} />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{session?.user?.name ?? "—"}</p>
          <p className="text-sm text-gray-500">{session?.user?.email}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            <ShieldCheck size={11} /> Trainer
          </span>
        </div>
      </div>

      {/* Profile form */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-gray-800">Personal Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">
              <User size={13} className="inline mr-1 text-gray-400" />
              Full Name
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label">
              <Mail size={13} className="inline mr-1 text-gray-400" />
              Email Address
            </label>
            <input
              className={`${inputCls} opacity-60 cursor-not-allowed`}
              value={session?.user?.email ?? ""}
              disabled
              readOnly
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed. Contact an admin if needed.</p>
          </div>

          <div>
            <label className="label">
              <Globe size={13} className="inline mr-1 text-gray-400" />
              Preferred Language
            </label>
            <select
              className={inputCls}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {profileMsg && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${profileMsg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {profileMsg.type === "ok" && <CheckCircle size={15} />}
              {profileMsg.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-gray-800">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className={inputCls}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className={inputCls}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className={inputCls}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>

          {pwMsg && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${pwMsg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {pwMsg.type === "ok" && <CheckCircle size={15} />}
              {pwMsg.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pwSaving}
              className="btn-primary flex items-center gap-2"
            >
              {pwSaving && <Loader2 size={14} className="animate-spin" />}
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
