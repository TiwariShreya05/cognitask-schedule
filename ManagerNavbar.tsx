import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Users, LogOut } from 'lucide-react';
import { logout, getCurrentUser } from '@/lib/auth';

export default function ManagerNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-card border-b border-border/30 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/manager" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Brain className="w-6 h-6" />
          CogniTask
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-1">Manager</span>
        </Link>
        <Link
          to="/manager"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/manager'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Users className="w-4 h-4" />
          All Employees
        </Link>
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
