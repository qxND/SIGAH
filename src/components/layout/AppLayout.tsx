import * as React from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  School, 
  UserRound,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Alunos', path: '/alunos' },
  { icon: GraduationCap, label: 'Professores', path: '/professores' },
  { icon: BookOpen, label: 'Disciplinas', path: '/disciplinas' },
  { icon: School, label: 'Turmas', path: '/turmas' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    toast.success('Você saiu do sistema.');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-card border-r border-border transition-all duration-300 flex flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-4 flex items-center justify-between border-bottom border-border h-16">
          {!collapsed && (
            <span className="font-bold text-xl tracking-tight text-primary">SIGAH</span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={cn(
                    "flex items-center p-2 rounded-md transition-colors group",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon size={20} className={cn(collapsed ? "mx-auto" : "mr-3")} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className={cn("w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10", collapsed && "px-0 justify-center")}
          >
            <LogOut size={20} className={cn(collapsed ? "" : "mr-3")} />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 justify-between">
          <h1 className="text-lg font-semibold text-foreground">
            {menuItems.find(i => i.path === location.pathname)?.label || 'SIGAH'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Secretaria Acadêmica</p>
              <p className="text-xs text-muted-foreground">Horizonte</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <UserRound size={18} className="text-primary" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
