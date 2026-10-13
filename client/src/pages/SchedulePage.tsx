import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { fetchHabits } from '../services/habit.service';
import type { Habit } from '../services/habit.service';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function SchedulePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await fetchHabits();
      setHabits(data.filter(h => h.status === 'active'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const currentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const daysInWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

  const getHabitsForDay = (date: Date) => {
    const dayName = format(date, 'EEEE').toUpperCase(); // MONDAY, TUESDAY...
    return habits.filter(h => h.schedules?.some(s => s.dayOfWeek === dayName));
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-accent" /> Weekly Schedule
          </h2>
          <p className="text-muted text-sm mt-1">Your habits mapped out across the week.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          <button onClick={prevWeek} className="p-2 hover:bg-gray-50 rounded">
            <ChevronLeft size={20} className="text-muted hover:text-text" />
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 font-medium text-sm">
            <span>{format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}</span>
          </div>
          
          <button onClick={nextWeek} className="p-2 hover:bg-gray-50 rounded">
            <ChevronRight size={20} className="text-muted hover:text-text" />
          </button>
          
          <button onClick={currentWeek} className="px-3 py-1.5 text-xs font-semibold text-accent border-l hover:bg-gray-50">
            This Week
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-4 rounded mb-6 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted">Loading schedule...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1">
          {daysInWeek.map((day, idx) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const dayHabits = getHabitsForDay(day);
            
            return (
              <div key={idx} className={`card flex flex-col p-4 ${isToday ? 'border-accent shadow-sm' : ''}`}>
                <div className={`text-center pb-3 border-b mb-3 ${isToday ? 'text-accent' : ''}`}>
                  <div className="text-sm font-semibold uppercase">{format(day, 'eee')}</div>
                  <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-accent' : 'text-text'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                  {dayHabits.length > 0 ? (
                    dayHabits.map(habit => (
                      <div key={habit.id} className="bg-gray-50 border rounded p-2 text-sm flex items-start gap-2 hover:bg-accent-light hover:border-accent transition-colors">
                        <Activity size={14} className="text-accent mt-0.5 shrink-0" />
                        <span className="leading-tight">{habit.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted text-center py-4 italic">No habits scheduled</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
