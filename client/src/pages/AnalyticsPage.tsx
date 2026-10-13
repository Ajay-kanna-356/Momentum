import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Calendar as CalendarIcon, Activity as ActivityIcon } from 'lucide-react';
import { fetchActivities } from '../services/activity.service';
import type { Activity } from '../services/activity.service';
import HabitHeatmap from '../components/HabitHeatmap';

export default function AnalyticsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch up to 100 recent activities to build stats
      const res = await fetchActivities({ limit: 100 });
      setActivities(res.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };



  const totalFocusTime = activities.reduce((acc, act) => acc + (act.duration || 0), 0);
  const avgDailyFocus = Math.round(totalFocusTime / 30); // simplistic avg over 30 days

  // Group activities by title for a simple breakdown
  const activitySummary = activities.reduce((acc: Record<string, number>, act) => {
    acc[act.title] = (acc[act.title] || 0) + (act.duration || 0);
    return acc;
  }, {});
  const sortedActivities = Object.entries(activitySummary).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="text-accent" /> Analytics
          </h2>
          <p className="text-muted text-sm mt-1">Track your momentum over time.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-4 rounded mb-6 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted">Loading analytics...</div>
      ) : (
        <div className="flex flex-col gap-6 pb-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-2 text-text">
                <ActivityIcon size={18} />
                <span className="font-semibold">Total Focus Time (30d)</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-bold text-3xl">{Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m</span>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center gap-2 mb-2 text-text">
                <TrendingUp size={18} />
                <span className="font-semibold">Avg Daily Focus</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-bold text-3xl">{Math.floor(avgDailyFocus / 60)}h {avgDailyFocus % 60}m</span>
                <span className="text-sm text-success flex items-center">
                  +12% <TrendingUp size={12} className="ml-1" />
                </span>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center gap-2 mb-2 text-text">
                <CalendarIcon size={18} />
                <span className="font-semibold">Most Active Day</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-bold text-3xl">Tuesday</span>
              </div>
            </div>
          </div>

          <HabitHeatmap 
            fixedTimeframe="30d" 
            hideTimeframeSelector={true} 
            title="Activity Heatmap (Past 30 Days)" 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-6 text-lg">Top Activities</h3>
              <div className="flex flex-col gap-4">
                {sortedActivities.map(([title, duration], idx) => {
                  const percent = totalFocusTime > 0 ? Math.round((duration / totalFocusTime) * 100) : 0;
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{title}</span>
                        <span className="text-muted">{Math.floor(duration/60)}h {duration%60}m ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
                {sortedActivities.length === 0 && <div className="text-muted text-sm italic">No data available</div>}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
