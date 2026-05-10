import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, ListTodo, CalendarDays, LayoutDashboard, LogOut } from 'lucide-react';
import { logout, getCurrentUser } from '@/lib/auth';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const links = [
    { to: '/tasks', label: 'Add Tasks', icon: ListTodo },
    { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-card border-b border-border/30 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Brain className="w-6 h-6" />
          CogniTask
        </Link>
        <div className="flex gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === to
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-muted-foreground">
            {user.displayName}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </nav>
  );
}
