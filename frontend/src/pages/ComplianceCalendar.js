import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Plus, CalendarDays, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight, Shield, Car, User, Building2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const ComplianceCalendar = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [formData, setFormData] = useState({
    deadline_type: 'worker_screening',
    title: '',
    description: '',
    due_date: '',
    entity_type: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      const response = await axios.get(`${API}/compliance/deadlines`, getAuthHeader());
      setDeadlines(response.data);
    } catch (error) {
      toast.error('Failed to load compliance deadlines');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/compliance/deadlines`, formData, getAuthHeader());
      toast.success('Deadline created successfully');
      fetchDeadlines();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create deadline');
    }
  };

  const handleComplete = async (deadlineId) => {
    try {
      await axios.put(`${API}/compliance/deadlines/${deadlineId}/complete`, {}, getAuthHeader());
      toast.success('Deadline marked as complete');
      fetchDeadlines();
    } catch (error) {
      toast.error('Failed to update deadline');
    }
  };

  const resetForm = () => {
    setFormData({
      deadline_type: 'worker_screening',
      title: '',
      description: '',
      due_date: '',
      entity_type: '',
      priority: 'medium',
    });
  };

  const getDeadlineTypeConfig = (type) => {
    const configs = {
      'worker_screening': { label: 'Worker Screening', color: 'bg-blue-500', icon: User },
      'vehicle_rego': { label: 'Vehicle Registration', color: 'bg-purple-500', icon: Car },
      'insurance': { label: 'Insurance', color: 'bg-amber-500', icon: Shield },
      'audit': { label: 'Audit', color: 'bg-rose-500', icon: AlertTriangle },
      'plan_review': { label: 'Plan Review', color: 'bg-emerald-500', icon: CalendarDays },
      'certification': { label: 'Certification', color: 'bg-teal-500', icon: CheckCircle2 },
    };
    return configs[type] || { label: type, color: 'bg-slate-500', icon: CalendarDays };
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      'low': { label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-200' },
      'medium': { label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      'high': { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      'critical': { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    return configs[priority] || configs['medium'];
  };

  const getStatusConfig = (status, dueDate) => {
    if (status === 'completed') {
      return { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
    }
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle };
    } else if (diffDays <= 7) {
      return { label: 'Due Soon', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock };
    }
    return { label: 'Upcoming', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CalendarDays };
  };

  const getDeadlinesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return deadlines.filter(d => d.due_date === dateStr);
  };

  const getDaysWithDeadlines = () => {
    return deadlines.map(d => new Date(d.due_date));
  };

  const upcomingDeadlines = deadlines
    .filter(d => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const overdueCount = deadlines.filter(d => {
    const today = new Date();
    const due = new Date(d.due_date);
    return d.status !== 'completed' && due < today;
  }).length;

  const dueSoonCount = deadlines.filter(d => {
    const today = new Date();
    const due = new Date(d.due_date);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return d.status !== 'completed' && diffDays >= 0 && diffDays <= 7;
  }).length;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6" data-testid="compliance-calendar-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Compliance Calendar</h1>
          <p className="text-slate-600">Track important deadlines and compliance requirements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-deadline-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Deadline
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create Compliance Deadline</DialogTitle>
              <DialogDescription>Add a new compliance deadline to track</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deadline_type">Deadline Type *</Label>
                <Select
                  value={formData.deadline_type}
                  onValueChange={(value) => setFormData({ ...formData, deadline_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker_screening">Worker Screening</SelectItem>
                    <SelectItem value="vehicle_rego">Vehicle Registration</SelectItem>
                    <SelectItem value="insurance">Insurance Renewal</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="plan_review">Plan Review</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual NDIS Audit"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_type">Related To</Label>
                <Select
                  value={formData.entity_type}
                  onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="staff">Staff Member</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this deadline..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Create Deadline</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Overdue</p>
                <p className="text-3xl font-bold text-rose-700">{overdueCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Due This Week</p>
                <p className="text-3xl font-bold text-amber-700">{dueSoonCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Deadlines</p>
                <p className="text-3xl font-bold text-blue-700">{deadlines.filter(d => d.status !== 'completed').length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-emerald-700">{deadlines.filter(d => d.status === 'completed').length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Calendar Section */}
        <div className="col-span-8">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-manrope font-semibold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-lg border-0 w-full"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-slate-500 rounded-md w-full font-medium text-sm py-2",
                  row: "flex w-full mt-2",
                  cell: "relative w-full p-0 text-center focus-within:relative focus-within:z-20",
                  day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-lg transition-colors",
                  day_selected: "bg-primary text-white hover:bg-primary hover:text-white",
                  day_today: "bg-primary-50 text-primary font-bold",
                }}
                modifiers={{
                  hasDeadline: getDaysWithDeadlines(),
                }}
                modifiersClassNames={{
                  hasDeadline: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-rose-500 after:rounded-full",
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Date Deadlines */}
          {getDeadlinesForDate(selectedDate).length > 0 && (
            <Card className="border-slate-100 shadow-sm mt-4">
              <CardHeader>
                <h3 className="font-semibold">
                  Deadlines for {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getDeadlinesForDate(selectedDate).map((deadline) => {
                    const typeConfig = getDeadlineTypeConfig(deadline.deadline_type);
                    const statusConfig = getStatusConfig(deadline.status, deadline.due_date);
                    const TypeIcon = typeConfig.icon;
                    
                    return (
                      <div key={deadline.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${typeConfig.color} bg-opacity-10 flex items-center justify-center`}>
                            <TypeIcon className={`w-5 h-5 ${typeConfig.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div>
                            <p className="font-medium">{deadline.title}</p>
                            <p className="text-sm text-slate-500">{typeConfig.label}</p>
                          </div>
                        </div>
                        {deadline.status !== 'completed' && (
                          <Button size="sm" onClick={() => handleComplete(deadline.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Deadlines Sidebar */}
        <div className="col-span-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline) => {
                    const typeConfig = getDeadlineTypeConfig(deadline.deadline_type);
                    const statusConfig = getStatusConfig(deadline.status, deadline.due_date);
                    const priorityConfig = getPriorityConfig(deadline.priority);
                    const TypeIcon = typeConfig.icon;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div
                        key={deadline.id}
                        className="p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedDate(new Date(deadline.due_date))}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full mt-1.5 ${typeConfig.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{deadline.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{typeConfig.label}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                              Due: {new Date(deadline.due_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                        {deadline.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(deadline.id);
                            }}
                            data-testid={`complete-${deadline.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-slate-100 shadow-sm mt-4">
            <CardHeader>
              <h3 className="text-sm font-semibold">Deadline Types</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['worker_screening', 'vehicle_rego', 'insurance', 'audit', 'plan_review', 'certification'].map((type) => {
                  const config = getDeadlineTypeConfig(type);
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComplianceCalendar;
