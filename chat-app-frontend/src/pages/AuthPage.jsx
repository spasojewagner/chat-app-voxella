import { useState } from "react";
import { Link } from "react-router";
import { CheckCheck, ShieldCheck, Zap } from "lucide-react";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Logo } from "../components/ui/Logo.jsx";
import { errorMessage, fieldErrors } from "../lib/api.js";
import { useAuth } from "../stores/auth.js";

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to pick up your conversations where you left them.",
    submit: "Sign in",
    switchText: "New to VoxElla?",
    switchLink: "Create an account",
    switchTo: "/register",
  },
  register: {
    title: "Create your account",
    subtitle: "It takes half a minute. No phone number needed.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchTo: "/login",
  },
};

export default function AuthPage({ mode }) {
  const copy = COPY[mode];
  const isRegister = mode === "register";
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);

  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError("");
  };

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      if (isRegister) await register(values);
      else await login({ email: values.email, password: values.password });
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px] animate-slide-up">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-[28px] font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-muted">{copy.subtitle}</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
            {isRegister && (
              <Field
                label="Full name"
                autoComplete="name"
                placeholder="Ana Petrović"
                value={values.fullName}
                onChange={update("fullName")}
                error={errors.fullName}
                autoFocus
              />
            )}
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={update("email")}
              error={errors.email}
              autoFocus={!isRegister}
            />
            <Field
              label="Password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              value={values.password}
              onChange={update("password")}
              error={errors.password}
            />

            {formError && (
              <p role="alert" className="rounded-xl border border-danger/25 bg-danger/8 px-3.5 py-2.5 text-sm text-danger">
                {formError}
              </p>
            )}

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {copy.submit}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            {copy.switchText}{" "}
            <Link to={copy.switchTo} className="font-medium text-accent hover:underline">
              {copy.switchLink}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "linear-gradient(to bottom, black, transparent 75%)",
        }}
      />
      <div className="pointer-events-none absolute -right-24 -bottom-32 size-[420px] rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-center gap-2.5 text-[19px] font-semibold">
        <span className="grid size-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <svg viewBox="0 0 40 40" className="size-[62%]" aria-hidden="true">
            <path
              d="M6 9.5A3.5 3.5 0 0 1 9.5 6h21A3.5 3.5 0 0 1 34 9.5v15a3.5 3.5 0 0 1-3.5 3.5H19l-7 6v-6H9.5A3.5 3.5 0 0 1 6 24.5z"
              fill="white"
            />
            <path
              d="M13.5 11.5 20 22l6.5-10.5"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        VoxElla
      </div>

      <div className="relative my-auto max-w-lg py-12">
        <h2 className="text-[44px] leading-[1.08] font-semibold tracking-tight">
          Conversations that feel instant.
        </h2>
        <p className="mt-4 max-w-md text-lg text-white/80">
          Messages, photos, typing and read receipts in real time, on every device you&apos;re signed in on.
        </p>

        <div className="mt-10 w-full max-w-sm animate-float rounded-3xl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur-md">
          <div className="flex items-center gap-3 border-b border-white/15 pb-3">
            <Avatar name="Luka Jovanović" size="sm" online className="[&>span:last-child]:ring-transparent" />
            <div className="text-sm">
              <p className="font-semibold">Luka Jovanović</p>
              <p className="text-white/70">typing…</p>
            </div>
          </div>
          <div className="space-y-2 pt-3 text-[14px]">
            <p className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-white/90 px-3 py-2 text-zinc-800">
              Did the release go out?
            </p>
            <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-zinc-900/80 px-3 py-2">
              Live 5 minutes ago 🚀
            </p>
            <p className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white/90 px-3 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-typing rounded-full bg-zinc-500"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </p>
          </div>
        </div>
      </div>

      <ul className="relative grid grid-cols-3 gap-4 text-sm text-white/85">
        <li className="flex items-center gap-2">
          <Zap className="size-4" /> Real-time
        </li>
        <li className="flex items-center gap-2">
          <CheckCheck className="size-4" /> Read receipts
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4" /> Private by default
        </li>
      </ul>
    </aside>
  );
}
