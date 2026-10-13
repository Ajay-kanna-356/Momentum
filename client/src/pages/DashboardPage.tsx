import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Target, Clock, CheckCircle2, Bot, BookOpen, ArrowRight } from 'lucide-react';
import { fetchDashboardData, toggleHabitCompletion, createActivity } from '../services/dashboard.service';
import type { DashboardData } from '../services/dashboard.service';
import { fetchGoals, type Goal } from '../services/goal.service';
import { fetchHabits, type Habit as FullHabit } from '../services/habit.service';
import HabitHeatmap from '../components/HabitHeatmap';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allHabits, setAllHabits] = useState<FullHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Quick Add Activity State
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDuration, setActivityDuration] = useState('60');
  const [activityStartTime, setActivityStartTime] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [dashRes, goalsRes, habitsRes] = await Promise.all([
        fetchDashboardData(todayStr),
        fetchGoals().catch(() => []),
        fetchHabits().catch(() => []),
      ]);
      setData(dashRes);
      setGoals(goalsRes);
      setAllHabits(habitsRes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleToggleHabit = async (habitId: number, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;

    // 1. Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const existingLog = prev.habitLogs.find(l => l.habitId === habitId);
      let newLogs = [...prev.habitLogs];
      if (existingLog) {
        newLogs = newLogs.map(l => l.habitId === habitId ? { ...l, completed: nextCompleted } : l);
      } else {
        newLogs.push({ id: Date.now(), habitId, day: todayStr, completed: nextCompleted });
      }
      return { ...prev, habitLogs: newLogs };
    });

    try {
      // 2. Persist to server
      const savedLog = await toggleHabitCompletion(habitId, todayStr, nextCompleted);
      
      // 3. Confirm with server response
      setData((prev) => {
        if (!prev) return prev;
        const otherLogs = prev.habitLogs.filter(l => l.habitId !== habitId);
        return { ...prev, habitLogs: [...otherLogs, savedLog] };
      });
    } catch (err) {
      console.error('Failed to toggle habit:', err);
      // Revert on error
      setData((prev) => {
        if (!prev) return prev;
        const existingLog = prev.habitLogs.find(l => l.habitId === habitId);
        let newLogs = [...prev.habitLogs];
        if (existingLog) {
          newLogs = newLogs.map(l => l.habitId === habitId ? { ...l, completed: currentCompleted } : l);
        } else {
          newLogs = newLogs.filter(l => l.habitId !== habitId);
        }
        return { ...prev, habitLogs: newLogs };
      });
      alert('Failed to update habit status. Please try again.');
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim() || !activityDuration) return;
    
    try {
      setAddingActivity(true);
      await createActivity({
        title: activityTitle,
        day: todayStr,
        duration: parseInt(activityDuration, 10),
        startTime: activityStartTime || undefined,
        // Category is not in backend schema right now, so we skip sending it to backend or prefix title
        // In a real app we'd add it to the schema.
      });
      setActivityTitle('');
      loadDashboard();
    } catch (err) {
      console.error(err);
      alert('Failed to add activity');
    } finally {
      setAddingActivity(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="text-muted">Loading dashboard...</div></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-lg text-danger">
        <p className="font-medium mb-4">{error}</p>
        <button onClick={() => loadDashboard(true)} className="btn-primary">Retry</button>
      </div>
    );
  }

  // Calculate metrics
  // Show scheduled habits plus any other active habits so user always sees all active habits on dashboard
  const scheduledIds = new Set((data.scheduledHabits || []).map(h => h.id));
  const otherActiveHabits = allHabits.filter(h => h.status === 'active' && !scheduledIds.has(h.id));
  const displayHabits = [...(data.scheduledHabits || []), ...otherActiveHabits];

  const completedHabitsCount = displayHabits.filter(h => {
    const log = data.habitLogs.find(l => l.habitId === h.id);
    return !!log?.completed;
  }).length;
  const totalHabitsCount = displayHabits.length;
  const dailyProgress = totalHabitsCount > 0 ? Math.round((completedHabitsCount / totalHabitsCount) * 100) : 0;
  
  const completedGoalsCount = goals.filter(g => g.status === 'completed').length;
  const activeGoalsCount = goals.filter(g => g.status === 'active').length;
  const goalProgress = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;

  const focusTimeMinutes = data.activities.reduce((acc, act) => acc + act.duration, 0);
  const focusTimeHours = Math.floor(focusTimeMinutes / 60);
  const focusTimeMins = focusTimeMinutes % 60;

  // Group activities by title for a simple pie chart equivalent
  const activitySummary = data.activities.reduce((acc: Record<string, number>, act) => {
    acc[act.title] = (acc[act.title] || 0) + act.duration;
    return acc;
  }, {});

  const sortedActivities = Object.entries(activitySummary).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Daily Progress</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-gray-100">
              <div className="absolute inset-0 rounded-full border-4 border-accent" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${dailyProgress}%, 0 ${dailyProgress}%)`}}></div>
              <span className="font-bold text-lg">{dailyProgress}%</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Great job!</span>
              <span className="text-xs text-muted">{completedHabitsCount} of {totalHabitsCount} habits done</span>
            </div>
          </div>
        </div>

        <div className="card justify-between">
          <div className="flex items-center gap-2 mb-2 text-text">
            <Target size={18} className="text-accent" />
            <span className="font-semibold">Active Goals</span>
          </div>
          <div className="flex flex-col mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-2xl">{goalProgress}%</span>
              <span className="text-xs text-muted">({activeGoalsCount} in progress)</span>
            </div>
            <span className="text-xs text-muted mt-1">{completedGoalsCount} of {goals.length} goals achieved</span>
          </div>
        </div>

        <div className="card justify-between">
          <div className="flex items-center gap-2 mb-2 text-text">
            <Clock size={18} className="text-accent" />
            <span className="font-semibold">Focus Time</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="font-bold text-2xl">{focusTimeHours}h {focusTimeMins}m</span>
            <span className="text-xs text-muted mt-1">{data.activities.length} session{data.activities.length === 1 ? '' : 's'} logged today</span>
          </div>
        </div>

        <div className="card justify-between">
          <div className="flex items-center gap-2 mb-2 text-text">
            <CheckCircle2 size={18} className="text-accent" />
            <span className="font-semibold">Habits Completed</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="font-bold text-2xl">{completedHabitsCount} / {totalHabitsCount}</span>
            <span className="text-xs text-muted mt-1">{totalHabitsCount > 0 ? `${dailyProgress}% done today` : 'No habits tracked'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid mt-0">
        
        {/* Left Column: Habits & Goals */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Today's Habits</h3>
              <a href="/habits" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                Manage Habits <ArrowRight size={12} />
              </a>
            </div>
            
            <div className="flex flex-col gap-3">
              {displayHabits.length === 0 ? (
                <div className="text-sm text-muted py-6 text-center bg-gray-50 rounded">
                  No habits added yet. <a href="/habits" className="text-accent underline font-medium">Add one</a>
                </div>
              ) : (
                displayHabits.map(habit => {
                  const log = data.habitLogs.find(l => l.habitId === habit.id);
                  const isCompleted = !!log?.completed;
                  return (
                    <div
                      key={habit.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isCompleted ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                        backgroundColor: isCompleted ? '#f0fdf4' : '#ffffff',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        gap: '12px',
                      }}
                      onClick={() => handleToggleHabit(habit.id, isCompleted)}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: isCompleted ? '2px solid var(--success)' : '2px solid #d1d5db',
                        backgroundColor: isCompleted ? 'var(--success)' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}>
                        {isCompleted && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Habit Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          lineHeight: '1.3',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {habit.title}
                        </div>
                        {(habit as any).goal && (
                          <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500, marginTop: '2px' }}>
                            🎯 {(habit as any).goal.title}
                          </div>
                        )}
                      </div>

                      {/* Done/Todo badge */}
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        flexShrink: 0,
                        backgroundColor: isCompleted ? '#d1fae5' : '#f3f4f6',
                        color: isCompleted ? 'var(--success)' : 'var(--text-muted)',
                      }}>
                        {isCompleted ? '✓ Done' : 'To do'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span>Today's Progress</span>
                <span>{dailyProgress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${dailyProgress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Active Goals Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Target size={16} className="text-accent" /> Your Goals ({goals.length})
              </h3>
              <a href="/goals" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                View All <ArrowRight size={12} />
              </a>
            </div>

            <div className="flex flex-col gap-3">
              {goals.length === 0 ? (
                <div className="text-sm text-muted py-6 text-center bg-gray-50 rounded">
                  No goals created yet. <a href="/goals" className="text-accent underline font-medium">Set a goal</a>
                </div>
              ) : (
                goals.slice(0, 4).map(goal => (
                  <div key={goal.id} className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm leading-tight text-text">{goal.title}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0
                        ${goal.status === 'completed' ? 'bg-green-100 text-success' : 
                          goal.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-accent-light text-accent'}`}>
                        {goal.status}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">{goal.description}</p>
                    )}
                    {goal.targetDate && (
                      <div className="text-[11px] text-muted mt-2">
                        Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Middle Column */}
        <div className="col-span-5 flex flex-col gap-6">
          <HabitHeatmap 
            habits={allHabits} 
            todayHabitLogs={data.habitLogs} 
          />
          
          <div className="card">
            <div className="flex items-start gap-4">
              <Bot className="text-accent mt-1" size={24} />
              <div className="flex flex-col">
                <h3 className="font-semibold mb-2">AI Coach</h3>
                <p className="text-sm text-muted mb-4 leading-relaxed">
                  You completed {dailyProgress}% of your plan today. Your consistency is looking good! Try to focus more on your main goals to improve your overall momentum.
                </p>
                <Link 
                  to="/insights" 
                  className="text-accent text-sm font-medium bg-accent-light px-3 py-1.5 rounded self-start hover:bg-opacity-80 inline-flex items-center gap-1 transition-colors"
                >
                  Weekly AI Review <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-3 flex flex-col gap-6">
          <div className="card bg-accent-light border-accent-border">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-accent" />
              <h3 className="font-semibold">Recent Journal Entry</h3>
            </div>
            {data.journalEntry ? (
              <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                <div className="text-xs text-muted mb-2 font-medium">{format(new Date(data.journalEntry.day), 'dd MMM yyyy')}</div>
                {data.journalEntry.content}
              </div>
            ) : (
              <div className="text-sm text-muted italic">No journal entry for today yet.</div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-accent">✨</span> Quick Add Activity
            </h3>
            <form onSubmit={handleAddActivity} className="flex flex-col gap-3">
              <input 
                id="quick-activity-title"
                aria-label="Activity Title"
                type="text" 
                placeholder="e.g., Played Football" 
                className="input-field text-sm"
                value={activityTitle}
                onChange={e => setActivityTitle(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="quick-activity-duration" className="text-xs text-muted font-medium mb-1 block">Duration (min)</label>
                  <input 
                    id="quick-activity-duration"
                    type="number" 
                    className="input-field text-sm"
                    value={activityDuration}
                    onChange={e => setActivityDuration(e.target.value)}
                    required
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="quick-activity-starttime" className="text-xs text-muted font-medium mb-1 block">Start Time</label>
                  <input 
                    id="quick-activity-starttime"
                    type="time" 
                    className="input-field text-sm"
                    value={activityStartTime}
                    onChange={e => setActivityStartTime(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary mt-2" disabled={addingActivity}>
                {addingActivity ? 'Adding...' : 'Add Activity'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 text-sm">Top Time Spent (Today)</h3>
            <div className="flex flex-col gap-3">
              {sortedActivities.length > 0 ? sortedActivities.slice(0, 4).map(([title, duration], idx) => {
                const percent = Math.round((duration / focusTimeMinutes) * 100);
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
                return (
                  <div key={title} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`}></div>
                      <span className="font-medium truncate max-w-[100px]" title={title}>{title}</span>
                    </div>
                    <div className="flex gap-2 text-muted">
                      <span>{Math.floor(duration/60)}h {duration%60}m</span>
                      <span>({percent}%)</span>
                    </div>
                  </div>
                );
              }) : (
                <span className="text-xs text-muted text-center py-2">No activities recorded today</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
