import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Send,
  Flag,
  BookOpen,
  BarChart2,
  Save,
  AlertTriangle,
} from 'lucide-react';

//  Static mock data 

const EXAM = {
  title: 'DSA Final Exam',
  class: 'Data Structures & Algorithms',
  totalMarks: 150,
  passingMarks: 75,
  duration: 120,
  questions: [
    {
      id: 'q1',
      text: 'What is the time complexity of binary search on a sorted array of n elements?',
      type: 'mcq' as const,
      marks: 30,
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
    },
    {
      id: 'q2',
      text: 'In a max-heap data structure, the root node always contains:',
      type: 'mcq' as const,
      marks: 30,
      options: [
        'The minimum element',
        'The maximum element',
        'A random element',
        'The median element',
      ],
    },
    {
      id: 'q3',
      text: 'Describe the difference between depth-first search (DFS) and breadth-first search (BFS). When would you prefer one over the other?',
      type: 'short_answer' as const,
      marks: 40,
      options: [],
    },
    {
      id: 'q4',
      text: "Explain Dijkstra's shortest path algorithm in detail. Discuss its time complexity, the data structures involved, and provide a real-world use case where it would be applied.",
      type: 'essay' as const,
      marks: 50,
      options: [],
    },
    {
      id: 'q5',
      text: 'Which sorting algorithm has the best average-case time complexity?',
      type: 'mcq' as const,
      marks: 20,
      options: ['Bubble Sort', 'Merge Sort', 'Insertion Sort', 'Selection Sort'],
    },
  ],
};

const PRESET_ANSWERS: Record<string, string> = {
  q1: 'O(log n)',
  q2: 'The maximum element',
  q3: 'DFS explores as far as possible along a branch before backtracking, using a stack (or recursion). BFS explores all neighbours at the current depth before going deeper, using a queue. DFS is preferred for detecting cycles or topological sorting, while BFS is ideal for finding the shortest path in unweighted graphs.',
};

const PRESET_FLAGGED = new Set(['q4']);

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

//  Component 

export function ExamTakingPreview() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(PRESET_ANSWERS);
  const [flagged, setFlagged] = useState<Set<string>>(new Set(PRESET_FLAGGED));
  // Start timer mid-way through a 120-min exam (≈ 48 min left)
  const [timeLeft, setTimeLeft] = useState(48 * 60 + 17);
  const [lastSaved] = useState(new Date());
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const answeredCount = EXAM.questions.filter(q => answers[q.id]?.trim()).length;
  const flaggedCount = flagged.size;
  const progressPct = Math.round((answeredCount / EXAM.questions.length) * 100);
  const isUrgent = timeLeft < 300;
  const isVeryUrgent = timeLeft < 60;

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isAnswered = (qId: string) => !!answers[qId]?.trim();
  const isFlagged = (qId: string) => flagged.has(qId);

  const toggleFlag = (qId: string) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const getQButtonClass = (i: number, qId: string) => {
    const base = 'w-9 h-9 text-xs font-semibold rounded-lg transition-colors relative ';
    if (currentQ === i) return base + 'bg-gray-900 text-white';
    if (isAnswered(qId) && isFlagged(qId))
      return base + 'bg-gray-300 text-gray-700 ring-2 ring-gray-500 ring-offset-1';
    if (isAnswered(qId)) return base + 'bg-gray-200 text-gray-700';
    if (isFlagged(qId)) return base + 'bg-white text-gray-600 border-2 border-gray-400';
    return base + 'bg-gray-100 text-gray-500 hover:bg-gray-200';
  };

  const question = EXAM.questions[currentQ];
  const wordCount = (answers[question.id] || '').trim().split(/\s+/).filter(Boolean).length;
  const charCount = (answers[question.id] || '').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/*  Top Header  */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="px-5 py-3 flex items-center justify-between gap-4">
          {/* Left: exam info */}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{EXAM.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{EXAM.class}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                {answeredCount}/{EXAM.questions.length} answered
              </span>
              {flaggedCount > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{flaggedCount} flagged</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Auto-save */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Save className="w-3 h-3" />
              <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-sm font-bold transition-all ${
                isVeryUrgent
                  ? 'bg-gray-900 text-white animate-pulse'
                  : isUrgent
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              {formatTime(timeLeft)}
            </div>

            {/* Submit */}
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors">
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
        </div>
      </div>

      {/*  Body  */}
      <div className="flex flex-1 overflow-hidden">

        {/*  Left sidebar  */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              Questions
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {EXAM.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  title={`Question ${i + 1}${isAnswered(q.id) ? ' · answered' : ''}${isFlagged(q.id) ? ' · flagged' : ''}`}
                  className={getQButtonClass(i, q.id)}
                >
                  {i + 1}
                  {isFlagged(q.id) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gray-500 rounded-full border border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 space-y-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Legend
            </div>
            {[
              { swatch: 'bg-gray-900', label: 'Current' },
              { swatch: 'bg-gray-200', label: 'Answered' },
              { swatch: 'bg-white border-2 border-gray-400', label: 'Flagged' },
              { swatch: 'bg-gray-100 border border-gray-200', label: 'Unanswered' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded flex-shrink-0 ${item.swatch}`} />
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <BarChart2 className="w-3.5 h-3.5" />
              Progress
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Answered</span>
                <span className="font-semibold text-gray-900">
                  {answeredCount}/{EXAM.questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Unanswered</span>
                <span className="font-semibold text-gray-900">
                  {EXAM.questions.length - answeredCount}
                </span>
              </div>
              {flaggedCount > 0 && (
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Flagged</span>
                  <span className="font-semibold text-gray-900">{flaggedCount}</span>
                </div>
              )}
            </div>

            {/* Marks summary */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Exam Info</div>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Total marks</span>
                  <span className="font-semibold text-gray-900">{EXAM.totalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pass mark</span>
                  <span className="font-semibold text-gray-900">{EXAM.passingMarks}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/*  Main: Question Content  */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Question Card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                    Q{currentQ + 1} of {EXAM.questions.length}
                  </span>
                  <span className="text-xs text-gray-400 capitalize bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                    {question.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold bg-gray-900 text-white px-2.5 py-1 rounded-lg">
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </span>
                </div>
                <button
                  onClick={() => toggleFlag(question.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                    isFlagged(question.id)
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {isFlagged(question.id) ? 'Flagged' : 'Flag'}
                </button>
              </div>

              {/* Question body */}
              <div className="px-6 py-5">
                <p className="text-gray-900 text-base leading-relaxed mb-5 font-medium">
                  {question.text}
                </p>

                {/* MCQ */}
                {question.type === 'mcq' && question.options.length > 0 && (
                  <div className="space-y-2.5">
                    {question.options.map((opt, i) => {
                      const selected = answers[question.id] === opt;
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            selected
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={selected}
                            onChange={() =>
                              setAnswers(prev => ({ ...prev, [question.id]: opt }))
                            }
                          />
                          <div
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                              selected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {OPTION_LETTERS[i]}
                          </div>
                          <span
                            className={`text-sm leading-relaxed flex-1 ${
                              selected ? 'text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {opt}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-gray-900 flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {question.type === 'short_answer' && (
                  <div>
                    <textarea
                      rows={5}
                      placeholder="Type your answer here..."
                      value={answers[question.id] || ''}
                      onChange={e =>
                        setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none leading-relaxed"
                    />
                    <div className="flex justify-end mt-1.5 gap-3 text-xs text-gray-400">
                      <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                      <span>{charCount} chars</span>
                    </div>
                  </div>
                )}

                {/* Essay */}
                {question.type === 'essay' && (
                  <div>
                    <textarea
                      rows={10}
                      placeholder="Write your detailed answer here..."
                      value={answers[question.id] || ''}
                      onChange={e =>
                        setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                      <span className="italic">Tip: Structure your answer with clear key points.</span>
                      <div className="flex gap-3">
                        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                        <span>{charCount} chars</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flag reminder */}
                {isFlagged(question.id) && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <Flag className="w-3.5 h-3.5 flex-shrink-0" />
                    This question is flagged for review. Remember to revisit before submitting.
                  </div>
                )}
              </div>
            </div>

            {/* Navigation row */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                disabled={currentQ === 0}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Mobile dots */}
              <div className="md:hidden flex gap-1 overflow-x-auto max-w-[100px]">
                {EXAM.questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(i)}
                    className={`flex-shrink-0 w-2 h-2 rounded-full transition-colors ${
                      currentQ === i
                        ? 'bg-gray-900'
                        : isAnswered(q.id)
                        ? 'bg-gray-400'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {currentQ < EXAM.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ(prev => Math.min(EXAM.questions.length - 1, prev + 1))}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                  <Send className="w-4 h-4" />
                  Submit Exam
                </button>
              )}
            </div>

            {/* Unanswered warning (show when on last question) */}
            {currentQ === EXAM.questions.length - 1 &&
              answeredCount < EXAM.questions.length && (
              <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  You have{' '}
                  <strong className="text-gray-900">
                    {EXAM.questions.length - answeredCount} unanswered question(s)
                  </strong>
                  . Unanswered questions will receive 0 marks.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
