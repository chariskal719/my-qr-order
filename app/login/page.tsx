"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Φτιάχνουμε τον client με το νέο, ασφαλές πακέτο SSR
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("❌ Λάθος email ή κωδικός πρόσβασης.");
      setIsLoading(false);
    } else {
      // Μόλις συνδεθεί επιτυχώς, το στέλνουμε στο admin
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Είσοδος</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Διαχείριση Καταστήματος</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-gray-900 focus:bg-white transition-colors text-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Κωδικός</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-gray-900 focus:bg-white transition-colors text-black"
            />
          </div>

          <button
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-[0.99] transition-all text-base pt-4"
          >
            {isLoading ? "Σύνδεση..." : "Είσοδος →"}
          </button>
        </form>
      </div>
    </div>
  );
}