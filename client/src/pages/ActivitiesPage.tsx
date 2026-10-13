import { useState, useEffect } from 'react';
import { PlayCircle, Plus, Edit2, Trash2, Calendar, Clock, Activity as ActivityIcon, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { fetchActivities, createActivityReq, updateActivity, deleteActivity } from '../services/activity.service';
import type { Activity, CreateActivityDto, UpdateActivityDto } from '../services/activity.service';
import { fetchHabits } from '../services/habit.service';
import type { Habit } from '../services/habit.service';
import { format } from 'date-fns';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDay, setFilterDay] = useState('');
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [day, setDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState('60');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [habitId, setHabitId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [page, filterDay]);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const filters: any = { page, limit: 10 };
      if (filterDay) filters.day = filterDay;
      
      const res = await fetchActivities(filters);
      setActivities(res.items || []);
      setTotalPages(Math.ceil((res.total || 0) / (res.limit || 10)) || 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const loadHabits = async () => {
    try {
      const data = await fetchHabits();
      setHabits(data.filter(h => h.status === 'active'));
    } catch (err) {
      console.error('Failed to load habits', err);
    }
  };

  const openCreateModal = () => {
    setEditingActivity(null);
    setTitle('');
    setDescription('');
    setDay(format(new Date(), 'yyyy-MM-dd'));
    setDuration('60');
    setStartTime('');
    setEndTime('');
    setHabitId('');
    setIsModalOpen(true);
  };

  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity);
    setTitle(activity.title);
    setDescription(activity.description || '');
    setDay(activity.day.split('T')[0]);
    setDuration(activity.duration ? activity.duration.toString() : '');
    
    // API returns times like "14:30:00", we need "HH:mm" for input type="time"
    setStartTime(activity.startTime ? activity.startTime.slice(0, 5) : '');
    setEndTime(activity.endTime ? activity.endTime.slice(0, 5) : '');
    
    setHabitId(activity.habitId ? activity.habitId.toString() : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !day) return;
    
    setSubmitting(true);
    try {
      const parsedHabitId = habitId ? parseInt(habitId, 10) : null;
      const parsedDuration = duration ? parseInt(duration, 10) : undefined;
      
      if (editingActivity) {
        const payload: UpdateActivityDto = { title, day };
        payload.description = description;
        payload.habitId = parsedHabitId;
        if (parsedDuration !== undefined) payload.duration = parsedDuration;
        if (startTime) payload.startTime = startTime + ':00'; // backend expects HH:mm:ss
        if (endTime) payload.endTime = endTime + ':00';
        
        await updateActivity(editingActivity.id, payload);
      } else {
        const payload: CreateActivityDto = { title, day };
        payload.description = description;
        payload.habitId = parsedHabitId;
        if (parsedDuration !== undefined) payload.duration = parsedDuration;
        if (startTime) payload.startTime = startTime + ':00';
        if (endTime) payload.endTime = endTime + ':00';
        
        await createActivityReq(payload);
      }
      await loadActivities();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      await deleteActivity(id);
      await loadActivities();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete activity');
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    // If it's an ISO timestamp e.g. "1970-01-01T14:30:00.000Z"
    if (timeStr.includes('T')) {
      const match = timeStr.match(/T(\d{2}:\d{2})/);
      return match ? match[1] : null;
    }
    // If it's "HH:mm" or "HH:mm:ss"
    if (/^\d{2}:\d{2}/.test(timeStr)) {
      return timeStr.slice(0, 5);
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PlayCircle className="text-accent" /> Activities
          </h2>
          <p className="text-muted text-sm mt-1">Log your focused time and efforts.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Activity
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Filter size={16} className="text-muted" />
          <span className="font-medium text-text">Filter:</span>
        </div>
        <input 
          type="date" 
          className="input-field text-sm w-auto py-1"
          value={filterDay}
          onChange={(e) => {
            setFilterDay(e.target.value);
            setPage(1);
          }}
        />
        {filterDay && (
          <button 
            onClick={() => { setFilterDay(''); setPage(1); }}
            className="text-xs text-muted hover:text-danger ml-2"
          >
            Clear Filter
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-4 rounded mb-6 border border-red-100">
          {error}
        </div>
      )}

      {loading && activities.length === 0 ? (
        <div className="p-8 text-center text-muted flex-1">Loading activities...</div>
      ) : activities.length === 0 && !error ? (
        <div className="card text-center py-12 flex flex-col items-center flex-1">
          <ActivityIcon size={48} className="text-gray-300 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No activities found</h3>
          <p className="text-muted text-sm mb-4">Start tracking your time to see it here.</p>
          {!filterDay && <button onClick={openCreateModal} className="btn-primary">Log First Activity</button>}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: '#f9fafb' }}>
                    <th style={{ width: '35%', padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity Title</th>
                    <th style={{ width: '22%', padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day & Time</th>
                    <th style={{ width: '14%', padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                    <th style={{ width: '19%', padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked Habit</th>
                    <th style={{ width: '10%', padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act) => {
                    const startFormatted = formatTime(act.startTime);
                    const endFormatted = formatTime(act.endTime);
                    const hasTimeRange = Boolean(startFormatted || endFormatted);

                    return (
                      <tr
                        key={act.id}
                        style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Title */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <ActivityIcon size={16} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={act.title}>
                                {act.title}
                              </div>
                              {act.description && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }} title={act.description}>
                                  {act.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Day & Time */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                              <Calendar size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                              {format(new Date(act.day), 'MMM d, yyyy')}
                            </span>
                            {hasTimeRange ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <Clock size={12} style={{ flexShrink: 0 }} />
                                {startFormatted || '--:--'} – {endFormatted || '--:--'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No time set</span>
                            )}
                          </div>
                        </td>

                        {/* Duration */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#f3f4f6',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text)',
                          }}>
                            {formatDuration(act.duration)}
                          </span>
                        </td>

                        {/* Habit */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          {act.habit ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
                              padding: '4px 10px', borderRadius: '999px',
                              fontSize: '12px', fontWeight: 500,
                              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', flexShrink: 0 }}></span>
                              {act.habit.title}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <button
                              onClick={() => openEditModal(act)}
                              title="Edit activity"
                              style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(act.id)}
                              title="Delete activity"
                              style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 px-2">
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingActivity ? 'Edit Activity' : 'Log Activity'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="activity-title-input" className="block text-sm font-medium mb-1">Title *</label>
                <input 
                  id="activity-title-input"
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input-field" 
                  placeholder="e.g., Deep Work, Read a book"
                  required 
                />
              </div>
              
              <div>
                <label htmlFor="activity-desc-input" className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  id="activity-desc-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input-field resize-none h-20" 
                  placeholder="What did you accomplish?"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="activity-day-input" className="block text-sm font-medium mb-1">Day *</label>
                  <input 
                    id="activity-day-input"
                    type="date" 
                    value={day}
                    onChange={e => setDay(e.target.value)}
                    className="input-field" 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="activity-duration-input" className="block text-sm font-medium mb-1">Duration (min)</label>
                  <input 
                    id="activity-duration-input"
                    type="number" 
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="input-field" 
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="activity-starttime-input" className="block text-sm font-medium mb-1">Start Time</label>
                  <input 
                    id="activity-starttime-input"
                    type="time" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label htmlFor="activity-endtime-input" className="block text-sm font-medium mb-1">End Time</label>
                  <input 
                    id="activity-endtime-input"
                    type="time" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="input-field" 
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="activity-habit-select" className="block text-sm font-medium mb-1">Associated Habit (Optional)</label>
                <select 
                  id="activity-habit-select"
                  value={habitId}
                  onChange={e => setHabitId(e.target.value)}
                  className="input-field"
                >
                  <option value="">No habit</option>
                  {habits.map(h => (
                    <option key={h.id} value={h.id}>{h.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-muted hover:bg-gray-100 rounded font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
