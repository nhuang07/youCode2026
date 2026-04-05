"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams.get("role") || "volunteer";

  const [role, setRole] = useState<"volunteer" | "coordinator">(
    roleParam === "coordinator" ? "coordinator" : "volunteer"
  );
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (roleParam === "coordinator" || roleParam === "volunteer") {
      setRole(roleParam as "volunteer" | "coordinator");
    }
  }, [roleParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role, name },
          },
        });
        if (error) throw error;
      }

      // Redirect based on role
      router.push(role === "volunteer" ? "/volunteer" : "/coordinator");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a
            href="/"
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--accent-green)" }}
          >
            rooted
          </a>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
            {isLogin ? "Welcome back" : "Join your community"}
          </p>
        </div>

        {/* Role Toggle */}
        <div
          className="flex rounded-xl p-1 mb-6"
          style={{ background: "var(--bg-secondary)" }}
        >
          <button
            onClick={() => setRole("volunteer")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background:
                role === "volunteer" ? "var(--bg-card)" : "transparent",
              color:
                role === "volunteer"
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              boxShadow:
                role === "volunteer" ? "var(--shadow-sm)" : "none",
            }}
          >
            I&apos;m a Volunteer
          </button>
          <button
            onClick={() => setRole("coordinator")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background:
                role === "coordinator" ? "var(--bg-card)" : "transparent",
              color:
                role === "coordinator"
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              boxShadow:
                role === "coordinator" ? "var(--shadow-sm)" : "none",
            }}
          >
            I&apos;m a Coordinator
          </button>
        </div>

        {/* Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{
                    border: "1.5px solid var(--border-light)",
                    background: "var(--bg-primary)",
                  }}
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid var(--border-light)",
                  background: "var(--bg-primary)",
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid var(--border-light)",
                  background: "var(--bg-primary)",
                }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-2.5 rounded-lg"
                style={{
                  background: "var(--accent-orange-light)",
                  color: "var(--accent-orange)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-base mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading
                ? "Loading..."
                : isLogin
                ? `Sign In as ${role === "volunteer" ? "Volunteer" : "Coordinator"}`
                : `Create ${role === "volunteer" ? "Volunteer" : "Coordinator"} Account`}
            </button>
          </form>

          <div className="text-center mt-5">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium"
              style={{ color: "var(--accent-green)" }}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
