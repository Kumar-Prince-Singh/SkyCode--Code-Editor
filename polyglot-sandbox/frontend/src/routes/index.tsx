import { createFileRoute, Navigate } from "@tanstack/react-router";
import { 
  Code2, History, Settings, FileText, Shield, Play, RotateCcw, 
  RefreshCw, Eraser, Terminal, Inbox as InboxIcon, 
  Cpu, Code, Activity, Loader2, LogOut, Search, Bell,
  User, LayoutDashboard, Users, PlayCircle, Inbox, ArrowRight,
  Sun, Moon
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import toast from 'react-hot-toast';
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";

import { API_BASE_URL, SOCKET_URL } from "../config";

interface Submission {
  _id: string;
  language: string;
  status: string;
  executionTime: number;
  createdAt: string;
}

export const Route = createFileRoute("/")({
  component: Index,
});

const userNavItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Code, label: "Playground" },
  { icon: FileText, label: "Submissions" },
  { icon: History, label: "History" },
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
];

const adminNavItems = [
  { icon: Shield, label: "Admin" },
  { icon: Code, label: "Playground" },
  { icon: Activity, label: "Executions" },
  { icon: Users, label: "Manage Users" },
  { icon: Settings, label: "Settings" },
];

const BOILERPLATES: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++!" << endl;\n    return 0;\n}`,
  python: `print("Hello from Python!")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}`,
  javascript: `console.log("Hello from JavaScript!");`
};

function Index() {
  const { user, loading: authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<string>("Playground");
  const [language, setLanguage] = useState<string>("cpp");
  const [code, setCode] = useState<string>(BOILERPLATES.cpp);
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [status, setStatus] = useState<string>("idle");
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);
  const [realTimeLogs, setRealTimeLogs] = useState<string[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [editorFontSize, setEditorFontSize] = useState<number>(14);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setActiveView("Playground");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      toast.success('Connected to real-time engine', { id: 'socket-conn' });
      if (user?.id) {
        socket.emit('join_user', user.id);
      }
    });

    socket.on('execution_progress', (update) => {
      setRealTimeLogs(prev => [...prev, update.logs]);
      setStatus(update.status);
      
      if (update.data?.output !== undefined) {
        setOutput(update.data.output);
      }
      if (update.data?.executionTime !== undefined) {
        setExecutionTime(update.data.executionTime);
      }

      if (update.status === 'success' || update.status === 'failed') {
        fetchHistory();
      }
    });

    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchHistory();
    if (activeView === "Admin" || activeView === "Dashboard") fetchAdminStats();
  }, [activeView, user]);



  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) setAdminStats(result.data);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) setHistory(result.data);
    } catch (err) { console.error(err); }
  };

  const handleRun = useCallback(async () => {
    // Only block if we are actually in the middle of a request
    console.log("Run requested...");
    
    setStatus("running");
    setRealTimeLogs(["Job queued..."]);
    setOutput("");
    setExecutionTime(null);

    const runPromise = (async () => {
      // 1. Ensure socket is active
      if (!socketRef.current || !socketRef.current.connected) {
        console.log("Socket connecting...");
        socketRef.current?.connect();
      }

      // 2. Execute
      const res = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ language, code, input }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Execution failed to start");
      
      console.log("Job started:", data.submissionId);
      socketRef.current?.emit('join_submission', data.submissionId);
      return data;
    })();

    toast.promise(runPromise, {
      loading: 'Starting execution...',
      success: 'Code sent to runner!',
      error: (err) => `Error: ${err.message}`,
    });

    try {
      const data = await runPromise;
      
      // FALLBACK POLLING: If we don't get a socket message within 2 seconds, 
      // or to be safe, just poll until we get a result.
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${API_BASE_URL}/submissions/${data.submissionId}`, { credentials: 'include' });
          const result = await res.json();
          if (result.success && (result.data.status === 'success' || result.data.status === 'failed')) {
            setOutput(result.data.output);
            setStatus(result.data.status);
            setExecutionTime(result.data.executionTime);
            fetchHistory();
            clearInterval(pollInterval);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
        
        if (attempts > 30) clearInterval(pollInterval); // Stop after 30 seconds
      }, 1000);

    } catch (err: any) {
      console.error("Run error:", err);
      setStatus("error");
      setOutput(err.message);
    }
  }, [language, code, input]);

  const fetchSubmissionDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/${id}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setOutput(result.data.output);
        setExecutionTime(result.data.executionTime);
      }
    } catch (err) {
      console.error("Failed to fetch submission details:", err);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" />;

  const navItems = user.role === 'admin' ? adminNavItems : userNavItems;

  const renderContent = () => {
    switch (activeView) {
      case "Admin":
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { label: 'Total Runs', value: adminStats?.totalSubmissions || 0, color: 'text-primary', icon: Activity },
                { label: 'Success Rate', value: `${adminStats?.totalSubmissions ? Math.round((adminStats.successCount / adminStats.totalSubmissions) * 100) : 0}%`, color: 'text-success', icon: PlayCircle },
                { label: 'System Errors', value: adminStats?.failedCount || 0, color: 'text-error', icon: Shield },
                { label: 'Queue', value: 'Active', color: 'text-accent', icon: RefreshCw }
              ].map(stat => (
                <div key={stat.label} className="p-8 rounded-[32px] glass-card premium-shadow relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className="relative z-10">
                    <div className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-2">{stat.label}</div>
                    <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                  </div>
                  <stat.icon className="absolute -right-4 -bottom-4 h-20 w-20 text-foreground/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="rounded-[32px] glass-card p-10 premium-shadow">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3"><Activity className="h-5 w-5 text-primary" /> Language Usage</h3>
                    <div className="space-y-6">
                        {adminStats?.langStats.map((l: any) => (
                            <div key={l._id} className="space-y-3">
                                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                  <span>{l._id}</span>
                                  <span className="text-primary">{l.count}</span>
                                </div>
                                <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden border border-border/50">
                                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(l.count / adminStats.totalSubmissions) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-[32px] glass-card p-10 premium-shadow">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3"><History className="h-5 w-5 text-primary" /> Recent Activity</h3>
                    <div className="space-y-4">
                        {adminStats?.recentSubmissions.slice(0, 6).map((s: any) => (
                            <div key={s._id} className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/20 group hover:bg-white dark:hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className={`h-3 w-3 rounded-full ${s.status === 'success' ? 'bg-success animate-pulse' : 'bg-error'}`} />
                                  <span className="font-black text-sm capitalize">{s.language}</span>
                                </div>
                                <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full ${s.status === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>{s.status.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        );
      case "Playground":
        return (
          <div className="flex-1 p-6 overflow-auto animate-in fade-in duration-300">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-3xl font-black flex items-center gap-3 tracking-tighter">
                    <div className="p-2 bg-blue-600/10 rounded-xl">
                      <Code className="h-7 w-7 text-blue-600" />
                    </div>
                    <span 
                      style={{ color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                      className="font-black"
                    >
                      Code Playground
                    </span>
                  </h2>
                  <p 
                    style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                    className="text-sm font-bold uppercase tracking-[0.2em] mt-1 ml-14"
                  >
                    Development Sandbox v1.0
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={language} 
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setCode(BOILERPLATES[e.target.value as keyof typeof BOILERPLATES]);
                    }}
                    className="bg-card text-foreground border border-border rounded-lg px-3 py-1.5 text-sm font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  >
                    <option value="cpp">C++ 17</option>
                    <option value="python">Python 3.10</option>
                    <option value="java">Java 17</option>
                    <option value="javascript">Node.js 22</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="editor-card rounded-2xl overflow-hidden border border-border shadow-xl">
                    <div className="bg-muted/50 dark:bg-slate-900/50 px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                        <span className="ml-3 text-xs font-black font-mono text-muted-foreground">main.{language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : language === 'java' ? 'java' : 'js'}</span>
                      </div>
                      <button onClick={() => setCode(BOILERPLATES[language as keyof typeof BOILERPLATES])} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      spellCheck={false}
                      style={{ fontSize: `${editorFontSize}px` }}
                      className="w-full h-[500px] p-8 code-editor-textarea focus:outline-none resize-none rounded-b-2xl transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="editor-card p-6 rounded-2xl border border-border shadow-lg">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-primary" /> Input (stdin)
                    </h3>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Program input..."
                      className="w-full h-32 p-4 text-sm font-mono rounded-xl bg-muted/30 border border-border focus:ring-4 focus:ring-primary/10 outline-none resize-none text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRun();
                      }}
                      disabled={status === 'running'}
                      className="w-full mt-6 py-4 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {status === 'running' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                      {status === 'running' ? 'Running...' : 'Run Code'}
                    </button>
                  </div>

                  <div className="editor-card p-6 rounded-2xl border border-border shadow-lg min-h-[200px] flex flex-col">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-primary" /> Output
                    </h3>
                    {status === 'running' || status === 'queued' ? (
                      <div className="space-y-2 mb-4">
                        {realTimeLogs.map((l, i) => (
                          <div key={i} className="text-xs font-mono text-primary animate-pulse">{l}</div>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex-1 rounded-xl overflow-hidden bg-[#0d1117] border border-white/5 relative min-h-[150px]">
                      {output ? (
                        <pre className="p-4 text-emerald-400 font-mono text-xs overflow-auto max-h-[300px] leading-relaxed">
                          {output}
                        </pre>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-xs">
                          {status === 'running' ? 'Executing code...' : 'No output yet...'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "Submissions":
      case "History":
        return (
            <div className="rounded-[32px] glass-card premium-shadow overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <table className="w-full text-left">
                    <thead className="bg-muted/30 text-[10px] font-black uppercase text-foreground/40 border-b border-border/50">
                        <tr>
                          <th className="px-10 py-6 tracking-[0.2em]">ID</th>
                          <th className="px-10 py-6 tracking-[0.2em]">Language</th>
                          <th className="px-10 py-6 tracking-[0.2em]">Status</th>
                          <th className="px-10 py-6 text-right tracking-[0.2em]">Execution Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {history.map(s => (
                            <tr key={s._id} className="hover:bg-primary/5 transition-all group">
                                <td className="px-10 py-6 font-mono text-xs text-foreground/40 group-hover:text-primary transition-colors">#{s._id.slice(-6).toUpperCase()}</td>
                                <td className="px-10 py-6 font-black text-sm capitalize">{s.language}</td>
                                <td className="px-10 py-6">
                                  <span className={`px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest ${s.status === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                    {s.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-10 py-6 text-right font-black text-sm text-foreground/60">{s.executionTime}ms</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {history.length === 0 && (
                  <div className="p-20 text-center space-y-4">
                    <Inbox className="h-16 w-16 text-foreground/10 mx-auto" />
                    <p className="text-sm font-black text-foreground/30 uppercase tracking-widest">No submissions yet</p>
                  </div>
                )}
            </div>
        );
      case "Profile":
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass-card rounded-[40px] p-12 premium-shadow relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="h-32 w-32 rounded-[32px] bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white text-5xl font-black shadow-2xl mb-8">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-4xl font-black tracking-tight mb-2">{user?.name}</h2>
                <p className="text-primary font-black uppercase tracking-[0.2em] text-xs mb-8">{user?.role} Account</p>
                
                <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
                  <div className="p-6 rounded-3xl bg-muted/30 border border-border/50">
                    <div className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">Email Address</div>
                    <div className="text-sm font-bold">{user?.email}</div>
                  </div>
                  <div className="p-6 rounded-3xl bg-muted/30 border border-border/50">
                    <div className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">Total Executions</div>
                    <div className="text-sm font-bold">{history.length}</div>
                  </div>
                </div>

                <div className="mt-12 w-full pt-12 border-t border-border/50">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-sm uppercase tracking-widest">Security Settings</h3>
                      <button className="text-xs font-black text-primary hover:underline">Change Password</button>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/10 border border-border/20">
                         <div className="flex items-center gap-4">
                            <Shield className="h-5 w-5 text-primary" />
                            <div className="text-left">
                               <div className="text-sm font-black">Two-Factor Authentication</div>
                               <div className="text-[10px] font-bold opacity-40">Add an extra layer of security</div>
                            </div>
                         </div>
                         <div className="h-6 w-10 bg-muted rounded-full relative cursor-not-allowed">
                            <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm" />
                         </div>
                      </div>
                   </div>
                </div>
              </div>
              <div className="absolute -top-24 -right-24 h-64 w-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-accent/5 rounded-full blur-3xl" />
            </div>
          </div>
        );
      case "Settings":
        return (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="glass-card rounded-[40px] p-12 premium-shadow">
                <h2 className="text-3xl font-black mb-10 flex items-center gap-4">
                  <Settings className="h-8 w-8 text-primary" /> System Settings
                </h2>
                
                <div className="space-y-10">
                   <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-6 flex items-center gap-2">
                        <Code className="h-4 w-4" /> Editor Configuration
                      </h3>
                      <div className="p-8 rounded-3xl bg-muted/20 border border-border/30 space-y-8">
                         <div className="flex items-center justify-between">
                            <div>
                               <div className="text-sm font-black mb-1">Editor Font Size</div>
                               <div className="text-[11px] font-bold opacity-40">Adjust the readability of your code</div>
                            </div>
                            <div className="flex items-center gap-4">
                               <button 
                                 onClick={() => setEditorFontSize(Math.max(10, editorFontSize - 1))}
                                 className="h-10 w-10 rounded-xl bg-white dark:bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 transition-all"
                               >
                                 -
                               </button>
                               <span className="text-sm font-black w-8 text-center">{editorFontSize}px</span>
                               <button 
                                 onClick={() => setEditorFontSize(Math.min(24, editorFontSize + 1))}
                                 className="h-10 w-10 rounded-xl bg-white dark:bg-white/5 border border-border flex items-center justify-center hover:bg-primary/10 transition-all"
                               >
                                 +
                               </button>
                            </div>
                         </div>

                         <div className="flex items-center justify-between opacity-50">
                            <div>
                               <div className="text-sm font-black mb-1">Tab Size</div>
                               <div className="text-[11px] font-bold opacity-40 text-primary">Premium Feature</div>
                            </div>
                            <div className="px-4 py-2 bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest">4 Spaces</div>
                         </div>

                         <div className="flex items-center justify-between opacity-50">
                            <div>
                               <div className="text-sm font-black mb-1">Vim Keybindings</div>
                               <div className="text-[11px] font-bold opacity-40 text-primary">Premium Feature</div>
                            </div>
                            <div className="h-6 w-10 bg-muted rounded-full relative">
                               <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm" />
                            </div>
                         </div>
                      </div>
                   </section>

                   <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-6 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Account & Preferences
                      </h3>
                      <div className="p-8 rounded-3xl bg-muted/20 border border-border/30 space-y-8">
                         <div className="flex items-center justify-between">
                            <div>
                               <div className="text-sm font-black mb-1">Interface Language</div>
                               <div className="text-[11px] font-bold opacity-40">Select your preferred language</div>
                            </div>
                            <select className="bg-white dark:bg-black/20 border border-border rounded-xl px-4 py-2 text-xs font-bold outline-none">
                               <option>English (US)</option>
                               <option>Hindi</option>
                            </select>
                         </div>
                      </div>
                   </section>
                </div>
             </div>
          </div>
        );
      default:
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="md:col-span-2 space-y-10">
                    <div className="p-12 rounded-[48px] animate-gradient-bg text-white shadow-2xl premium-shadow-primary relative overflow-hidden group">
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black mb-3 tracking-tight">Ready to code, {user?.name}?</h2>
                            <p className="text-white/80 text-lg font-medium mb-10 max-w-md">Your sandbox is active. You have completed {history.filter(s => s.status === 'success').length} successful executions this week.</p>
                            <button 
                              onClick={() => setActiveView("Playground")} 
                              className="px-10 py-4 bg-white text-primary rounded-2xl font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest"
                            >
                              Open Playground <ArrowRight className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="absolute -right-20 -bottom-20 h-96 w-96 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
                        <Code2 className="absolute -right-10 -bottom-10 h-72 w-72 text-white/10 rotate-12 group-hover:rotate-0 transition-all duration-1000" />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="p-10 rounded-[32px] glass-card premium-shadow group hover:scale-[1.02] transition-all">
                            <h3 className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-6">Quick Stats</h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-black text-foreground/60 uppercase tracking-widest">Total Runs</span>
                                    <span className="text-4xl font-black text-primary">{history.length}</span>
                                </div>
                                <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden border border-border/50">
                                  <div className="h-full bg-gradient-to-r from-primary to-accent animate-pulse" style={{ width: '60%' }} />
                                </div>
                            </div>
                        </div>
                        <div className="p-10 rounded-[32px] glass-card premium-shadow flex items-center justify-center border-dashed border-2 border-border/50 opacity-50">
                           <p className="text-[10px] font-black uppercase tracking-widest">More stats coming soon</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-8">
                    <div className="p-10 rounded-[32px] glass-card premium-shadow">
                        <h3 className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-8">Recent Activity</h3>
                        <div className="space-y-4">
                            {history.slice(0, 5).map(s => (
                                <div key={s._id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/10 hover:bg-white dark:hover:bg-white/5 transition-all cursor-default">
                                    <div className={`h-3 w-3 rounded-full ${s.status === 'success' ? 'bg-success shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-error shadow-[0_0_12px_rgba(239,68,68,0.4)]'}`} />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black capitalize">{s.language}</span>
                                      <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">{s.executionTime}ms</span>
                                    </div>
                                    <div className="ml-auto opacity-20">
                                      <Code className="h-4 w-4" />
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && <p className="text-xs font-bold text-center opacity-30 py-10 italic">No activity yet</p>}
                        </div>
                        <button onClick={() => setActiveView("History")} className="w-full mt-8 py-4 border-2 border-primary/20 rounded-2xl text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all">
                          View All History
                        </button>
                    </div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10 animate-pulse" />

      <aside className="w-72 border-r border-border/50 glass-card flex flex-col fixed inset-y-0 z-50">
        <div className="p-8">
            <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                    <Shield className="h-7 w-7 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-2xl tracking-tighter text-foreground leading-none">Skycode</span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Sandbox</span>
                </div>
            </div>
        </div>
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto pt-4">
            {navItems.map(item => (
                <button 
                    key={item.label}
                    onClick={() => setActiveView(item.label)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all duration-300 ${activeView === item.label ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20 scale-[1.02]' : 'text-slate-500 hover:bg-blue-50 hover:text-[#3b82f6]'}`}
                >
                    <item.icon className={`h-5 w-5 ${activeView === item.label ? 'text-white' : 'group-hover:text-primary'}`} />
                    {item.label}
                </button>
            ))}
        </nav>
        <div className="p-6 border-t border-border/50">
            <button onClick={logout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black text-error hover:bg-error/10 transition-all">
                <LogOut className="h-5 w-5" /> Sign Out
            </button>
        </div>
      </aside>

      <div className="flex-1 ml-72 min-h-screen flex flex-col">
        <header className="h-24 bg-background/80 dark:bg-background/60 backdrop-blur-xl border-b border-primary/10 sticky top-0 z-40 px-10 flex items-center justify-between">
            <div className="flex items-center gap-4 bg-muted/30 px-6 py-3 rounded-2xl border border-border/50 focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-black/20 focus-within:ring-4 focus-within:ring-primary/10 transition-all w-[480px] group">
                <Search className="h-5 w-5 text-foreground/30 group-focus-within:text-primary" />
                <input type="text" placeholder="Search resources..." className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder:text-foreground/30" />
            </div>
            <div className="flex items-center gap-6">
                <button 
                    onClick={toggleTheme}
                    className="h-12 w-12 rounded-2xl bg-white dark:bg-white/5 border border-border/50 shadow-sm flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary/50 transition-all relative group"
                >
                    {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                </button>
                <button className="h-12 w-12 rounded-2xl bg-white dark:bg-white/5 border border-border/50 shadow-sm flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary/50 transition-all relative group">
                    <Bell className="h-6 w-6 group-hover:rotate-12" />
                    <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 bg-error rounded-full border-2 border-background" />
                </button>
                <div className="flex items-center gap-4 pl-6 border-l border-border/50">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-black text-foreground leading-none mb-1.5">{user?.name}</div>
                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{user?.role}</div>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] border border-blue-400/20 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
                        {user?.name.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>

        <main className="p-10 pb-24">
            {renderContent()}
        </main>
      </div>
    </div>
  );
}
