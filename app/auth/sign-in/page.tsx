"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">TeachMe</h1>
        <p className="text-gray-500 mb-8">Personalized lessons, generated for you.</p>

        {submitted ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            Check your email for a magic link to sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
