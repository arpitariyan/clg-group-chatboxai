'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  BarChart3, 
  History, 
  FolderOpen,
  LogOut,
  Shield
} from 'lucide-react';
import AdminGuard from '@/app/_components/AdminGuard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-toastify';

const adminNavItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Users', path: '/admin/users', icon: Users },
  { name: 'Plans', path: '/admin/plans', icon: CreditCard },
  { name: 'Analysis', path: '/admin/analysis', icon: BarChart3 },
  { name: 'History', path: '/admin/history', icon: History },
  { name: 'Files', path: '/admin/files', icon: FolderOpen },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminLogout, adminUser } = useAdmin();

  const handleLogout = async () => {
    try {
      await adminLogout();
      toast.success('Logged out successfully');
      router.push('/app');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <AdminGuard>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border flex flex-col dark:bg-[oklch(0.209_0_0)]">
          {/* Header */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">ChatBox AI</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground cursor-pointer'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>

          <Separator />

          {/* User Info & Logout */}
          <div className="p-4 space-y-3">
            <div className="px-4 py-2 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium truncate">{adminUser?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto dark:bg-[oklch(0.209_0_0)]">
          {children}
        </div>
      </div>
    </AdminGuard>
  );
}
