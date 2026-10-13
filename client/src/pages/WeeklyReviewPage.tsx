import { useState, useEffect } from "react";
import { 
  Bot, 
  Sparkles, 
  Trophy, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  Clock, 
  Lock, 
  RefreshCw, 
  AlertCircle,
  Calendar,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { 
  generateWeeklyReview, 
  fetchLatestWeeklyReview, 
  type WeeklyReviewResponse 
} from "../services/ai.service";
import { format } from "date-fns";

export default function WeeklyReviewPage() {
  const [reviewData, setReviewData] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [includeJournal, setIncludeJournal] = useState<boolean>(false);

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    loadLatestReview();
  }, []);

  const loadLatestReview = async () => {
    try {
      setLoading(true);
      setError(null);
      const latest = await fetchLatestWeeklyReview();
      if (latest) {
        setReviewData(latest);
        setIncludeJournal(Boolean(latest.meta?.includeJournal));
      }
    } catch (err) {
      console.error("Failed to fetch latest review:", err);
      // Non-fatal on mount
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (force = false) => {
    try {
      setGenerating(true);
      setError(null);
      const data = await generateWeeklyReview({
        timezone: userTimezone,
        includeJournal,
        forceRegenerate: force,
      });
      setReviewData(data);
    } catch (err) {
      console.error("Failed to generate review:", err);
      setError(err instanceof Error ? err.message : "Failed to generate AI weekly review");
    } finally {
      setGenerating(false);
    }
  };

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours === 0) return `${m}m`;
    if (m === 0) return `${hours}h`;
    return `${hours}h ${m}m`;
  };

  const formatReviewDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return format(d, "MMM d, yyyy");
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-h)" }}>
                AI Weekly Review
              </h2>
              <p className="text-muted text-sm mt-0.5">
                Evidence-based retrospective powered by Groq analyzing your past 7 completed calendar days.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <label 
            htmlFor="include-journal-toggle"
            className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 text-xs font-medium text-text cursor-pointer hover:bg-gray-50 transition-colors shadow-sm select-none"
            title="When checked, your personal journal reflections will be securely shared with Groq to analyze mindset and blockers."
          >
            <input 
              id="include-journal-toggle"
              type="checkbox"
              checked={includeJournal}
              onChange={(e) => setIncludeJournal(e.target.checked)}
              className="rounded text-accent focus:ring-accent"
              disabled={generating}
            />
            <Lock size={13} className={includeJournal ? "text-accent" : "text-muted"} />
            <span>Include Journal Reflections</span>
          </label>

          <button
            onClick={() => handleGenerate(Boolean(reviewData))}
            disabled={generating}
            className="btn-primary flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Generating Review...</span>
              </>
            ) : reviewData ? (
              <>
                <Sparkles size={16} />
                <span>Regenerate Review</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Weekly Review</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 text-danger p-4 rounded-lg mb-6 border border-red-200 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Unable to generate weekly review</p>
              <p className="text-xs mt-1 text-red-700 leading-relaxed">{error}</p>
              {(error.includes("GROQ_API_KEY") || error.includes("Groq API key") || error.includes("API key")) && (
                <div className="mt-2 text-xs bg-white p-2.5 rounded border border-red-200 text-gray-800">
                  <strong>How to fix:</strong> Paste your Groq API key in <code>Momentum/server/.env</code>:
                  <pre className="bg-gray-100 p-1.5 rounded mt-1 font-mono text-[11px]">GROQ_API_KEY=gsk_your_actual_groq_key_here</pre>
                  Then restart your backend server.
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => handleGenerate(true)}
            className="text-xs bg-white text-danger px-3 py-1.5 rounded border border-red-200 font-semibold hover:bg-red-50 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Generating Loading State */}
      {generating && (
        <div className="card text-center py-16 mb-6 flex flex-col items-center justify-center border-accent border-dashed">
          <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center mb-4 text-accent animate-bounce">
            <Bot size={28} />
          </div>
          <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text-h)" }}>
            Analyzing Your Past 7 Days...
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed mb-4">
            Groq is evaluating your scheduled habits, completed logs, focus duration, and goal alignment to prepare an evidence-based review.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent bg-accent-light px-3 py-1.5 rounded-full">
            <RefreshCw size={13} className="animate-spin" />
            <span>Formulating wins, behavioral patterns & action steps</span>
          </div>
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {loading && !generating && (
        <div className="card text-center py-12 text-muted">
          <p>Loading weekly review...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !generating && !reviewData && !error && (
        <div className="card text-center py-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-light flex items-center justify-center mb-4 text-accent">
            <Bot size={32} />
          </div>
          <h3 className="font-bold text-xl mb-2" style={{ color: "var(--text-h)" }}>
            No Weekly Review Generated Yet
          </h3>
          <p className="text-sm text-muted max-w-lg mx-auto mb-6 leading-relaxed">
            Momentum's AI analyzes your previous 7 completed calendar days to find patterns in your habit consistency, total focus hours, and goal progress.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full text-left mb-8">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-success mb-1">
                <Trophy size={14} /> Evidence-Based Wins
              </span>
              <p className="text-[12px] text-muted">Celebrates exact habit milestones with verified numbers.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-accent mb-1">
                <TrendingUp size={14} /> Observed Patterns
              </span>
              <p className="text-[12px] text-muted">Identifies weekly trends between focus sessions and daily routines.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-warning mb-1">
                <Target size={14} /> Next-Week Actions
              </span>
              <p className="text-[12px] text-muted">Actionable micro-adjustments for higher consistency.</p>
            </div>
          </div>
          <button 
            onClick={() => handleGenerate(false)}
            className="btn-primary flex items-center gap-2 shadow"
          >
            <Sparkles size={16} />
            <span>Generate My Weekly Review</span>
          </button>
        </div>
      )}

      {/* Generated Review Display */}
      {!generating && reviewData && (
        <div className="flex flex-col gap-6 pb-12">
          {/* Review Info Banner */}
          <div className="card bg-accent-light border-accent-border p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-accent shrink-0" />
              <div>
                <span className="font-bold text-sm text-text-h">
                  Review Period: {formatReviewDate(reviewData.period.startDate)} – {formatReviewDate(reviewData.period.endDate)}
                </span>
                <span className="text-xs text-muted ml-2">
                  (7 completed calendar days • {reviewData.period.timezone})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reviewData.meta.includeJournal && (
                <span className="text-[11px] font-semibold bg-white text-accent px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                  <ShieldCheck size={12} /> Journal Included
                </span>
              )}
              {reviewData.meta.cached && (
                <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  Cached
                </span>
              )}
              <span className="text-xs text-muted">
                Generated {format(new Date(reviewData.meta.generatedAt), "MMM d, h:mm a")}
              </span>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
                <CheckCircle2 size={15} className="text-success" />
                <span>Habit Consistency</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>
                {reviewData.metrics.overallHabitCompletionRate}%
              </div>
              <span className="text-[11px] text-muted mt-1">
                {reviewData.metrics.totalCompletedHabitInstances} of {reviewData.metrics.totalScheduledHabitInstances} scheduled
              </span>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
                <Clock size={15} className="text-accent" />
                <span>Total Focus Time</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>
                {formatMinutes(reviewData.metrics.totalFocusMinutes)}
              </div>
              <span className="text-[11px] text-muted mt-1">
                {reviewData.metrics.totalActivities} session{reviewData.metrics.totalActivities === 1 ? "" : "s"} logged
              </span>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
                <Trophy size={15} className="text-warning" />
                <span>Perfect Days</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>
                {reviewData.metrics.perfectDaysCount} / 7
              </div>
              <span className="text-[11px] text-muted mt-1">
                100% scheduled habits completed
              </span>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
                <Target size={15} className="text-accent" />
                <span>Active Goals</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>
                {reviewData.metrics.activeGoalsCount}
              </div>
              <span className="text-[11px] text-muted mt-1">
                Active targets in progress
              </span>
            </div>
          </div>

          {/* Executive Summary Card */}
          <div className="card p-6 border-l-4 border-l-accent shadow-sm">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2" style={{ color: "var(--text-h)" }}>
              <Bot size={18} className="text-accent" /> Executive Summary
            </h3>
            <p className="text-sm leading-relaxed text-text font-normal">
              {reviewData.review.summary}
            </p>
          </div>

          {/* 2-Column Insight Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wins Section */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <Trophy size={18} className="text-success" />
                <h4 className="font-bold text-sm text-text-h">Evidence-Based Wins</h4>
              </div>
              <ul className="flex flex-col gap-3">
                {reviewData.review.wins.map((win, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed bg-green-50/50 p-2.5 rounded-lg border border-green-100">
                    <span className="text-success font-bold mt-0.5">✓</span>
                    <span className="text-text">{win}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Patterns Section */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <TrendingUp size={18} className="text-accent" />
                <h4 className="font-bold text-sm text-text-h">Observed Patterns</h4>
              </div>
              <ul className="flex flex-col gap-3">
                {reviewData.review.patterns.map((pattern, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                    <span className="text-accent font-bold mt-0.5">⚡</span>
                    <span className="text-text">{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <AlertCircle size={18} className="text-warning" />
                <h4 className="font-bold text-sm text-text-h">Areas for Improvement</h4>
              </div>
              <ul className="flex flex-col gap-3">
                {reviewData.review.areasForImprovement.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    <span className="text-warning font-bold mt-0.5">🎯</span>
                    <span className="text-text">{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Recommendations */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <Sparkles size={18} className="text-accent" />
                <h4 className="font-bold text-sm text-text-h">Next-Week Action Plan</h4>
              </div>
              <ul className="flex flex-col gap-3">
                {reviewData.review.actionableRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed bg-accent-light/50 p-2.5 rounded-lg border border-purple-100">
                    <span className="text-accent font-bold mt-0.5"><ArrowRight size={14} /></span>
                    <span className="text-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Habit Consistency Breakdown Table */}
          {reviewData.habits && reviewData.habits.length > 0 && (
            <div className="card p-5">
              <h4 className="font-bold text-sm mb-4 pb-2 border-b flex items-center justify-between">
                <span>Habit Breakdown (7-Day Period)</span>
                <span className="text-xs text-muted font-normal">Based on scheduled vs logged days</span>
              </h4>
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 12px" }}>Habit</th>
                      <th style={{ padding: "8px 12px" }}>Associated Goal</th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>Scheduled Days</th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>Completed</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewData.habits.map((h) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{h.title}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "12px" }}>
                          {h.goalTitle ? `🎯 ${h.goalTitle}` : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{h.scheduledDaysCount} days</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{h.completedDaysCount} days</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                          {h.completionRate !== null ? (
                            <span className={h.completionRate >= 80 ? "text-success" : h.completionRate >= 50 ? "text-accent" : "text-warning"}>
                              {h.completionRate}%
                            </span>
                          ) : (
                            <span className="text-muted">Unscheduled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
