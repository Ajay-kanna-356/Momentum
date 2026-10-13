import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../services/goal.service';
import type { Goal, CreateGoalDto, UpdateGoalDto } from '../services/goal.service';
import { format } from 'date-fns';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await fetchGoals();
      setGoals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setTargetDate('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
    setStatus(goal.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setSubmitting(true);
    try {
      if (editingGoal) {
        const payload: UpdateGoalDto = { title, status };
        if (description) payload.description = description;
        if (targetDate) payload.targetDate = targetDate;
        
        await updateGoal(editingGoal.id, payload);
      } else {
        const payload: CreateGoalDto = { title };
        if (description) payload.description = description;
        if (targetDate) payload.targetDate = targetDate;
        
        await createGoal(payload);
      }
      await loadGoals();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this goal? Habits associated will be kept but unlinked.')) return;
    try {
      await deleteGoal(id);
      await loadGoals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  if (loading && goals.length === 0) {
    return <div className="p-8 text-center text-muted">Loading goals...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="text-accent" /> Your Goals
          </h2>
          <p className="text-muted text-sm mt-1">Define your destinations.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Goal
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-4 rounded mb-6 border border-red-100">
          {error}
        </div>
      )}

      {goals.length === 0 && !error ? (
        <div className="card text-center py-12 flex flex-col items-center">
          <Target size={48} className="text-gray-300 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No goals yet</h3>
          <p className="text-muted text-sm mb-4">Start by defining what you want to achieve.</p>
          <button onClick={openCreateModal} className="btn-primary">Create Your First Goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <div key={goal.id} className="card flex flex-col justify-between">
              <div>
                {/* Card Header: Icon, Title & Actions without overlap */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0
                      ${goal.status === 'completed' ? 'bg-green-100 text-success' : 
                        goal.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-accent-light text-accent'}`}>
                      {goal.status === 'completed' ? <CheckCircle2 size={20} /> : <Target size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight text-text break-words">{goal.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium
                        ${goal.status === 'completed' ? 'bg-green-100 text-success' : 
                          goal.status === 'archived' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                        {goal.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 bg-gray-50 p-1 rounded border border-gray-100">
                    <button 
                      onClick={() => openEditModal(goal)} 
                      className="text-muted hover:text-accent p-1.5 rounded hover:bg-white transition-colors"
                      title="Edit Goal"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => handleDelete(goal.id)} 
                      className="text-muted hover:text-danger p-1.5 rounded hover:bg-white transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                
                {goal.description && (
                  <p className="text-sm text-muted mb-4 line-clamp-2">{goal.description}</p>
                )}
              </div>
              
              <div className="mt-auto pt-4 border-t flex flex-col gap-2">
                {goal.targetDate && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Calendar size={14} />
                    <span>Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted">
                  <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                    {goal.habits?.length || 0}
                  </div>
                  <span>Associated Habits</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">{editingGoal ? 'Edit Goal' : 'New Goal'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="goal-title-input" className="block text-sm font-medium mb-1">Title *</label>
                <input 
                  id="goal-title-input"
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input-field" 
                  required 
                />
              </div>
              
              <div>
                <label htmlFor="goal-desc-input" className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  id="goal-desc-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input-field resize-none h-24" 
                />
              </div>
              
              <div>
                <label htmlFor="goal-target-date-input" className="block text-sm font-medium mb-1">Target Date</label>
                <input 
                  id="goal-target-date-input"
                  type="date" 
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="input-field" 
                />
              </div>
              
              {editingGoal && (
                <div>
                  <label htmlFor="goal-status-select" className="block text-sm font-medium mb-1">Status</label>
                  <select 
                    id="goal-status-select"
                    value={status}
                    onChange={e => setStatus(e.target.value as 'active' | 'completed' | 'archived')}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
              
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-muted hover:bg-gray-100 rounded font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
