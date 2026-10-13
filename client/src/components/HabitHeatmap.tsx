import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  isSameDay, 
  isAfter,
  startOfToday
} from 'date-fns';
import { fetchHabits, fetchUserHabitLogs, type Habit, type HabitLog } from '../services/habit.service';

interface HabitHeatmapProps {
  habits?: Habit[];
  todayHabitLogs?: HabitLog[];
  className?: string;
  fixedTimeframe?: '30d' | '1m' | '3m' | '6m';
  title?: string;
  hideTimeframeSelector?: boolean;
}

type TimeframeOption = '3m' | '6m' | '1m';

interface DayInfo {
  date: Date;
  dateStr: string;
  dayOfWeek: number; // 0=Mon, ... 6=Sun
  dayOfWeekName: string; // 'MONDAY', etc.
  isToday: boolean;
  isFuture: boolean;
  totalExpected: number;
  completedCount: number;
  percentage: number;
  monthLabel?: string;
}

interface HoverState {
  info: DayInfo;
  rect: DOMRect;
}

export default function HabitHeatmap({ 
  habits, 
  todayHabitLogs = [], 
  className = '',
  fixedTimeframe,
  title,
  hideTimeframeSelector = false
}: HabitHeatmapProps) {
  const [internalHabits, setInternalHabits] = useState<Habit[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeOption>(() => {
    if (fixedTimeframe === '30d' || fixedTimeframe === '1m') return '1m';
    if (fixedTimeframe === '6m') return '6m';
    return '3m';
  });
  const [historyLogs, setHistoryLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const today = useMemo(() => startOfToday(), []);

  // Fetch habits if not provided
  useEffect(() => {
    if (!habits || habits.length === 0) {
      fetchHabits().then(setInternalHabits).catch(console.error);
    }
  }, [habits]);

  const activeHabits = useMemo(() => {
    const list = habits && habits.length > 0 ? habits : internalHabits;
    return list.filter(h => h.status === 'active');
  }, [habits, internalHabits]);

  // Determine number of weeks based on timeframe
  const numWeeks = useMemo(() => {
    const selected = fixedTimeframe ? (fixedTimeframe === '30d' ? '1m' : fixedTimeframe) : timeframe;
    switch (selected) {
      case '1m': return 5;
      case '6m': return 26;
      case '3m':
      default: return 14;
    }
  }, [timeframe, fixedTimeframe]);

  // Date range
  const { start, end } = useMemo(() => {
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const start = startOfWeek(subWeeks(today, numWeeks - 1), { weekStartsOn: 1 });
    return { start, end };
  }, [today, numWeeks]);

  // Fetch history logs
  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        setLoading(true);
        const fromStr = format(start, 'yyyy-MM-dd');
        const toStr = format(today, 'yyyy-MM-dd');
        const logs = await fetchUserHabitLogs(fromStr, toStr);
        if (!cancelled) {
          setHistoryLogs(logs || []);
        }
      } catch (err) {
        console.error('Failed to load habit history logs for heatmap:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [start, today]);

  // Map of dateStr -> completed habits count
  const logsByDate = useMemo(() => {
    const map = new Map<string, { completedIds: Set<number> }>();

    // Fill from history logs
    for (const log of historyLogs) {
      if (!log.day) continue;
      const dateKey = log.day.slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, { completedIds: new Set<number>() });
      }
      if (log.completed) {
        map.get(dateKey)!.completedIds.add(log.habitId);
      }
    }

    // Merge/override with todayHabitLogs for today's live updates
    const todayKey = format(today, 'yyyy-MM-dd');
    if (todayHabitLogs.length > 0) {
      const todaySet = new Set<number>();
      for (const log of todayHabitLogs) {
        if (log.completed) {
          todaySet.add(log.habitId);
        }
      }
      map.set(todayKey, { completedIds: todaySet });
    }

    return map;
  }, [historyLogs, todayHabitLogs, today]);

  // Build weeks grid
  const { weeks, monthHeaders, stats } = useMemo(() => {
    const weekStarts = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    const weeksData: DayInfo[][] = [];
    const monthHeadersList: { colIndex: number; label: string }[] = [];

    let totalCompletedDays = 0;
    let perfect100Days = 0;
    let pastDaysCount = 0;

    let lastMonth = '';

    weekStarts.forEach((weekStart, colIdx) => {
      const daysInWeek = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 })
      });

      // Month label for the column if month changes
      const midWeekDay = daysInWeek[3] || daysInWeek[0];
      const currentMonth = format(midWeekDay, 'MMM');
      if (currentMonth !== lastMonth) {
        monthHeadersList.push({ colIndex: colIdx, label: currentMonth });
        lastMonth = currentMonth;
      }

      const weekDays: DayInfo[] = daysInWeek.map((dayDate, dayIdx) => {
        const dateStr = format(dayDate, 'yyyy-MM-dd');
        const dayOfWeekName = format(dayDate, 'EEEE').toUpperCase();
        const isToday = isSameDay(dayDate, today);
        const isFuture = isAfter(dayDate, today);

        // Calculate expected habits for this weekday
        let expectedForDay = activeHabits.filter(h => {
          if (!h.schedules || h.schedules.length === 0) return true;
          return h.schedules.some(s => s.dayOfWeek === dayOfWeekName);
        });

        if (expectedForDay.length === 0 && activeHabits.length > 0) {
          expectedForDay = activeHabits;
        }

        const totalExpected = expectedForDay.length;

        // Get completed count
        const dayData = logsByDate.get(dateStr);
        const completedCount = dayData ? dayData.completedIds.size : 0;

        let percentage = 0;
        if (totalExpected > 0) {
          percentage = Math.min(100, Math.round((completedCount / totalExpected) * 100));
        } else if (completedCount > 0) {
          percentage = 100;
        }

        if (!isFuture) {
          pastDaysCount++;
          if (completedCount > 0) totalCompletedDays++;
          if (percentage >= 100 && completedCount > 0) perfect100Days++;
        }

        return {
          date: dayDate,
          dateStr,
          dayOfWeek: dayIdx,
          dayOfWeekName,
          isToday,
          isFuture,
          totalExpected,
          completedCount,
          percentage
        };
      });

      weeksData.push(weekDays);
    });

    const consistencyRate = pastDaysCount > 0 ? Math.round((totalCompletedDays / pastDaysCount) * 100) : 0;

    return {
      weeks: weeksData,
      monthHeaders: monthHeadersList,
      stats: {
        totalCompletedDays,
        perfect100Days,
        consistencyRate
      }
    };
  }, [start, end, today, activeHabits, logsByDate]);

  // Color logic strictly according to user instructions:
  // - 100% completed: Dark Green (#216e39)
  // - Partial completed: Lesser Green (#30a14e or #9be9a8)
  // - Blank / 0 completed: Blank (#ebedf0)
  const getCellStyles = (day: DayInfo): React.CSSProperties => {
    if (day.isFuture) {
      return {
        backgroundColor: '#f9fafb',
        border: '1px dashed #e5e7eb',
        opacity: 0.5,
        cursor: 'default',
      };
    }

    let bg = '#ebedf0'; // Blank / GitHub empty
    let border = '1px solid #dcdfe3';

    if (day.percentage >= 100 && day.completedCount > 0) {
      // 100% Completed -> Dark Green (GitHub iconic #216e39)
      bg = '#216e39';
      border = '1px solid #19522b';
    } else if (day.completedCount > 0) {
      // Partial Completed -> Lesser Green
      if (day.percentage >= 50) {
        // Medium green (GitHub #30a14e)
        bg = '#30a14e';
        border = '1px solid #24813e';
      } else {
        // Light green (GitHub #9be9a8)
        bg = '#9be9a8';
        border = '1px solid #7bc988';
      }
    }

    return {
      backgroundColor: bg,
      border,
      boxShadow: day.isToday ? '0 0 0 2px #5e35b1' : 'none',
      cursor: 'pointer',
    };
  };

  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <div className={`card ${className}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Title and Timeframe Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🟩</span>
            <h3 style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-h)', margin: 0 }}>
              {title || "Habit Activity Heatmap"}
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
            {stats.totalCompletedDays} active days • {stats.perfect100Days} perfect days (100% habits)
          </p>
        </div>

        {/* Timeframe Selector Pills (hidden if fixedTimeframe or hideTimeframeSelector is true) */}
        {!hideTimeframeSelector && !fixedTimeframe && (
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
            {(['1m', '3m', '6m'] as TimeframeOption[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                style={{
                  border: 'none',
                  background: timeframe === t ? '#ffffff' : 'transparent',
                  color: timeframe === t ? 'var(--text-h)' : 'var(--text-muted)',
                  fontWeight: timeframe === t ? 600 : 500,
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: timeframe === t ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t === '1m' ? '1 Month' : t === '3m' ? '3 Months' : '6 Months'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Heatmap Grid Container */}
      <div style={{ overflowX: 'auto', paddingBottom: '6px', position: 'relative' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 'min-content' }}>
          
          {/* Month Labels Row */}
          <div style={{ display: 'flex', marginLeft: '32px', marginBottom: '4px', height: '16px' }}>
            {weeks.map((_, colIdx) => {
              const header = monthHeaders.find(m => m.colIndex === colIdx);
              return (
                <div 
                  key={colIdx} 
                  style={{ 
                    width: '14px', 
                    marginRight: '3px', 
                    fontSize: '10px', 
                    fontWeight: 600, 
                    color: '#656d76',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header ? header.label : ''}
                </div>
              );
            })}
          </div>

          {/* 7 Days of the Week Grid */}
          <div style={{ display: 'flex' }}>
            {/* Day of Week Labels (Mon, Wed, Fri) */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '32px', gap: '3px', paddingRight: '6px' }}>
              {dayLabels.map((label, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    height: '14px', 
                    fontSize: '9px', 
                    fontWeight: 500, 
                    color: '#656d76', 
                    lineHeight: '14px',
                    textAlign: 'right',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks Columns */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {weeks.map((week, colIdx) => (
                <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {week.map((day) => {
                    const styles = getCellStyles(day);
                    return (
                      <div
                        key={day.dateStr}
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '2.5px',
                          transition: 'transform 0.1s ease, filter 0.1s ease',
                          ...styles,
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHovered({ info: day, rect });
                        }}
                        onMouseLeave={() => setHovered(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hovered && (
          <div
            style={{
              position: 'fixed',
              top: `${hovered.rect.top - 58}px`,
              left: `${hovered.rect.left + hovered.rect.width / 2}px`,
              transform: 'translateX(-50%)',
              backgroundColor: '#1f2937',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              pointerEvents: 'none',
              zIndex: 9999,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
              {format(hovered.info.date, 'EEEE, MMM d, yyyy')}
              {hovered.info.isToday && <span style={{ color: '#a78bfa', marginLeft: '4px', fontWeight: 700 }}>(Today)</span>}
            </div>
            <div>
              {hovered.info.isFuture ? (
                <span style={{ color: '#9ca3af' }}>Future date</span>
              ) : hovered.info.completedCount === 0 ? (
                <span style={{ color: '#e5e7eb' }}>No habits completed</span>
              ) : hovered.info.percentage >= 100 ? (
                <span style={{ color: '#4ade80', fontWeight: 600 }}>
                  ✓ 100% habits completed ({hovered.info.completedCount}/{hovered.info.totalExpected})
                </span>
              ) : (
                <span style={{ color: '#86efac', fontWeight: 600 }}>
                  ⚡ Partial completed: {hovered.info.percentage}% ({hovered.info.completedCount}/{hovered.info.totalExpected})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginTop: '16px', 
          paddingTop: '12px', 
          borderTop: '1px solid #f3f4f6',
          fontSize: '11px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Consistency:</span>
          <strong style={{ color: 'var(--text-h)' }}>{stats.consistencyRate}%</strong>
          <span style={{ margin: '0 4px' }}>•</span>
          <span>{loading ? 'Refreshing...' : 'Real-time sync'}</span>
        </div>

        {/* GitHub Style Color Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>Less</span>
          
          {/* Blank (0% completed) */}
          <div 
            title="Blank: No habits completed (0%)"
            style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#ebedf0', border: '1px solid #dcdfe3' }} 
          />
          
          {/* Lesser Green (1% - 49%) */}
          <div 
            title="Lesser Green: Partial (<50%)"
            style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#9be9a8', border: '1px solid #7bc988' }} 
          />
          
          {/* Medium Green (50% - 99%) */}
          <div 
            title="Lesser Green: Partial (50%-99%)"
            style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#30a14e', border: '1px solid #24813e' }} 
          />
          
          {/* Dark Green (100% completed) */}
          <div 
            title="Dark Green: 100% habits completed"
            style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#216e39', border: '1px solid #19522b' }} 
          />

          <span>More</span>
          <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, marginLeft: '4px' }}>
            (Dark = 100%)
          </span>
        </div>
      </div>
    </div>
  );
}
