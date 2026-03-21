import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, User, TrendingUp, Calendar, Trophy, Flag } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    goal_type: 'short_term',
    title: '',
    description: '',
    target_date: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchGoals(selectedClient);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, getAuthHeader());
      setClients(response.data);
      if (response.data.length > 0) {
        setSelectedClient(response.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load clients');
    }
    setLoading(false);
  };

  const fetchGoals = async (clientId) => {
    try {
      const response = await axios.get(`${API}/goals/client/${clientId}`, getAuthHeader());
      setGoals(response.data);
    } catch (error) {
      toast.error('Failed to load goals');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/goals`, formData, getAuthHeader());
      toast.success('Goal created successfully');
      fetchGoals(selectedClient);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create goal');
    }
  };

  const handleProgressUpdate = async (goalId, newProgress) => {
    try {
      await axios.put(`${API}/goals/${goalId}/progress?progress=${newProgress}`, {}, getAuthHeader());
      toast.success('Progress updated');
      fetchGoals(selectedClient);
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: selectedClient,
      goal_type: 'short_term',
      title: '',
      description: '',
      target_date: '',
    });
  };

  const getGoalTypeConfig = (type) => {
    const configs = {
      'short_term': { label: 'Short Term', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Flag },
      'long_term': { label: 'Long Term', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Target },
      'daily': { label: 'Daily', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Calendar },
    };
    return configs[type] || configs['short_term'];
  };

  const getStatusConfig = (status) => {
    const configs = {
      'active': { label: 'Active', color: 'bg-amber-50 text-amber-700 border-amber-100' },
      'achieved': { label: 'Achieved', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      'cancelled': { label: 'Cancelled', color: 'bg-slate-50 text-slate-700 border-slate-100' },
    };
    return configs[status] || configs['active'];
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const achievedGoals = goals.filter(g => g.status === 'achieved');

  return (
    <div className="space-y-6" data-testid="goals-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Goal Tracking</h1>
          <p className="text-slate-600">Set and monitor participant goals and progress</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-goal-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>Set a new goal for a participant</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="client_id">Participant *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal_type">Goal Type *</Label>
                  <Select
                    value={formData.goal_type}
                    onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">Short Term</SelectItem>
                      <SelectItem value="long_term">Long Term</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_date">Target Date *</Label>
                  <Input
                    id="target_date"
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">Goal Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Improve mobility with daily exercises"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the goal in detail, including milestones..."
                    rows={4}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Create Goal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client Selector */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-primary" />
            <Label className="text-sm font-medium">Select Participant:</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Active Goals</p>
                <p className="text-3xl font-bold text-blue-700">{activeGoals.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Achieved</p>
                <p className="text-3xl font-bold text-emerald-700">{achievedGoals.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Avg Progress</p>
                <p className="text-3xl font-bold text-purple-700">
                  {activeGoals.length > 0 
                    ? Math.round(activeGoals.reduce((acc, g) => acc + g.progress_percentage, 0) / activeGoals.length)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">Participant Goals</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No goals found</p>
              <p className="text-sm">Create a goal for this participant to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const typeConfig = getGoalTypeConfig(goal.goal_type);
                const statusConfig = getStatusConfig(goal.status);
                const TypeIcon = typeConfig.icon;
                
                return (
                  <div key={goal.id} className="border border-slate-100 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900">{goal.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">{goal.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        Target: {goal.target_date}
                      </div>
                    </div>

                    {goal.status === 'active' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 font-medium">Progress</span>
                          <span className="font-bold text-primary">{goal.progress_percentage}%</span>
                        </div>
                        <Progress value={goal.progress_percentage} className="h-3" />
                        <div className="flex gap-2 pt-2">
                          {[25, 50, 75, 100].map((progress) => (
                            <Button
                              key={progress}
                              variant={goal.progress_percentage >= progress ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleProgressUpdate(goal.id, progress)}
                              data-testid={`progress-${goal.id}-${progress}`}
                            >
                              {progress}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {goal.status === 'achieved' && (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                        <Trophy className="w-5 h-5" />
                        <span className="font-medium">Goal Achieved!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Goals;
