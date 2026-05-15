import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Shield, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

export const Route = createFileRoute('/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        login(data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        // Redirect based on role
        if (data.user.role === 'admin') {
          window.location.href = '/'; // Using index as root for now or separate admin route
        } else {
          window.location.href = '/';
        }
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden transition-colors duration-300">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      
      <div className="w-full max-w-[440px] space-y-8 relative z-10">
        <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-card rounded-2xl flex items-center justify-center shadow-2xl border border-border">
              <Shield className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Skycode</h1>
          <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">Sign in to manage your executions</p>
        </div>
        
        <div className="editor-card p-10 rounded-[32px] animate-in fade-in zoom-in-95 duration-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#7aa2f7] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full editor-input rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-slate-600 outline-none"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                <a href="#" className="text-[11px] font-black text-[#7aa2f7] hover:text-[#7aa2f7]/80 transition-colors uppercase tracking-[0.2em]">Forgot?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#7aa2f7] transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full editor-input rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-slate-600 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-[#7aa2f7] hover:bg-[#7aa2f7]/90 text-[#1a1b26] font-black py-4.5 rounded-2xl shadow-[0_0_20px_rgba(122,162,247,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm tracking-widest uppercase"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>Sign In <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm font-bold text-muted-foreground animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
          New here? <Link to="/register" className="text-foreground hover:text-primary font-black underline underline-offset-4 decoration-2 transition-colors">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
