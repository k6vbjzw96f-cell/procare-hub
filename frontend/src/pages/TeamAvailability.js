import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Calendar, Clock, Coffee, CheckCircle2, XCircle, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const TeamAvailability = () => {
  const [teamData, setTeamData] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    notes: ''
  });

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (viewMode === 'day') {
      fetchDayAvailability();
    } else {
      fetchWeekAvailability();
    }
  }, [selectedDate, viewMode]);

  const fetchDayAvailability = async () => {
    try {
      const response = await axios.get(`${API}/team/availability?date=${selectedDate}`, getAuthHeader());
      setTeamData(response.data);
    } catch (error) {
      toast.error('Failed to load team availability');
    }
    setLoading(false);
  };

  const fetchWeekAvailability = async () => {
    try {
      // Get Monday of the selected week
      const date = new Date(selectedDate);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const mondayStr = monday.toISOString().split('T')[0];
      
      const response = await axios.get(`${API}/team/availability/week?start_date=${mondayStr}`, getAuthHeader());
      setWeekData(response.data);
    } catch (error) {
      toast.error('Failed to load week availability');
    }
    setLoading(false);
  };

  const handleSetAvailability = async () => {
    if (!selectedStaff) return;
    
    try {
      await axios.post(`${API}/staff/availability`, {
        staff_id: selectedStaff.staff_id,
        ...availabilityForm
      }, getAuthHeader());
      
      toast.success('Availability updated');
      setIsAvailabilityDialogOpen(false);
      fetchDayAvailability();
      fetchWeekAvailability();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const navigateDate = (direction) => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      date.setDate(date.getDate() + direction);
    } else {
      date.setDate(date.getDate() + (direction * 7));
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getStatusColor = (member) => {
    if (!member.attendance?.is_clocked_in) return 'bg-slate-100 text-slate-600';
    if (member.on_break) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getStatusText = (member) => {
    if (!member.attendance?.is_clocked_in) return 'Not Clocked In';
    if (member.on_break) return 'On Break';
    return 'Working';
  };

  const clockedInCount = teamData.filter(m => m.attendance?.is_clocked_in).length;
  const onBreakCount = teamData.filter(m => m.on_break).length;
  const availableCount = teamData.filter(m => m.availability?.is_available !== false).length;

  return (
    <div className="space-y-6" data-testid="team-availability-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Team Availability</h1>
          <p className="text-slate-600">View and manage staff schedules and availability</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day View</SelectItem>
              <SelectItem value="week">Week View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {viewMode === 'day' ? 'Previous Day' : 'Previous Week'}
            </Button>
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-primary" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                Today
              </Button>
            </div>
            <Button variant="outline" onClick={() => navigateDate(1)}>
              {viewMode === 'day' ? 'Next Day' : 'Next Week'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {viewMode === 'day' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Staff</p>
                  <p className="text-3xl font-bold text-blue-700">{teamData.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Clocked In</p>
                  <p className="text-3xl font-bold text-emerald-700">{clockedInCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">On Break</p>
                  <p className="text-3xl font-bold text-amber-700">{onBreakCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Available Today</p>
                  <p className="text-3xl font-bold text-purple-700">{availableCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-manrope font-semibold">
                Team Status - {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : teamData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No staff members found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamData.map((member) => (
                  <div
                    key={member.staff_id}
                    className="p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        {member.photo_url ? (
                          <AvatarImage src={member.photo_url} alt={member.staff_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary-100 text-primary font-medium">
                          {getInitials(member.staff_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{member.staff_name}</h3>
                        <p className="text-sm text-slate-500">{member.position}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${getStatusColor(member)} border-0`}>
                            {getStatusText(member)}
                          </Badge>
                          {member.shifts_today > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {member.shifts_today} shift{member.shifts_today > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      {member.attendance?.is_clocked_in && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Clocked in: {member.attendance.clock_in_time}</span>
                          {member.attendance.clock_out_time && (
                            <span>- {member.attendance.clock_out_time}</span>
                          )}
                        </div>
                      )}
                      {member.availability && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Available: {member.availability.start_time} - {member.availability.end_time}</span>
                        </div>
                      )}
                      {member.breaks_today > 0 && (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <Coffee className="w-4 h-4" />
                          <span>{member.breaks_today} break{member.breaks_today > 1 ? 's' : ''} today</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => {
                        setSelectedStaff(member);
                        setIsAvailabilityDialogOpen(true);
                      }}
                    >
                      Set Availability
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-manrope font-semibold">Weekly Availability</h2>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Staff</th>
                      {weekData.map((day) => (
                        <th key={day.date} className="text-center py-3 px-2 font-medium text-slate-600 min-w-[100px]">
                          <div className="text-sm">{day.day_name.substring(0, 3)}</div>
                          <div className="text-xs text-slate-400">{new Date(day.date).getDate()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekData[0]?.staff.map((staff) => (
                      <tr key={staff.staff_id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary-100 text-primary text-xs">
                                {getInitials(staff.staff_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{staff.staff_name}</span>
                          </div>
                        </td>
                        {weekData.map((day) => {
                          const staffDay = day.staff.find(s => s.staff_id === staff.staff_id);
                          return (
                            <td key={`${staff.staff_id}-${day.date}`} className="py-3 px-2 text-center">
                              {staffDay?.is_available !== false ? (
                                staffDay?.start_time ? (
                                  <div className="bg-emerald-50 text-emerald-700 rounded px-2 py-1 text-xs">
                                    {staffDay.start_time} - {staffDay.end_time}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-xs">Available</div>
                                )
                              ) : (
                                <div className="bg-slate-100 text-slate-500 rounded px-2 py-1 text-xs">
                                  Unavailable
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Set Availability Dialog */}
      <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Set Availability</DialogTitle>
            <DialogDescription>
              Set availability for {selectedStaff?.staff_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={availabilityForm.day_of_week.toString()}
                onValueChange={(value) => setAvailabilityForm({ ...availabilityForm, day_of_week: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={availabilityForm.start_time}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={availabilityForm.end_time}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Available</Label>
              <Button
                variant={availabilityForm.is_available ? "default" : "outline"}
                size="sm"
                onClick={() => setAvailabilityForm({ ...availabilityForm, is_available: !availabilityForm.is_available })}
              >
                {availabilityForm.is_available ? (
                  <><CheckCircle2 className="w-4 h-4 mr-1" /> Available</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-1" /> Unavailable</>
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any notes..."
                value={availabilityForm.notes}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAvailabilityDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetAvailability}>
                Save Availability
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamAvailability;
