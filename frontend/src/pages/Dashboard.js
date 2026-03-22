import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, UserSquare, Calendar, FileText, Shield, TrendingUp, 
  Clock, Target, Bell, CheckCircle, AlertTriangle, ArrowRight,
  CalendarDays, MessageSquare, Star, Activity, Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// Admin/Coordinator Dashboard
const AdminDashboard = ({ stats, mounted }) => {
  const statCards = [
    { title: 'Total Clients', value: stats?.total_clients || 0, subtitle: `${stats?.active_clients || 0} active`, icon: Users, color: 'bg-primary-100 text-primary-700' },
    { title: 'Total Staff', value: stats?.total_staff || 0, subtitle: `${stats?.active_staff || 0} active`, icon: UserSquare, color: 'bg-emerald-100 text-emerald-700' },
    { title: 'Upcoming Shifts', value: stats?.upcoming_shifts || 0, subtitle: 'Next 7 days', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
    { title: 'Pending Invoices', value: stats?.pending_invoices || 0, subtitle: `$${(stats?.pending_amount || 0).toLocaleString()}`, icon: FileText, color: 'bg-amber-100 text-amber-700' },
    { title: 'Compliance Issues', value: stats?.compliance_issues || 0, subtitle: 'Needs attention', icon: Shield, color: 'bg-rose-100 text-rose-700' },
    { title: 'Total Revenue', value: `$${(stats?.total_revenue || 0).toLocaleString()}`, subtitle: 'This month', icon: TrendingUp, color: 'bg-violet-100 text-violet-700' },
  ];

  return (
    <>
      <div className={`transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Overview of your NDIS provider operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="stat-card border-slate-100 shadow-sm widget-stagger card-animated" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-3xl font-bold text-primary-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color} transition-transform duration-300 hover:scale-110`}>
                  <stat.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Schedule New Shift', href: '/rostering', icon: Calendar },
              { label: 'Add New Client', href: '/clients', icon: Users },
              { label: 'Create Invoice', href: '/invoices', icon: FileText },
              { label: 'View Compliance', href: '/compliance', icon: Shield },
            ].map((action, i) => (
              <Link key={i} to={action.href} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3">
                  <action.icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                  <span className="font-medium text-slate-700 group-hover:text-primary transition-colors">{action.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '700ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recent_activity?.length > 0 ? (
                stats.recent_activity.slice(0, 5).map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <p className="text-slate-700">{activity.description}</p>
                      <p className="text-slate-400 text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Support Worker Dashboard
const SupportWorkerDashboard = ({ stats, mounted, user }) => {
  return (
    <>
      <div className={`transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Support Worker'}!
        </h1>
        <p className="text-slate-600">Here's your day at a glance</p>
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white widget-stagger card-animated" style={{ animationDelay: '100ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Today's Shifts</p>
                <p className="text-3xl font-bold text-blue-700">{stats?.todays_shifts || 0}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white widget-stagger card-animated" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Hours This Week</p>
                <p className="text-3xl font-bold text-emerald-700">{stats?.weekly_hours || 0}h</p>
              </div>
              <Clock className="w-10 h-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white widget-stagger card-animated" style={{ animationDelay: '300ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Clients</p>
                <p className="text-3xl font-bold text-purple-700">{stats?.my_clients || 0}</p>
              </div>
              <Users className="w-10 h-10 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white widget-stagger card-animated" style={{ animationDelay: '400ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Tasks</p>
                <p className="text-3xl font-bold text-amber-700">{stats?.pending_tasks || 0}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Upcoming Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.upcoming_shifts_list?.length > 0 ? (
            <div className="space-y-3">
              {stats.upcoming_shifts_list.slice(0, 5).map((shift, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{shift.shift_date?.split('-')[2]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{shift.client_name}</p>
                      <p className="text-sm text-slate-500">{shift.start_time} - {shift.end_time} • {shift.service_type}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{shift.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-6">No upcoming shifts scheduled</p>
          )}
          <Link to="/rostering" className="block mt-4">
            <Button variant="outline" className="w-full btn-animated">View Full Schedule</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick Actions & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Log Hours', href: '/hours', icon: Clock, color: 'text-blue-600' },
              { label: 'Write Case Note', href: '/case-notes', icon: FileText, color: 'text-emerald-600' },
              { label: 'Report Incident', href: '/case-notes', icon: AlertTriangle, color: 'text-red-600' },
              { label: 'View My Clients', href: '/clients', icon: Users, color: 'text-purple-600' },
            ].map((action, i) => (
              <Link key={i} to={action.href} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3">
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                  <span className="font-medium text-slate-700">{action.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '700ms' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.notifications?.length > 0 ? (
              <div className="space-y-3">
                {stats.notifications.slice(0, 4).map((notif, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className={`w-2 h-2 rounded-full mt-2 ${notif.read ? 'bg-slate-300' : 'bg-primary'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{notif.title}</p>
                      <p className="text-xs text-slate-500">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-6">No new notifications</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Participant Dashboard (for future use when participants can login)
const ParticipantDashboard = ({ stats, mounted, user }) => {
  return (
    <>
      <div className={`transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">
          Hello, {user?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-slate-600">Here's what's happening with your support</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white widget-stagger card-animated" style={{ animationDelay: '100ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Upcoming Appointments</p>
                <p className="text-3xl font-bold text-primary">{stats?.upcoming_appointments || 0}</p>
              </div>
              <Calendar className="w-10 h-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white widget-stagger card-animated" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Goals in Progress</p>
                <p className="text-3xl font-bold text-emerald-700">{stats?.active_goals || 0}</p>
              </div>
              <Target className="w-10 h-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white widget-stagger card-animated" style={{ animationDelay: '300ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">My Support Workers</p>
                <p className="text-3xl font-bold text-blue-700">{stats?.support_workers || 0}</p>
              </div>
              <Users className="w-10 h-10 text-blue-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funding Overview */}
      <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">NDIS Funding Overview</CardTitle>
          <CardDescription>Your current plan utilisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Core Supports</span>
              <span className="font-medium">{stats?.core_used || 0}% used</span>
            </div>
            <Progress value={stats?.core_used || 0} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Capacity Building</span>
              <span className="font-medium">{stats?.capacity_used || 0}% used</span>
            </div>
            <Progress value={stats?.capacity_used || 0} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Capital Supports</span>
              <span className="font-medium">{stats?.capital_used || 0}% used</span>
            </div>
            <Progress value={stats?.capital_used || 0} className="h-2" />
          </div>
          <Link to="/funding" className="block mt-4">
            <Button variant="outline" className="w-full btn-animated">View Full Breakdown</Button>
          </Link>
        </CardContent>
      </Card>

      {/* My Goals & Support Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              My Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.goals?.length > 0 ? (
              <div className="space-y-3">
                {stats.goals.slice(0, 4).map((goal, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-slate-900">{goal.title}</p>
                      <Badge variant="outline">{goal.progress_percentage}%</Badge>
                    </div>
                    <Progress value={goal.progress_percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-6">No goals set yet</p>
            )}
            <Link to="/goals" className="block mt-4">
              <Button variant="outline" className="w-full btn-animated">View All Goals</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              My Support Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.support_team?.length > 0 ? (
              <div className="space-y-3">
                {stats.support_team.map((worker, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{worker.full_name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{worker.full_name}</p>
                      <p className="text-sm text-slate-500">{worker.role || 'Support Worker'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-6">No support workers assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchStats();
    setTimeout(() => setMounted(true), 100);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, getAuthHeader());
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const role = user?.role || 'admin';

  return (
    <div className={`space-y-8 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`} data-testid="dashboard-page">
      {role === 'support_worker' ? (
        <SupportWorkerDashboard stats={stats} mounted={mounted} user={user} />
      ) : role === 'participant' ? (
        <ParticipantDashboard stats={stats} mounted={mounted} user={user} />
      ) : (
        <AdminDashboard stats={stats} mounted={mounted} />
      )}
    </div>
  );
};

export default Dashboard;
