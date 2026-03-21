import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, GraduationCap, FileText, DollarSign, ClipboardCheck, Star, 
  Plus, CheckCircle2, Clock, AlertTriangle, Calendar, Building2,
  Mail, Phone, UserPlus, Award, TrendingUp, Eye, Pencil
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const HR = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [staff, setStaff] = useState([]);
  const [onboardingChecklists, setOnboardingChecklists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [courses, setCourses] = useState([]);
  const [staffTraining, setStaffTraining] = useState([]);
  const [expiringCerts, setExpiringCerts] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [directory, setDirectory] = useState([]);

  // Dialog states
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);

  // Form states
  const [onboardingForm, setOnboardingForm] = useState({ staff_id: '', target_days: 30 });
  const [reviewForm, setReviewForm] = useState({
    staff_id: '',
    review_period_start: '',
    review_period_end: '',
    review_type: 'quarterly',
    scheduled_date: ''
  });
  const [trainingForm, setTrainingForm] = useState({ staff_id: '', course_id: '', due_date: '' });
  const [payrollForm, setPayrollForm] = useState({ pay_period_start: '', pay_period_end: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, staffRes] = await Promise.all([
        axios.get(`${API}/hr/stats`, getAuthHeader()),
        axios.get(`${API}/staff`, getAuthHeader())
      ]);
      setStats(statsRes.data);
      setStaff(staffRes.data);

      if (activeTab === 'onboarding') {
        const res = await axios.get(`${API}/hr/onboarding/checklists`, getAuthHeader());
        setOnboardingChecklists(res.data);
      } else if (activeTab === 'reviews') {
        const res = await axios.get(`${API}/hr/reviews`, getAuthHeader());
        setReviews(res.data);
      } else if (activeTab === 'training') {
        const [coursesRes, expiringRes] = await Promise.all([
          axios.get(`${API}/hr/training/courses`, getAuthHeader()),
          axios.get(`${API}/hr/training/expiring?days=60`, getAuthHeader())
        ]);
        setCourses(coursesRes.data);
        setExpiringCerts(expiringRes.data);
      } else if (activeTab === 'payroll') {
        const res = await axios.get(`${API}/hr/payroll`, getAuthHeader());
        setPayrollRecords(res.data);
      } else if (activeTab === 'directory') {
        const res = await axios.get(`${API}/hr/directory`, getAuthHeader());
        setDirectory(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  const handleCreateOnboarding = async () => {
    try {
      await axios.post(`${API}/hr/onboarding/checklist?staff_id=${onboardingForm.staff_id}&target_days=${onboardingForm.target_days}`, {}, getAuthHeader());
      toast.success('Onboarding checklist created');
      setIsOnboardingDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create checklist');
    }
  };

  const handleCompleteTask = async (checklistId, taskId, completed) => {
    try {
      await axios.put(`${API}/hr/onboarding/checklist/${checklistId}/task/${taskId}?completed=${completed}`, {}, getAuthHeader());
      toast.success('Task updated');
      // Refresh the checklist
      const res = await axios.get(`${API}/hr/onboarding/checklist/${selectedChecklist.staff_id}`, getAuthHeader());
      setSelectedChecklist(res.data);
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleCreateReview = async () => {
    try {
      await axios.post(`${API}/hr/reviews`, reviewForm, getAuthHeader());
      toast.success('Performance review scheduled');
      setIsReviewDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create review');
    }
  };

  const handleAssignTraining = async () => {
    try {
      await axios.post(`${API}/hr/training/assign?staff_id=${trainingForm.staff_id}&course_id=${trainingForm.course_id}&due_date=${trainingForm.due_date}`, {}, getAuthHeader());
      toast.success('Training assigned');
      setIsTrainingDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign training');
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      await axios.post(`${API}/hr/payroll/generate?pay_period_start=${payrollForm.pay_period_start}&pay_period_end=${payrollForm.pay_period_end}`, {}, getAuthHeader());
      toast.success('Payroll generated');
      setIsPayrollDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate payroll');
    }
  };

  const handleApprovePayroll = async (recordId) => {
    try {
      await axios.put(`${API}/hr/payroll/${recordId}/approve`, {}, getAuthHeader());
      toast.success('Payroll approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve payroll');
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const formatCurrency = (amount) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  return (
    <div className="space-y-6" data-testid="hr-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Human Resources</h1>
          <p className="text-slate-600">Manage employee lifecycle, training, and payroll</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="w-4 h-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2">
            <Users className="w-4 h-4" />
            Directory
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Staff</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.total_staff || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Onboarding</p>
                    <p className="text-3xl font-bold text-amber-700">{stats.onboarding_in_progress || 0}</p>
                  </div>
                  <UserPlus className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Pending Reviews</p>
                    <p className="text-3xl font-bold text-purple-700">{stats.pending_reviews || 0}</p>
                  </div>
                  <Star className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Expiring Certs</p>
                    <p className="text-3xl font-bold text-rose-700">{stats.expiring_certifications || 0}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Pending Payroll</p>
                    <p className="text-3xl font-bold text-emerald-700">{stats.pending_payroll || 0}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={() => { setActiveTab('onboarding'); setIsOnboardingDialogOpen(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" /> Start New Onboarding
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { setActiveTab('reviews'); setIsReviewDialogOpen(true); }}>
                  <Star className="w-4 h-4 mr-2" /> Schedule Performance Review
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { setActiveTab('training'); setIsTrainingDialogOpen(true); }}>
                  <GraduationCap className="w-4 h-4 mr-2" /> Assign Training
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { setActiveTab('payroll'); setIsPayrollDialogOpen(true); }}>
                  <DollarSign className="w-4 h-4 mr-2" /> Generate Payroll
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staff.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {member.photo_url ? <AvatarImage src={member.photo_url} /> : null}
                        <AvatarFallback className="bg-primary-100 text-primary text-sm">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.full_name}</p>
                        <p className="text-xs text-slate-500">{member.position}</p>
                      </div>
                      <Badge variant="outline">{member.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Employee Onboarding</h2>
            <Dialog open={isOnboardingDialogOpen} onOpenChange={setIsOnboardingDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> New Onboarding</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Onboarding</DialogTitle>
                  <DialogDescription>Create onboarding checklist for a new employee</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={onboardingForm.staff_id} onValueChange={(v) => setOnboardingForm({...onboardingForm, staff_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Days to Complete</Label>
                    <Input type="number" value={onboardingForm.target_days} onChange={(e) => setOnboardingForm({...onboardingForm, target_days: parseInt(e.target.value)})} />
                  </div>
                  <Button className="w-full" onClick={handleCreateOnboarding}>Create Checklist</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onboardingChecklists.map((checklist) => (
              <Card key={checklist.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedChecklist(checklist)}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{checklist.staff_name}</h3>
                      <p className="text-sm text-slate-500">Started: {checklist.start_date}</p>
                    </div>
                    <Badge className={checklist.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {checklist.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{checklist.progress_percentage}%</span>
                    </div>
                    <Progress value={checklist.progress_percentage} className="h-2" />
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Target: {checklist.target_completion_date}</p>
                </CardContent>
              </Card>
            ))}
            {onboardingChecklists.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No onboarding in progress</p>
              </div>
            )}
          </div>

          {/* Checklist Detail Dialog */}
          <Dialog open={!!selectedChecklist} onOpenChange={() => setSelectedChecklist(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboarding: {selectedChecklist?.staff_name}</DialogTitle>
                <DialogDescription>
                  Progress: {selectedChecklist?.progress_percentage}% complete
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {selectedChecklist?.tasks?.map((task) => (
                  <div key={task.task_id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => handleCompleteTask(selectedChecklist.id, task.task_id, checked)}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.name}</p>
                      <p className="text-sm text-slate-500">{task.description}</p>
                      {task.completed && (
                        <p className="text-xs text-emerald-600 mt-1">Completed by {task.completed_by}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">{task.category}</Badge>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Performance Reviews</h2>
            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Schedule Review</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Performance Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={reviewForm.staff_id} onValueChange={(v) => setReviewForm({...reviewForm, staff_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Review Type</Label>
                    <Select value={reviewForm.review_type} onValueChange={(v) => setReviewForm({...reviewForm, review_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="adhoc">Ad-hoc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input type="date" value={reviewForm.review_period_start} onChange={(e) => setReviewForm({...reviewForm, review_period_start: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input type="date" value={reviewForm.review_period_end} onChange={(e) => setReviewForm({...reviewForm, review_period_end: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled Date</Label>
                    <Input type="date" value={reviewForm.scheduled_date} onChange={(e) => setReviewForm({...reviewForm, scheduled_date: e.target.value})} />
                  </div>
                  <Button className="w-full" onClick={handleCreateReview}>Schedule Review</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-slate-100 shadow-sm">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.staff_name}</TableCell>
                      <TableCell><Badge variant="outline">{review.review_type}</Badge></TableCell>
                      <TableCell className="text-sm">{review.review_period_start} to {review.review_period_end}</TableCell>
                      <TableCell>{review.scheduled_date}</TableCell>
                      <TableCell>
                        {review.overall_rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{review.overall_rating}/5</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          review.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          review.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }>{review.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reviews.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No reviews scheduled</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Training & Certifications</h2>
            <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Assign Training</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Training</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={trainingForm.staff_id} onValueChange={(v) => setTrainingForm({...trainingForm, staff_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select value={trainingForm.course_id} onValueChange={(v) => setTrainingForm({...trainingForm, course_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={trainingForm.due_date} onChange={(e) => setTrainingForm({...trainingForm, due_date: e.target.value})} />
                  </div>
                  <Button className="w-full" onClick={handleAssignTraining}>Assign Training</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {expiringCerts.length > 0 && (
            <Card className="border-rose-200 bg-rose-50">
              <CardHeader>
                <CardTitle className="text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Expiring Certifications (Next 60 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringCerts.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium">{cert.staff_name}</p>
                        <p className="text-sm text-slate-600">{cert.course_name}</p>
                      </div>
                      <Badge variant="destructive">Expires: {cert.expiry_date}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Available Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-4 border border-slate-100 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">{course.description}</p>
                      </div>
                      {course.is_mandatory && <Badge variant="destructive">Mandatory</Badge>}
                    </div>
                    <div className="flex gap-4 mt-3 text-sm text-slate-500">
                      <span><Clock className="w-4 h-4 inline mr-1" />{course.duration_hours}h</span>
                      {course.validity_months && <span><Calendar className="w-4 h-4 inline mr-1" />Valid {course.validity_months} months</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Payroll</h2>
            <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Generate Payroll</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Payroll</DialogTitle>
                  <DialogDescription>Generate payroll for all active staff for the specified period</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input type="date" value={payrollForm.pay_period_start} onChange={(e) => setPayrollForm({...payrollForm, pay_period_start: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input type="date" value={payrollForm.pay_period_end} onChange={(e) => setPayrollForm({...payrollForm, pay_period_end: e.target.value})} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleGeneratePayroll}>Generate Payroll</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-slate-100 shadow-sm">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Regular Hrs</TableHead>
                    <TableHead>OT Hrs</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.staff_name}</TableCell>
                      <TableCell className="text-sm">{record.pay_period_start} - {record.pay_period_end}</TableCell>
                      <TableCell>{record.regular_hours}</TableCell>
                      <TableCell>{record.overtime_hours}</TableCell>
                      <TableCell>{formatCurrency(record.gross_pay)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(record.net_pay)}</TableCell>
                      <TableCell>
                        <Badge className={
                          record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          record.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }>{record.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === 'pending' && (
                          <Button size="sm" onClick={() => handleApprovePayroll(record.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrollRecords.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No payroll records</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Directory Tab */}
        <TabsContent value="directory" className="space-y-6">
          <h2 className="text-xl font-semibold">Employee Directory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {directory.map((employee) => (
              <Card key={employee.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      {employee.photo_url ? <AvatarImage src={employee.photo_url} /> : null}
                      <AvatarFallback className="bg-primary-100 text-primary text-xl">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{employee.full_name}</h3>
                      <p className="text-sm text-slate-600">{employee.position}</p>
                      <Badge variant="outline" className="mt-1">{employee.department}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    {employee.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${employee.email}`} className="hover:text-primary">{employee.email}</a>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${employee.phone}`} className="hover:text-primary">{employee.phone}</a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {directory.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No employees in directory</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HR;
