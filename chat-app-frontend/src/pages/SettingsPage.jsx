import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Camera, Check, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { api, errorMessage, fieldErrors } from "../lib/api.js";
import { cn } from "../lib/cn.js";
import { validateImage } from "../lib/images.js";
import { useAuth } from "../stores/auth.js";
import { useChat } from "../stores/chat.js";
import { ACCENTS, usePreferences } from "../stores/preferences.js";

export default function SettingsPage() {
  const logout = useAuth((s) => s.logout);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
        <header className="mb-6 flex items-center gap-2">
          <Link
            to="/"
            aria-label="Back to conversations"
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface hover:text-fg"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </header>

        <div className="space-y-5">
          <ProfileSection />
          <AppearanceSection />
          <PasswordSection />
          <BlockedSection />
          <Card title="Session">
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection() {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const uploadAvatar = useAuth((s) => s.uploadAvatar);
  const fileInput = useRef(null);
  const [values, setValues] = useState({ fullName: user.fullName, status: user.status ?? "", email: user.email });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const changes = Object.fromEntries(
    Object.entries(values).filter(([key, value]) => value.trim() !== (user[key] ?? "").trim()),
  );
  const dirty = Object.keys(changes).length > 0;

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await updateProfile(changes);
      toast.success("Profile saved.");
    } catch (error) {
      const fields = fieldErrors(error);
      if (error.response?.data?.code === "EMAIL_TAKEN") fields.email = error.response.data.message;
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatar(file) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) return toast.error(problem);
    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Photo updated.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <Card title="Profile" description="This is how other people see you on VoxElla.">
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar name={user.fullName} src={user.profilePic} size="xl" />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label="Change photo"
            className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-4 border-surface bg-accent text-accent-fg shadow-sm hover:bg-accent-strong"
          >
            {uploading ? <Spinner className="size-3.5" /> : <Camera className="size-4" />}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              onAvatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.fullName}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-faint">
            Member since {new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={values.fullName} onChange={set("fullName")} error={errors.fullName} autoComplete="name" />
        <Field label="Email" type="email" value={values.email} onChange={set("email")} error={errors.email} autoComplete="email" />
        <Field
          className="sm:col-span-2"
          label="Status"
          placeholder="What are you up to?"
          maxLength={140}
          value={values.status}
          onChange={set("status")}
          error={errors.status}
          hint={`${values.status.length}/140 · shown in chats and your profile`}
        />
        <div className="flex justify-end gap-2 sm:col-span-2">
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => setValues({ fullName: user.fullName, status: user.status ?? "", email: user.email })}
            >
              Discard
            </Button>
          )}
          <Button type="submit" disabled={!dirty} loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

const MODES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

function AppearanceSection() {
  const { mode, accent, setMode, setAccent } = usePreferences();

  return (
    <Card title="Appearance" description="Saved on this device.">
      <p className="text-sm font-medium">Theme</p>
      <div role="radiogroup" aria-label="Theme" className="mt-2 grid grid-cols-3 gap-2">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
              mode === id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-surface-2",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm font-medium">Accent colour</p>
      <div role="radiogroup" aria-label="Accent colour" className="mt-2 flex flex-wrap gap-3">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={accent === a.id}
            aria-label={a.label}
            title={a.label}
            onClick={() => setAccent(a.id)}
            style={{ backgroundColor: a.swatch }}
            className={cn(
              "grid size-9 place-items-center rounded-full text-white ring-offset-2 ring-offset-surface transition-transform hover:scale-105",
              accent === a.id && "ring-2 ring-fg/70",
            )}
          >
            {accent === a.id && <Check className="size-4" />}
          </button>
        ))}
      </div>

      <div className="chat-backdrop mt-5 space-y-1.5 rounded-2xl border border-line p-4" aria-hidden="true">
        <p className="w-fit max-w-[75%] rounded-[18px] rounded-bl-md bg-bubble-in px-3.5 py-2 text-[14px]">How does this look?</p>
        <p className="ml-auto w-fit max-w-[75%] rounded-[18px] rounded-br-md bg-accent px-3.5 py-2 text-[14px] text-accent-fg">
          Looks great 👌
        </p>
      </div>
    </Card>
  );
}

function PasswordSection() {
  const changePassword = useAuth((s) => s.changePassword);
  const [values, setValues] = useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await changePassword(values);
      setValues({ currentPassword: "", newPassword: "" });
      toast.success("Password changed.");
    } catch (error) {
      const fields = fieldErrors(error);
      if (error.response?.data?.code === "INVALID_PASSWORD") fields.currentPassword = error.response.data.message;
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <Card title="Password">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={set("currentPassword")}
          error={errors.currentPassword}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={set("newPassword")}
          error={errors.newPassword}
          hint={errors.newPassword ? undefined : "At least 8 characters"}
        />
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={!values.currentPassword || !values.newPassword} loading={saving}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BlockedSection() {
  const [people, setPeople] = useState(null);

  useEffect(() => {
    api
      .get("/users/me/blocked")
      .then(({ data }) => setPeople(data))
      .catch(() => setPeople([]));
  }, []);

  async function unblock(person) {
    try {
      await useChat.getState().setBlocked(person._id, false);
      useAuth.getState().setBlocked(person._id, false);
      setPeople((list) => list.filter((p) => p._id !== person._id));
      toast.success(`${person.fullName} is unblocked.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card title="Blocked people" description="They can't message you or find you in search.">
      {people === null ? (
        <Spinner className="text-muted" />
      ) : people.length === 0 ? (
        <p className="text-sm text-muted">You haven&apos;t blocked anyone.</p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map((person) => (
            <li key={person._id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Avatar name={person.fullName} src={person.profilePic} size="sm" />
              <span className="flex-1 truncate font-medium">{person.fullName}</span>
              <Button variant="secondary" size="sm" onClick={() => unblock(person)}>
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
