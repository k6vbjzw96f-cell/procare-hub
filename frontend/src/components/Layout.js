import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare, Calendar, Clock, FileText, Shield, BarChart3, LogOut, Bell, Car, Home, Building2, Settings, CalendarCheck, Pill, Target, MessageSquare, CreditCard, CalendarDays, ClipboardList, FileSignature, Users2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, getAuthHeader());
      const unread = response.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      // Silently fail
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Clients', href: '/clients', icon: Users, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Staff', href: '/staff', icon: UserSquare, roles: ['admin', 'coordinator'] },
    { name: 'Team Availability', href: '/team-availability', icon: Users2, roles: ['admin', 'coordinator'] },
    { name: 'HR', href: '/hr', icon: Briefcase, roles: ['admin', 'coordinator'] },
    { name: 'Rostering', href: '/rostering', icon: Calendar, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Hour Logging', href: '/hours', icon: Clock, roles: ['support_worker'] },
    { name: 'Leave', href: '/leave', icon: CalendarCheck, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Medication', href: '/medication', icon: Pill, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Goals', href: '/goals', icon: Target, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Communication', href: '/communication', icon: MessageSquare, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Vehicles', href: '/vehicles', icon: Car, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'SIL Houses', href: '/houses', icon: Home, roles: ['admin', 'coordinator'] },
    { name: 'Facilities', href: '/facilities', icon: Building2, roles: ['admin', 'coordinator'] },
    { name: 'Invoices', href: '/invoices', icon: FileText, roles: ['admin', 'coordinator'] },
    { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'coordinator'] },
    { name: 'Documents', href: '/documents', icon: FileSignature, roles: ['admin', 'coordinator'] },
    { name: 'Compliance', href: '/compliance', icon: Shield, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Compliance Calendar', href: '/calendar', icon: CalendarDays, roles: ['admin', 'coordinator'] },
    { name: 'Feedback', href: '/feedback', icon: ClipboardList, roles: ['admin', 'coordinator', 'support_worker'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'coordinator'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'coordinator', 'support_worker'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/procare-logo.jpeg" 
                alt="ProCare Hub Logo" 
                className="h-16 w-16 object-contain"
                data-testid="app-logo"
              />
              <div>
                <h1 className="text-xl font-manrope font-bold text-primary">ProCare Hub</h1>
                <p className="text-xs text-slate-500">NDIS Provider Platform</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="relative" onClick={() => window.location.href = '/notifications'}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate" data-testid="user-name">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.role || 'User'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50"
              onClick={onLogout}
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;