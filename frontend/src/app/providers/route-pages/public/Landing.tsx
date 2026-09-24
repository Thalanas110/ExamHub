import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';

const features = [
  { icon: ShieldCheck, title: 'Proctored by Default', text: 'Full-screen enforcement, tab-switch & monitor detection built into every exam.', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { icon: Zap, title: 'Instant Auto-Grading', text: 'Objectives scored on submission. Essays routed to teacher review queues.', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { icon: BarChart3, title: 'Question Intelligence', text: 'Per-question analytics surface difficulty, time-on-task, and answer patterns.', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  { icon: Users, title: 'Role-Based Workflows', text: 'Purpose-built dashboards for students, teachers, and admins.', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
];

const steps = [
  { icon: ClipboardCheck, step: '01', title: 'Create', text: 'Build exams with MCQ, short-answer, and essay sections. Set time limits and per-student accommodations.' },
  { icon: ShieldAlert, step: '02', title: 'Deliver Securely', text: 'Publish to a class. Full-screen proctoring and real-time violation tracking activate automatically.' },
  { icon: FileCheck2, step: '03', title: 'Grade', text: 'Auto-score objectives instantly. Teachers review essays with partial credit and inline comments.' },
  { icon: BarChart3, step: '04', title: 'Analyze', text: 'Class dashboards, per-student breakdowns, and exportable question analytics — all in one place.' },
];

const roles = [
  { icon: GraduationCap, label: 'Students', desc: 'Take exams, view graded results with feedback.' },
  { icon: BookOpen, label: 'Teachers', desc: 'Create exams, grade submissions, monitor classes.' },
  { icon: ShieldCheck, label: 'Admins', desc: 'Manage users, logs, reports, and platform settings.' },
];

export function Landing() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate(`/${currentUser.role}`, { replace: true });
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-[#f2eadc] p-3 sm:p-5 flex items-stretch overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-orange-300/25 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-teal-300/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-[1.08fr_0.92fr] gap-3 sm:gap-4 auto-rows-fr min-w-0">

        {/* ── Left: Hero + Features ──────────────────────────────────── */}
        <div className="bg-white/85 backdrop-blur-xl rounded-[2rem] border border-[#22312b]/10 shadow-[0_30px_80px_-30px_rgba(34,49,43,0.20)] p-5 sm:p-9 lg:p-10 flex flex-col min-h-[calc(100vh-2.5rem)] min-w-0">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-9">
            <div className="w-10 h-10 rounded-2xl bg-[#22312b] flex items-center justify-center shadow-md">
              <BookOpen className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#22312b] tracking-tight leading-none">ExamHub</div>
              <div className="text-[10px] text-[#22312b]/50 uppercase tracking-[0.14em] mt-0.5">Online Examination System</div>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex self-start items-center gap-1.5 bg-[#22312b]/7 border border-[#22312b]/12 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-[#22312b] mb-5 tracking-wide uppercase">
            <ShieldCheck className="w-3 h-3" />
            Academic integrity built in
          </div>

          {/* Headline */}
          <h1
            className="text-[2.15rem] sm:text-5xl font-bold leading-[1.04] tracking-tight text-[#22312b] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Exams that are hard
            <br />
            <span className="text-[#a86a3a]">to cheat.</span>
            <br />
            Easy to grade.
          </h1>

          <p className="text-[#304239]/65 text-sm leading-relaxed mb-7 max-w-md">
            One platform to create, deliver, proctor, grade, and analyze academic assessments. Built for institutions that take integrity seriously.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2.5 mb-auto">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#22312b] text-white text-sm font-semibold hover:bg-[#304239] transition-colors shadow-lg shadow-[#22312b]/20"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[#22312b]/20 text-[#22312b] text-sm font-semibold hover:bg-[#22312b]/6 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8">
            {features.map(({ icon: Icon, title, text, color, bg, border }) => (
              <div key={title} className={`rounded-2xl border ${border} ${bg} p-4`}>
                <div className={`w-8 h-8 rounded-xl bg-white border ${border} flex items-center justify-center mb-3 shadow-sm`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className="text-xs font-bold text-gray-900 mb-1">{title}</div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Lifecycle + Roles ───────────────────────────────── */}
        <div className="bg-[#22312b] rounded-[2rem] shadow-[0_30px_80px_-30px_rgba(34,49,43,0.45)] p-5 sm:p-9 lg:p-10 flex flex-col min-h-[calc(100vh-2.5rem)] min-w-0">

          <div className="mb-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c69a4d] mb-2">How it works</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              From question to grade
              <br />
              in four steps
            </h2>
          </div>

          {/* Connected steps */}
          <div className="flex-1 flex flex-col mb-8">
            {steps.map(({ icon: Icon, step, title, text }, i) => (
              <div key={title} className="flex gap-4 flex-1">
                {/* Indicator + connector line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white/75" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 bg-white/10 my-1.5" />
                  )}
                </div>
                {/* Content */}
                <div className={`${i < steps.length - 1 ? 'pb-5' : ''} pt-1 min-w-0`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-[#c69a4d] tracking-[0.18em]">{step}</span>
                    <span className="text-sm font-bold text-white">{title}</span>
                  </div>
                  <p className="text-[12px] text-white/45 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-6" />

          {/* Roles */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c69a4d] mb-3">Who it's for</div>
            <div className="space-y-2">
              {roles.map(({ icon: Icon, label, desc }) => (
                <Link
                  key={label}
                  to="/login"
                  className="flex items-center gap-3.5 bg-white/6 hover:bg-white/11 border border-white/10 rounded-2xl px-4 py-3 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white/90 group-hover:text-white transition-colors">{label}</div>
                    <div className="text-[11px] text-white/40 leading-tight mt-0.5 truncate">{desc}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/25 group-hover:text-white/60 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
