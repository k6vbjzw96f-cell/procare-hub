import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Clock, StopCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const HourLogging = () => {
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    log_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    service_type: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/hours`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
      ]);
      setLogs(logsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleClockIn = async () => {
    if (!formData.client_id || !formData.service_type) {
      toast.error('Please select client and service type');
      return;
    }
    
    try {
      const now = new Date();
      const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      await axios.post(`${API}/hours`, {
        ...formData,
        start_time: startTime,
        end_time: null,
      }, getAuthHeader());
      
      toast.success('Clocked in successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to clock in');
    }
  };

  const handleClockOut = async (logId) => {
    const now = new Date();
    const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    try {
      await axios.put(`${API}/hours/${logId}/clock-out?end_time=${endTime}`, {}, getAuthHeader());
      toast.success('Clocked out successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to clock out');
    }
  };

  const handleManualLog = async () => {
    try {
      await axios.post(`${API}/hours`, formData, getAuthHeader());
      toast.success('Hours logged successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to log hours');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      log_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      service_type: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6" data-testid="hour-logging-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Hour Logging</h1>
          <p className="text-slate-600">Track your service hours and clock in/out</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="log-hours-button">
              <Plus className="w-4 h-4 mr-2" />
              Log Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Log Service Hours</DialogTitle>
              <DialogDescription>Clock in/out or manually log hours</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="client_id">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger data-testid="hour-client-select">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log_date">Date *</Label>
                  <Input
                    id="log_date"
                    type="date"
                    data-testid="hour-date-input"
                    value={formData.log_date}
                    onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Input
                    id="service_type"
                    data-testid="hour-service-input"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    placeholder="e.g., Personal Care"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    data-testid="hour-start-input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    data-testid="hour-end-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    data-testid="hour-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClockIn} data-testid="clock-in-button">
                  <Clock className="w-4 h-4 mr-2" />
                  Clock In Now
                </Button>
                <Button onClick={handleManualLog} data-testid="manual-log-button">
                  Log Hours Manually
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">Hour Logs</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500" data-testid="no-logs-message">
              No hours logged yet. Start tracking your service hours.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="table-row" data-testid={`log-row-${log.id}`}>
                    <TableCell>{log.log_date}</TableCell>
                    <TableCell className="font-medium">{log.client_name}</TableCell>
                    <TableCell>{log.service_type}</TableCell>
                    <TableCell>{log.start_time}</TableCell>
                    <TableCell>
                      {log.end_time || (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-100">
                          Clocked In
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{log.total_hours ? `${log.total_hours.toFixed(2)}h` : '-'}</TableCell>
                    <TableCell>
                      {log.is_clocked_in && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClockOut(log.id)}
                          data-testid={`clock-out-${log.id}`}
                        >
                          <StopCircle className="w-4 h-4 mr-1" />
                          Clock Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HourLogging;