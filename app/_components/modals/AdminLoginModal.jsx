'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { Shield, Lock, Mail } from 'lucide-react';

export default function AdminLoginModal() {
  const { isAdminLoginOpen, closeAdminLogin, adminLogin, ADMIN_EMAIL } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    if (email !== ADMIN_EMAIL) {
      toast.error('Unauthorized: This email is not authorized for admin access');
      return;
    }

    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success('Welcome, Admin!');
      closeAdminLogin();
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      if (error.message.includes('Unauthorized')) {
        toast.error('Unauthorized: This email is not authorized for admin access');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('No admin account found with this email.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      closeAdminLogin();
      setEmail('');
      setPassword('');
    }
  };

  return (
    <Dialog open={isAdminLoginOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Admin Access</DialogTitle>
          <DialogDescription className="text-center">
            Restricted area - Admin credentials required
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Only authorized administrators can access this area
        </p>
      </DialogContent>
    </Dialog>
  );
}
