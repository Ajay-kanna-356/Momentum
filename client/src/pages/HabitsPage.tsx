import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Edit2, Trash2, Calendar, Target, Activity } from 'lucide-react';
import { fetchHabits, createHabit, updateHabit, deleteHabit } from '../services/habit.service';
import type { Habit, CreateHabitDto, UpdateHabitDto } from '../services/habit.service';
import { fetchGoals } from '../services/goal.service';
import type { Goal } from '../services/goal.service';

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'M' },
  { value: 'TUESDAY', label: 'T' },
  { value: 'WEDNESDAY', label: 'W' },
  { value: 'THURSDAY', label: 'T' },
  { value: 'FRIDAY', label: 'F' },
  { value: 'SATURDAY', label: 'S' },
  { value: 'SUNDAY', label: 'S' }
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [habitsData, goalsData] = await Promise.all([
        fetchHabits(),
        fetchGoals()
      ]);
      setHabits(habitsData);
      setGoals(goalsData.filter(g => g.status === 'active')); // only active goals for selection
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingHabit(null);
    setTitle('');
    setDescription('');
    setGoalId('');
    setStatus('active');
    setScheduleDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']); // Default daily
    setIsModalOpen(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setTitle(habit.title);
    setDescription(habit.description || '');
    setGoalId(habit.goalId ? habit.goalId.toString() : '');
    setStatus(habit.status);
    setScheduleDays(habit.schedules?.map(s => s.dayOfWeek) || []);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const toggleDay = (dayValue: string) => {
    setScheduleDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || scheduleDays.length === 0) {
      alert("Please enter a title and select at least one day.");
      return;
    }
    
    setSubmitting(true);
    try {
      const parsedGoalId = goalId ? parseInt(goalId, 10) : null;
      
      if (editingHabit) {
        const payload: UpdateHabitDto = { title, status, scheduleDays };
        payload.description = description;
        payload.goalId = parsedGoalId;
        await updateHabit(editingHabit.id, payload);
      } else {
        const payload: CreateHabitDto = { title, scheduleDays };
        payload.description = description;
        payload.goalId = parsedGoalId;
        await createHabit(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save habit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this habit? All history will be lost!')) return;
    try {
      await deleteHabit(id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete habit');
    }
  };

  if (loading && habits.length === 0) {
    return <div className="p-8 text-center text-muted">Loading habits...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="text-accent" /> Your Habits
          </h2>
          <p className="text-muted text-sm mt-1">Small behaviors, massive results.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Habit
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-4 rounded mb-6 border border-red-100">
          {error}
        </div>
      )}

      {habits.length === 0 && !error ? (
        <div className="card text-center py-12 flex flex-col items-center">
          <Activity size={48} className="text-gray-300 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No habits yet</h3>
          <p className="text-muted text-sm mb-4">Start small. What is one thing you can do daily?</p>
          <button onClick={openCreateModal} className="btn-primary">Create Your First Habit</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map(habit => (
            <div key={habit.id} className="card flex flex-col justify-between">
              <div>
                {/* Card Header: Icon, Title & Actions without overlap */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0
                      ${habit.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-success'}`}>
                      <Activity size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight text-text break-words">{habit.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium
                        ${habit.status === 'archived' ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-success'}`}>
                        {habit.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 bg-gray-50 p-1 rounded border border-gray-100">
                    <button 
                      onClick={() => openEditModal(habit)} 
                      className="text-muted hover:text-accent p-1.5 rounded hover:bg-white transition-colors"
                      title="Edit Habit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => handleDelete(habit.id)} 
                      className="text-muted hover:text-danger p-1.5 rounded hover:bg-white transition-colors"
                      title="Delete Habit"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                
                {habit.description && (
                  <p className="text-sm text-muted mb-4 line-clamp-2">{habit.description}</p>
                )}
              </div>
              
              <div className="mt-auto pt-4 border-t flex flex-col gap-3">
                {habit.goal && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Target size={14} className="text-accent" />
                    <span className="truncate flex-1">Goal: {habit.goal.title}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs">
                  <Calendar size={14} className="text-muted" />
                  <div className="flex gap-1">
                    {DAYS_OF_WEEK.map(d => {
                      const isActive = habit.schedules?.some(s => s.dayOfWeek === d.value);
                      return (
                        <span key={d.value} className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${isActive ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {d.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <div className="text-xs text-muted">
                  Logged {habit.logs?.length || 0} times
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingHabit ? 'Edit Habit' : 'New Habit'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="habit-title-input" className="block text-sm font-medium mb-1">Title *</label>
                <input 
                  id="habit-title-input"
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input-field" 
                  placeholder="e.g., Read 10 pages"
                  required 
                />
              </div>
              
              <div>
                <label htmlFor="habit-desc-input" className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  id="habit-desc-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input-field resize-none h-20" 
                  placeholder="Why is this important?"
                />
              </div>
              
              <div>
                <span className="block text-sm font-medium mb-1">Schedule (Days of Week) *</span>
                <div className="flex gap-2 mt-2">
                  {DAYS_OF_WEEK.map(d => {
                    const isSelected = scheduleDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`w-10 h-10 rounded-full font-semibold transition-colors
                          ${isSelected ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {scheduleDays.length === 0 && <span className="text-xs text-danger mt-1 block">Select at least one day.</span>}
              </div>
              
              <div>
                <label htmlFor="habit-goal-select" className="block text-sm font-medium mb-1">Associated Goal (Optional)</label>
                <select 
                  id="habit-goal-select"
                  value={goalId}
                  onChange={e => setGoalId(e.target.value)}
                  className="input-field"
                >
                  <option value="">No goal</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              
              {editingHabit && (
                <div>
                  <label htmlFor="habit-status-select" className="block text-sm font-medium mb-1">Status</label>
                  <select 
                    id="habit-status-select"
                    value={status}
                    onChange={e => setStatus(e.target.value as 'active' | 'archived')}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
              
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-muted hover:bg-gray-100 rounded font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || scheduleDays.length === 0} className="btn-primary disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
