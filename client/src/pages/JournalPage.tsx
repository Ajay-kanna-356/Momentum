import { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Save, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { fetchJournalEntryByDay, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../services/journal.service';
import type { JournalEntry } from '../services/journal.service';
import { format, addDays, subDays } from 'date-fns';

export default function JournalPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dayStr = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    loadEntry();
  }, [dayStr]);

  const loadEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJournalEntryByDay(dayStr);
      setEntry(data);
      setContent(data ? data.content : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setSaving(true);
    try {
      if (entry) {
        const updated = await updateJournalEntry(entry.id, content);
        setEntry(updated);
      } else {
        const created = await createJournalEntry(dayStr, content);
        setEntry(created);
      }
      // alert('Saved!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (!window.confirm('Are you sure you want to delete this journal entry?')) return;
    
    try {
      await deleteJournalEntry(entry.id);
      setEntry(null);
      setContent('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const nextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = dayStr === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-accent" /> Journal
          </h2>
          <p className="text-muted text-sm mt-1">Reflect on your day, thoughts, and progress.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          <button onClick={prevDay} className="p-2 hover:bg-gray-50 rounded">
            <ChevronLeft size={20} className="text-muted hover:text-text" />
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 font-medium min-w-[140px] justify-center">
            <CalendarIcon size={16} className="text-accent" />
            <span>{format(currentDate, 'MMM d, yyyy')}</span>
          </div>
          
          <button 
            onClick={nextDay} 
            disabled={isToday}
            className="p-2 hover:bg-gray-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight size={20} className="text-muted hover:text-text" />
          </button>
          
          {!isToday && (
            <button onClick={goToToday} className="px-3 py-1.5 text-xs font-semibold text-accent border-l hover:bg-gray-50">
              Today
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-4 rounded mb-6 border border-red-100">
          {error}
        </div>
      )}

      <div className="card flex-1 flex flex-col p-0 overflow-hidden shadow">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted">Loading entry...</div>
        ) : (
          <div className="flex flex-col flex-1 h-full">
            <textarea
              className="flex-1 w-full p-8 resize-none outline-none text-base leading-relaxed bg-transparent"
              placeholder="What's on your mind today? Write about your accomplishments, challenges, or simply how you're feeling..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            <div className="border-t bg-gray-50 p-4 flex items-center justify-between mt-auto shrink-0">
              <div className="text-xs text-muted flex items-center gap-4">
                {entry && <span>Last updated: {format(new Date(entry.updatedAt), 'h:mm a')}</span>}
                <span>{content.trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
              </div>
              
              <div className="flex items-center gap-3">
                {entry && (
                  <button 
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-danger hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : (entry ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
