import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpen, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';

const securityNotes = [
  'Role-based authentication for students, teachers, and admins',
  'Submission and grading workflows tracked per account session',
  'Built for responsive access across desktop and mobile devices',
];

export function Login() {
  const { login, currentUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) navigate(`/${currentUser.role}`, { replace: true });
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) setError(result.error || 'Login failed');
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-orange-300/35 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-teal-300/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.02fr_0.98fr] items-stretch lg:min-h-[calc(100vh-4rem)] lg:content-center">
        <section className="rounded-[2rem] border border-gray-200 bg-white/90 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-[0_35px_70px_-45px_rgba(48,27,11,0.7)]">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center shadow-[0_14px_30px_-18px_rgba(51,25,10,0.8)]">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 tracking-tight">ExamHub</div>
              <div className="text-xs text-gray-600 uppercase tracking-[0.14em]">Secure Sign In</div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl leading-[1.08] max-w-xl">Access your examination portal.</h1>
          <p className="text-gray-600 text-sm sm:text-base mt-4 max-w-lg">
            Continue with your institutional account to manage assessments, submissions, and grading.
          </p>

          <div className="mt-6 space-y-2.5">
            {securityNotes.map(item => (
              <div key={item} className="rounded-xl border border-gray-200 bg-white/75 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs sm:text-sm text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Session protected with authenticated backend tokens</span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white/95 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-[0_35px_70px_-45px_rgba(48,27,11,0.7)] flex flex-col justify-between">
          <div>
            <div className="mb-7">
              <h2 className="text-3xl">Sign In</h2>
              <p className="text-gray-600 mt-2 text-sm">Enter your credentials to continue.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Institution Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@school.edu"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none text-sm pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold transition-colors mt-3"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-200 space-y-2">
            <p className="text-center text-sm text-gray-600">
              New to the system?{' '}
              <Link to="/register" className="text-gray-900 hover:text-gray-700 font-semibold">
                Create an account
              </Link>
            </p>
            <p className="text-center text-sm text-gray-600">
              <Link to="/" className="text-gray-900 hover:text-gray-700 font-semibold">
                Back to landing page
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
