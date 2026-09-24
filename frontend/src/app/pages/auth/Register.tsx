import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpen, Eye, EyeOff, UserPlus, X, ScrollText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../data/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export function Register() {
  const { register, currentUser } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'student' as UserRole,
    department: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToDataPrivacy, setAgreedToDataPrivacy] = useState(false);
  const [showDataPrivacy, setShowDataPrivacy] = useState(false);

  useEffect(() => {
    if (currentUser) navigate(`/${currentUser.role}`, { replace: true });
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions to register.');
      setLoading(false);
      return;
    }
    if (!agreedToDataPrivacy) {
      setError('You must agree to the Data Privacy Policy to register.');
      setLoading(false);
      return;
    }
    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      department: form.department,
    });
    if (!result.success) setError(result.error || 'Registration failed');
    setLoading(false);
  };

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 lg:flex lg:items-center">
      {/* ── Terms & Conditions Modal ─────────────────────────────────────── */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">Terms &amp; Conditions</h2>
              </div>
              <button onClick={() => setShowTerms(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 text-sm text-gray-700 space-y-4 leading-relaxed">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Effective date: April 19, 2026</p>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">1. Acceptance of Terms</h3>
                <p>By creating an account on ExamHub, you agree to be bound by these Terms &amp; Conditions and our Academic Integrity Policy. If you do not agree, do not register.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">2. Account Responsibilities</h3>
                <p>You are responsible for maintaining the confidentiality of your login credentials. You must not share your account with any other person. You agree to provide accurate and truthful registration information.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">3. Academic Integrity</h3>
                <p>ExamHub is used for academic assessment. Any attempt to cheat, circumvent proctoring measures, or misrepresent your identity during an exam is strictly prohibited and may result in account suspension and referral to your institution's disciplinary committee.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">4. Exam Monitoring</h3>
                <p>During assessments, the platform monitors browser activity including tab switches, window focus changes, and full-screen status. This data is visible to your teachers and administrators for the purpose of academic integrity review.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">5. Data Privacy</h3>
                <p>We collect and store your name, email, role, exam submissions, and activity logs. This data is used solely for academic purposes and is not shared with third parties outside your institution.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">6. Termination</h3>
                <p>Administrators may suspend or terminate accounts that violate these terms. Students and teachers may request account deletion by contacting their institution's administrator.</p>
              </section>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { setAgreedToTerms(true); setShowTerms(false); }}
                className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                I Have Read and Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Data Privacy Policy Modal ──────────────────────────────────── */}
      {showDataPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">Data Privacy Policy</h2>
              </div>
              <button onClick={() => setShowDataPrivacy(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 text-sm text-gray-700 space-y-4 leading-relaxed">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Gordon College — General Privacy Notice</p>
              <p className="text-xs text-gray-500">This is Gordon College's general statement on its data processing activities to notify data subjects of categories of personal data processed and the purpose and extent of processing.</p>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">1. Acts of Processing</h3>
                <p>Gordon College processes Personal Data to perform its obligations, exercise its rights, and conduct its associated functions as an instrumentality of the government and as a higher education institution — pursuant to R.A. 7722, CHED Memorandum Order No. 32 S. 2006, and City Ordinance No. 07 S. 2018.</p>
                <p className="mt-1">The Gordon College website and web applications use cookies to prevent security risks, recognize logged-in users, customize browsing experience, store authorization tokens, and permit social media sharing.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">2. Personal Data Collected</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-sm">
                  <li>Personal details: name, birth date, gender, civil status, affiliations</li>
                  <li>Contact information: address, email, mobile and telephone numbers</li>
                  <li>Academic information: grades, course, academic standing</li>
                  <li>Employment information: government-issued numbers, position and functions</li>
                  <li>Applicant information: academic background and previous employments</li>
                  <li>Medical information: physical, psychiatric and psychological information</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">3. Collection Method</h3>
                <p>Personal Data is collected physically through printed forms and documents, and electronically through electronic forms, email, or direct input by the data subject.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">4. Timing of Collection</h3>
                <p>Personal Data is generally collected at the onset of the relationship with stakeholders — upon application or before commencement of engagement — and also when specific actions or decisions are undertaken.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">5. Purpose of Collection</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-sm">
                  <li>To perform Gordon College's obligations as a government instrumentality and HEI</li>
                  <li>To pursue GC's mandates under existing laws and regulations</li>
                  <li>To manage and administer internal and external affairs</li>
                  <li>Compliance with legal, regulatory, administrative, or judicial requirements</li>
                  <li>Purpose specific to the stakeholder per the Gordon College Data Privacy Manual</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">6. Storage &amp; Transfer</h3>
                <p>Personal Data is stored in physical and electronic systems managed by Gordon College units. Transmission and transfer are conducted in accordance with Chapter III of the Data Privacy Act of 2012 and Rule V of its IRR.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">7. Method of Use</h3>
                <p>Personal Data is used proportionately as necessary for GC's legitimate purposes under the Data Privacy Act of 2012, NPC issuances, and National Archives of the Philippines Act of 2007.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">8. Retention</h3>
                <p>Data is retained in accordance with the Gordon College Records Management Policy. In the absence of an applicable rule, retention follows practices of government bodies with analogous functions.</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">9. Your Rights</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-sm">
                  <li>Right to be informed</li>
                  <li>Right to object (subject to GC's possible failure to conduct academic/admin functions)</li>
                  <li>Right to access</li>
                  <li>Right to rectification</li>
                  <li>Right to erasure or blocking of non-public Personal Data</li>
                  <li>Right to damages (subordinate to GC's non-liability for incidental damages from mandate pursuance)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">10. Your Responsibilities</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-sm">
                  <li>Respect the data privacy rights of others</li>
                  <li>Report any suspected Security Incident or Personal Data Breach to the GC Data Protection Office</li>
                  <li>Provide true and accurate Personal Data; obtain consent before submitting another person's data</li>
                  <li>Do not disclose non-public confidential or personal information obtained from GC</li>
                  <li>Abide by GC policies on data privacy, information security, records management, and ethical conduct</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-1">11. Inquiries</h3>
                <p>Data Privacy Office — Olongapo City Sports Complex, Donor St., East Tapinac, Olongapo City 2200</p>
                <p>Phone: (047) 222-4080 · Email: dpo@gordoncollege.edu.ph</p>
              </section>

              <p className="text-xs text-gray-400 pt-1">Full policy: <a href="https://gordoncollegeccs.edu.ph/datapolicy/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">gordoncollegeccs.edu.ph/datapolicy</a></p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { setAgreedToDataPrivacy(true); setShowDataPrivacy(false); }}
                className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                I Have Read and Agree
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 right-0 w-80 h-80 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute bottom-0 -left-12 w-72 h-72 rounded-full bg-orange-300/35 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto rounded-[2rem] border border-gray-200 bg-white/90 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-[0_35px_70px_-45px_rgba(48,27,11,0.7)]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center shadow-[0_14px_30px_-18px_rgba(51,25,10,0.8)]">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 tracking-tight">ExamHub</div>
            <div className="text-xs text-gray-600 uppercase tracking-[0.14em] mt-0.5">Create your account</div>
          </div>
        </div>

        <div className="mb-7">
          <h1 className="text-3xl sm:text-4xl leading-tight">Join the assessment workspace.</h1>
          <p className="text-gray-600 mt-2 text-sm max-w-2xl">
            Register once and access your role-specific dashboard from desktop, tablet, or phone.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Role</label>
              <Select value={form.role} onValueChange={value => update('role', value)}>
                <SelectTrigger className="w-full h-[46px] px-4 border border-gray-200 rounded-2xl bg-white text-sm text-gray-800 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:border-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
                  <SelectItem value="student" className="rounded-lg focus:bg-gray-100 focus:text-gray-900">Student</SelectItem>
                  <SelectItem value="teacher" className="rounded-lg focus:bg-gray-100 focus:text-gray-900">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Department / Major</label>
              <input
                type="text"
                value={form.department}
                onChange={e => update('department', e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
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
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.14em]">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
                required
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Terms & Conditions checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none group mt-1">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-gray-900 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-600 transition-colors"
              >
                Terms &amp; Conditions
              </button>
            </span>
          </label>

          {/* Data Privacy Policy checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={agreedToDataPrivacy}
              onChange={e => setAgreedToDataPrivacy(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-gray-900 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setShowDataPrivacy(true)}
                className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-600 transition-colors"
              >
                Gordon College Data Privacy Policy
              </button>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !agreedToTerms || !agreedToDataPrivacy}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold transition-colors mt-3"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 hover:text-gray-700 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
