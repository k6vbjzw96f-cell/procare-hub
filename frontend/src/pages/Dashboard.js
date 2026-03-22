import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserSquare, Calendar, FileText, Shield, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchStats();
    // Trigger mount animation after data loads
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

  const statCards = [
    {
      title: 'Total Clients',
      value: stats?.total_clients || 0,
      subtitle: `${stats?.active_clients || 0} active`,
      icon: Users,
      color: 'bg-primary-100 text-primary-700',
    },
    {
      title: 'Total Staff',
      value: stats?.total_staff || 0,
      subtitle: `${stats?.active_staff || 0} active`,
      icon: UserSquare,
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Upcoming Shifts',
      value: stats?.upcoming_shifts || 0,
      subtitle: 'Scheduled',
      icon: Calendar,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Pending Invoices',
      value: stats?.pending_invoices || 0,
      subtitle: 'Awaiting payment',
      icon: FileText,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Compliance Issues',
      value: stats?.open_compliance_issues || 0,
      subtitle: 'Open issues',
      icon: Shield,
      color: 'bg-rose-100 text-rose-700',
    },
    {
      title: 'Total Revenue',
      value: `$${(stats?.total_revenue || 0).toLocaleString()}`,
      subtitle: 'Paid invoices',
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-700',
    },
  ];

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

  return (
    <div className={`space-y-8 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`} data-testid="dashboard-page">
      <div className={`transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Overview of your NDIS provider operations</p>
      </div>

      {/* Stats Cards with Stagger Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className={`stat-card border-slate-100 shadow-sm widget-stagger card-animated`}
            style={{ animationDelay: `${index * 100}ms` }}
            data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-primary-900" data-testid={`stat-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
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
            <CardTitle className="text-xl font-manrope">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/clients"
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              data-testid="quick-action-add-client"
            >
              <span className="font-medium text-slate-700">Add New Client</span>
              <Users className="w-5 h-5 text-slate-400" />
            </a>
            <a
              href="/rostering"
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              data-testid="quick-action-schedule-shift"
            >
              <span className="font-medium text-slate-700">Schedule Shift</span>
              <Calendar className="w-5 h-5 text-slate-400" />
            </a>
            <a
              href="/invoices"
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              data-testid="quick-action-create-invoice"
            >
              <span className="font-medium text-slate-700">Create Invoice</span>
              <FileText className="w-5 h-5 text-slate-400" />
            </a>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm widget-stagger" style={{ animationDelay: '700ms' }}>
          <CardHeader>
            <CardTitle className="text-xl font-manrope">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">System initialized</p>
                  <p className="text-xs text-slate-500">Ready to manage your NDIS operations</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;