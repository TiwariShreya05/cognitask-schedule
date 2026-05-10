import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock, User, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login, signup } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isManagerLogin, setIsManagerLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      const result = signup(username, email, password, displayName, 'employee');
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      // Auto-login after signup
      const loginResult = login(username, password);
      if (loginResult.success) {
        toast({ title: 'Welcome!', description: 'Account created successfully' });
        navigate('/tasks');
      }
    } else {
      const identifier = isManagerLogin ? username || email : username || email;
      const result = login(identifier, password);
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      if (isManagerLogin && result.user?.role !== 'manager') {
        toast({ title: 'Access Denied', description: 'This account is not a manager', variant: 'destructive' });
        return;
      }
      if (result.user?.role === 'manager') {
        navigate('/manager');
      } else {
        navigate('/tasks');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

      <div className="glass-card p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 glow-primary">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CogniTask</h1>
          <p className="text-muted-foreground text-sm mt-1">Intelligent task scheduling</p>
        </div>

        {/* Role toggle */}
        {!isSignUp && (
          <div className="flex mb-6 rounded-lg bg-secondary/30 p-1">
            <button
              onClick={() => setIsManagerLogin(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                !isManagerLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              Employee
            </button>
            <button
              onClick={() => setIsManagerLogin(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                isManagerLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCog className="w-4 h-4" />
              Manager
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Display Name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isSignUp ? "Email" : "Username or Email"}
              value={isSignUp ? email : (username || email)}
              onChange={e => isSignUp ? setEmail(e.target.value) : setUsername(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
              required
            />
          </div>
          {isSignUp && (
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                required
              />
            </div>
          )}
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {isSignUp ? 'Sign Up as Employee' : isManagerLogin ? 'Sign In as Manager' : 'Sign In as Employee'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setIsManagerLogin(false); }}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        {isManagerLogin && !isSignUp && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Default: manager / manager123
          </p>
        )}
      </div>
    </div>
  );
}
