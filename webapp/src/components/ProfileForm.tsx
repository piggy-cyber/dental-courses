"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { updateProfile } from "@/app/(protected)/profile/actions";

export type ProfileFormData = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function ProfileForm({ profile }: { profile: ProfileFormData }) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be 2 MB or smaller.");
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const result = await updateProfile({ avatar_url: publicUrl });
    if (result.error) {
      setError(result.error);
    } else {
      setAvatarUrl(publicUrl);
      setMessage("Profile picture updated.");
    }
    setBusy(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const normalized = username.trim().toLowerCase();
    if (normalized && !USERNAME_RE.test(normalized)) {
      setError("Username must be 3–24 characters: lowercase letters, numbers, underscore.");
      setBusy(false);
      return;
    }

    const result = await updateProfile({
      name: name.trim() || null,
      username: normalized || null,
      bio: bio.trim() || null,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Profile saved.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-wrap items-center gap-5">
        <UserAvatar
          name={name || profile.name}
          email={profile.email}
          avatarUrl={avatarUrl}
          size="lg"
        />
        <div>
          <p className="font-semibold text-brand-navy">{profile.email}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-sm font-medium text-brand-blue hover:underline disabled:opacity-60"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAvatar(file);
            }}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-brand-ink">Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rick Ahn"
            className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-brand-ink">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="rickahn"
            className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2"
          />
          <span className="mt-1 block text-xs text-brand-muted">
            Lowercase, 3–24 chars. Shown as @{username || "username"}.
          </span>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-brand-ink">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={280}
          placeholder="D1 · Case Western · interested in..."
          className="mt-1 w-full rounded-lg border border-brand-line px-3 py-2"
        />
        <span className="mt-1 block text-xs text-brand-muted">{bio.length}/280</span>
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-blue px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
