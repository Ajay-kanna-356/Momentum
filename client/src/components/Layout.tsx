import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Target, 
  BarChart2, 
  Bot, 
  BookOpen, 
  Settings,
  Bell,
  Calendar as CalendarIcon,
  Activity as ActivityIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Schedule', icon: Calendar, path: '/schedule' },
  { label: 'Habits', icon: CheckSquare, path: '/habits' },
  { label: 'Goals', icon: Target, path: '/goals' },
  { label: 'Activities', icon: ActivityIcon, path: '/activities' },
  { label: 'Analytics', icon: BarChart2, path: '/analytics' },
  { label: 'AI Insights', icon: Bot, path: '/insights' },
  { label: 'Journal', icon: BookOpen, path: '/journal' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  
  const today = new Date();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="flex items-center justify-center w-8 h-8 bg-accent text-white rounded font-bold">M</div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight" style={{ color: 'var(--text-h)' }}>Momentum</span>
            <span className="text-xs text-muted">Track. Plan. Achieve.</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold">{user?.name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-h)' }}>{user?.name || 'User'}</span>
            <span className="text-xs text-muted">Keep pushing 🚀</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold" style={{ margin: 0, letterSpacing: 'normal' }}>
              Good Morning, {user?.name?.split(' ')[0] || 'User'}! 👏
            </h1>
            <span className="text-sm text-muted">"Discipline today, freedom tomorrow."</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 border rounded-full px-4 py-2 text-sm font-medium">
              <span>{format(today, 'dd MMM yyyy, eee')}</span>
              <CalendarIcon size={16} className="text-muted" />
            </div>
            
            <button className="relative p-2 text-muted hover:text-accent transition-colors">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
