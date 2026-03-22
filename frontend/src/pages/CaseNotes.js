import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, FileText, AlertTriangle, Pill, Search, Eye, CheckCircle, 
  Clock, User, Calendar, MapPin, Users, Edit, Trash2, Filter
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const NOTE_TYPES = {
  shift_note: { label: 'Shift Note', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  incident_report: { label: 'Incident Report', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  missed_medication: { label: 'Missed Medication', icon: Pill, color: 'bg-amber-100 text-amber-700' },
};

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

const CaseNotes = () => {
  const [notes, setNotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [formData, setFormData] = useState({
    note_type: 'shift_note',
    client_id: '',
    shift_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    // Incident fields
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '',
    incident_location: '',
    incident_severity: 'low',
    witnesses: '',
    actions_taken: '',
    follow_up_required: false,
    // Missed medication fields
    medication_name: '',
    scheduled_time: '',
    reason_missed: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notesRes, clientsRes, shiftsRes, statsRes] = await Promise.all([
        axios.get(`${API}/case-notes`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
        axios.get(`${API}/shifts`, getAuthHeader()),
        axios.get(`${API}/case-notes/stats/summary`, getAuthHeader()),
      ]);
      setNotes(notesRes.data);
      setClients(clientsRes.data);
      setShifts(shiftsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load case notes');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/case-notes`, formData, getAuthHeader());
      toast.success('Case note submitted successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit case note');
    }
  };

  const handleReview = async (noteId) => {
    try {
      await axios.put(`${API}/case-notes/${noteId}/review`, {}, getAuthHeader());
      toast.success('Note marked as reviewed');
      fetchData();
      setShowViewModal(false);
    } catch (error) {
      toast.error('Failed to review note');
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await axios.delete(`${API}/case-notes/${noteId}`, getAuthHeader());
      toast.success('Note deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const resetForm = () => {
    setFormData({
      note_type: 'shift_note',
      client_id: '',
      shift_id: '',
      shift_date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
      incident_date: new Date().toISOString().split('T')[0],
      incident_time: '',
      incident_location: '',
      incident_severity: 'low',
      witnesses: '',
      actions_taken: '',
      follow_up_required: false,
      medication_name: '',
      scheduled_time: '',
      reason_missed: '',
    });
  };

  const openCreateModal = (noteType) => {
    resetForm();
    setFormData(prev => ({ ...prev, note_type: noteType }));
    setShowCreateModal(true);
  };

  const viewNote = (note) => {
    setSelectedNote(note);
    setShowViewModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-blue-100 text-blue-700',
      reviewed: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-slate-200 text-slate-600',
    };
    return <Badge className={styles[status] || styles.draft}>{status}</Badge>;
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || note.note_type === activeTab;
    const matchesStatus = filterStatus === 'all' || note.status === filterStatus;
    return matchesSearch && matchesTab && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} data-testid="case-notes-page">
      {/* Header */}
      <div className={`flex items-center justify-between transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Case Notes</h1>
          <p className="text-slate-500 mt-1">Document shift activities, incidents, and medication reports</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => openCreateModal('shift_note')} className="transition-all duration-200 hover:scale-105 hover:shadow-md">
            <FileText className="w-4 h-4 mr-2" />
            Shift Note
          </Button>
          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-105 hover:shadow-md" onClick={() => openCreateModal('incident_report')}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Incident Report
          </Button>
          <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-200 hover:scale-105 hover:shadow-md" onClick={() => openCreateModal('missed_medication')}>
            <Pill className="w-4 h-4 mr-2" />
            Missed Medication
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 transition-all duration-500 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Card className="border-slate-200 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_notes}</p>
                  <p className="text-xs text-slate-500">Total Notes</p>
                </div>
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats.shift_notes}</p>
                  <p className="text-xs text-slate-500">Shift Notes</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-700">{stats.incident_reports}</p>
                  <p className="text-xs text-slate-500">Incidents</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-amber-700">{stats.missed_medications}</p>
                  <p className="text-xs text-slate-500">Missed Meds</p>
                </div>
                <Pill className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-100">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats.pending_review}</p>
                  <p className="text-xs text-slate-500">Pending Review</p>
                </div>
                <Clock className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-rose-100">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-rose-700">{stats.high_severity_incidents}</p>
                  <p className="text-xs text-slate-500">High Severity</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-rose-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Notes</TabsTrigger>
            <TabsTrigger value="shift_note">Shift Notes</TabsTrigger>
            <TabsTrigger value="incident_report">Incidents</TabsTrigger>
            <TabsTrigger value="missed_medication">Missed Meds</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No case notes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => {
                  const TypeIcon = NOTE_TYPES[note.note_type]?.icon || FileText;
                  return (
                    <TableRow key={note.id} className="cursor-pointer hover:bg-slate-50" onClick={() => viewNote(note)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${NOTE_TYPES[note.note_type]?.color || 'bg-slate-100'}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <span className="text-sm">{NOTE_TYPES[note.note_type]?.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{note.title}</TableCell>
                      <TableCell>{note.client_name}</TableCell>
                      <TableCell className="text-slate-600">{note.staff_name}</TableCell>
                      <TableCell className="text-slate-500">
                        {note.shift_date || note.incident_date || new Date(note.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(note.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); viewNote(note); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Note Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.note_type === 'shift_note' && <><FileText className="w-5 h-5 text-blue-600" /> New Shift Note</>}
              {formData.note_type === 'incident_report' && <><AlertTriangle className="w-5 h-5 text-red-600" /> New Incident Report</>}
              {formData.note_type === 'missed_medication' && <><Pill className="w-5 h-5 text-amber-600" /> Missed Medication Report</>}
            </DialogTitle>
            <DialogDescription>
              {formData.note_type === 'shift_note' && 'Document activities and observations from your shift'}
              {formData.note_type === 'incident_report' && 'Report any incidents that occurred during care'}
              {formData.note_type === 'missed_medication' && 'Report any missed or refused medications'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Shift (Optional)</Label>
                <Select value={formData.shift_id} onValueChange={(v) => setFormData({ ...formData, shift_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {shifts.filter(s => !formData.client_id || s.client_id === formData.client_id).slice(0, 20).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.shift_date} - {s.client_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={
                  formData.note_type === 'shift_note' ? 'e.g., Morning shift summary' :
                  formData.note_type === 'incident_report' ? 'e.g., Fall incident in bathroom' :
                  'e.g., Morning medication refused'
                }
                required
              />
            </div>

            {/* Incident-specific Fields */}
            {formData.note_type === 'incident_report' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Incident Date *</Label>
                    <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Incident Time</Label>
                    <Input type="time" value={formData.incident_time} onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Severity *</Label>
                    <Select value={formData.incident_severity} onValueChange={(v) => setFormData({ ...formData, incident_severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={formData.incident_location} onChange={(e) => setFormData({ ...formData, incident_location: e.target.value })} placeholder="Where did the incident occur?" />
                </div>
                <div className="space-y-2">
                  <Label>Witnesses</Label>
                  <Input value={formData.witnesses} onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })} placeholder="Names of any witnesses" />
                </div>
              </>
            )}

            {/* Missed Medication Fields */}
            {formData.note_type === 'missed_medication' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medication Name *</Label>
                    <Input value={formData.medication_name} onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })} placeholder="e.g., Panadol 500mg" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled Time *</Label>
                    <Input type="time" value={formData.scheduled_time} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason Missed/Refused *</Label>
                  <Select value={formData.reason_missed} onValueChange={(v) => setFormData({ ...formData, reason_missed: v })}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refused">Client refused</SelectItem>
                      <SelectItem value="unavailable">Medication unavailable</SelectItem>
                      <SelectItem value="asleep">Client asleep</SelectItem>
                      <SelectItem value="vomiting">Client vomiting/unwell</SelectItem>
                      <SelectItem value="away">Client away from residence</SelectItem>
                      <SelectItem value="other">Other reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Content Field */}
            <div className="space-y-2">
              <Label>
                {formData.note_type === 'shift_note' ? 'Shift Notes *' :
                 formData.note_type === 'incident_report' ? 'Incident Description *' :
                 'Additional Details *'}
              </Label>
              <Textarea 
                value={formData.content} 
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={
                  formData.note_type === 'shift_note' ? 'Describe activities, observations, and any notable events during the shift...' :
                  formData.note_type === 'incident_report' ? 'Describe what happened, how it happened, and any injuries or damage...' :
                  'Provide any additional context about the missed medication...'
                }
                rows={5}
                required
              />
            </div>

            {/* Actions Taken (for incidents) */}
            {formData.note_type === 'incident_report' && (
              <>
                <div className="space-y-2">
                  <Label>Actions Taken</Label>
                  <Textarea 
                    value={formData.actions_taken} 
                    onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                    placeholder="What actions were taken in response to the incident?"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="follow_up" 
                    checked={formData.follow_up_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, follow_up_required: checked })}
                  />
                  <Label htmlFor="follow_up" className="text-sm font-normal">Follow-up action required</Label>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit">Submit Note</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Note Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${NOTE_TYPES[selectedNote.note_type]?.color}`}>
                    {selectedNote.note_type === 'shift_note' && <FileText className="w-5 h-5" />}
                    {selectedNote.note_type === 'incident_report' && <AlertTriangle className="w-5 h-5" />}
                    {selectedNote.note_type === 'missed_medication' && <Pill className="w-5 h-5" />}
                  </div>
                  <div>
                    <DialogTitle>{selectedNote.title}</DialogTitle>
                    <DialogDescription>{NOTE_TYPES[selectedNote.note_type]?.label}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Client:</strong> {selectedNote.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Staff:</strong> {selectedNote.staff_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Date:</strong> {selectedNote.shift_date || selectedNote.incident_date || new Date(selectedNote.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Status:</strong> {getStatusBadge(selectedNote.status)}</span>
                  </div>
                </div>

                {/* Incident-specific info */}
                {selectedNote.note_type === 'incident_report' && (
                  <div className="p-4 border border-red-100 bg-red-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-red-800">Incident Details</span>
                      <Badge className={SEVERITY_LEVELS.find(s => s.value === selectedNote.incident_severity)?.color}>
                        {selectedNote.incident_severity} severity
                      </Badge>
                    </div>
                    {selectedNote.incident_time && <p className="text-sm"><strong>Time:</strong> {selectedNote.incident_time}</p>}
                    {selectedNote.incident_location && <p className="text-sm"><strong>Location:</strong> {selectedNote.incident_location}</p>}
                    {selectedNote.witnesses && <p className="text-sm"><strong>Witnesses:</strong> {selectedNote.witnesses}</p>}
                    {selectedNote.follow_up_required && (
                      <Badge className="bg-amber-100 text-amber-700">Follow-up Required</Badge>
                    )}
                  </div>
                )}

                {/* Missed medication info */}
                {selectedNote.note_type === 'missed_medication' && (
                  <div className="p-4 border border-amber-100 bg-amber-50 rounded-lg space-y-2">
                    <span className="font-medium text-amber-800">Medication Details</span>
                    <p className="text-sm"><strong>Medication:</strong> {selectedNote.medication_name}</p>
                    <p className="text-sm"><strong>Scheduled Time:</strong> {selectedNote.scheduled_time}</p>
                    <p className="text-sm"><strong>Reason:</strong> {selectedNote.reason_missed}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <h4 className="font-medium mb-2">
                    {selectedNote.note_type === 'shift_note' ? 'Shift Notes' : 
                     selectedNote.note_type === 'incident_report' ? 'Incident Description' : 'Details'}
                  </h4>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedNote.content}</p>
                </div>

                {/* Actions taken */}
                {selectedNote.actions_taken && (
                  <div>
                    <h4 className="font-medium mb-2">Actions Taken</h4>
                    <p className="text-slate-600 whitespace-pre-wrap">{selectedNote.actions_taken}</p>
                  </div>
                )}

                {/* Review info */}
                {selectedNote.reviewed_by && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700">
                        Reviewed by <strong>{selectedNote.reviewed_by}</strong> on {new Date(selectedNote.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <div>
                    {selectedNote.status === 'submitted' && (
                      <Button variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => handleReview(selectedNote.id)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Reviewed
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseNotes;
