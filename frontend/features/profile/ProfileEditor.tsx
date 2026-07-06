"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { compressAvatarFile } from "@/lib/avatar-upload";
import { formatDisplayName } from "@/lib/names";
import { updateProfile } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

interface ProfileEditorProps {
  name: string;
  avatarUrl: string | null;
  onSaved?: () => void;
}

export function ProfileEditor({ name, avatarUrl, onSaved }: ProfileEditorProps) {
  const setAuth = useSessionStore((s) => s.setAuth);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEditor = () => {
    setDraftName(name);
    setDraftAvatarUrl(avatarUrl);
    setAvatarUrlInput("");
    setError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = formatDisplayName(draftName);
    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const updates: Parameters<typeof updateProfile>[0] = {};
      if (trimmedName !== name) updates.name = trimmedName;

      if (draftAvatarUrl !== avatarUrl) {
        if (draftAvatarUrl === null) updates.removeAvatar = true;
        else updates.avatarUrl = draftAvatarUrl;
      }

      if (!updates.name && updates.avatarUrl === undefined && !updates.removeAvatar) {
        setOpen(false);
        return;
      }

      const user = await updateProfile(updates);
      setAuth(user);
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    try {
      const dataUrl = await compressAvatarFile(file);
      setDraftAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load image.");
    }
  };

  const applyUrl = () => {
    const trimmed = avatarUrlInput.trim();
    if (!trimmed) return;
    setDraftAvatarUrl(trimmed);
    setAvatarUrlInput("");
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={openEditor}>
          Edit profile
        </Button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-(--shadow-card)"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-plum">Profile</p>
                  <h2 className="mt-1 text-xl font-bold text-ink">Edit your look</h2>
                </div>
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-ink"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl bg-plum-light/40 p-5">
                <UserAvatar
                  name={draftName || name}
                  avatarUrl={draftAvatarUrl}
                  className="h-24 w-24 text-3xl shadow-md ring-4 ring-white"
                />
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    Upload photo
                  </Button>
                  {draftAvatarUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftAvatarUrl(null)}
                      disabled={busy}
                    >
                      Remove photo
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleFileChange(event)}
                />
                <div className="flex w-full gap-2">
                  <Input
                    value={avatarUrlInput}
                    onChange={(event) => setAvatarUrlInput(event.target.value)}
                    placeholder="Or paste image URL"
                    disabled={busy}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={applyUrl} disabled={busy}>
                    Use
                  </Button>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Display name
                </span>
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Your name"
                  disabled={busy}
                />
              </label>

              {error ? (
                <p role="alert" className="mt-4 rounded-xl bg-pink-light px-3 py-2 text-sm text-plum">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-2">
                <Button type="button" className="flex-1" onClick={() => void handleSave()} disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
