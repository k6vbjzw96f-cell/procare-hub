import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Facilities = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    facility_name: '',
    facility_type: 'gym',
    location: '',
    capacity: 0,
    equipment: [],
    booking_required: false,
  });
  const [equipmentInput, setEquipmentInput] = useState('');

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await axios.get(`${API}/facilities`, getAuthHeader());
      setFacilities(response.data);
    } catch (error) {
      toast.error('Failed to load facilities');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/facilities`, formData, getAuthHeader());
      toast.success('Facility added successfully');
      fetchFacilities();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add facility');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this facility?')) return;
    try {
      await axios.delete(`${API}/facilities/${id}`, getAuthHeader());
      toast.success('Facility deleted successfully');
      fetchFacilities();
    } catch (error) {
      toast.error('Failed to delete facility');
    }
  };

  const addEquipment = () => {
    if (equipmentInput.trim()) {
      setFormData({
        ...formData,
        equipment: [...formData.equipment, equipmentInput.trim()],
      });
      setEquipmentInput('');
    }
  };

  const removeEquipment = (index) => {
    setFormData({
      ...formData,
      equipment: formData.equipment.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      facility_name: '',
      facility_type: 'gym',
      location: '',
      capacity: 0,
      equipment: [],
      booking_required: false,
    });
    setEquipmentInput('');
  };

  const getStatusBadge = (status) => {
    const styles = {
      available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'in-use': 'bg-blue-50 text-blue-700 border-blue-100',
      maintenance: 'bg-amber-50 text-amber-700 border-amber-100',
      unavailable: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.available}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const icons = {
      gym: '💪',
      'therapy room': '🧘',
      kitchen: '🍳',
      recreation: '🎮',
      other: '🏢',
    };
    return (
      <span className="flex items-center gap-2">
        <span>{icons[type] || icons.other}</span>
        <span className="capitalize">{type}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="facilities-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Facilities</h1>
          <p className="text-slate-600">Manage facilities and equipment</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-facility-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New Facility</DialogTitle>
              <DialogDescription>Register a new facility or resource</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="facility_name">Facility Name *</Label>
                  <Input
                    id="facility_name"
                    value={formData.facility_name}
                    onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
                    placeholder="Main Gym"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facility_type">Type *</Label>
                  <Select
                    value={formData.facility_type}
                    onValueChange={(value) => setFormData({ ...formData, facility_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gym">Gym</SelectItem>
                      <SelectItem value="therapy room">Therapy Room</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="recreation">Recreation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    placeholder="Max number of people"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Building A, Ground Floor"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Equipment / Resources</Label>
                  <div className="flex gap-2">
                    <Input
                      value={equipmentInput}
                      onChange={(e) => setEquipmentInput(e.target.value)}
                      placeholder="e.g., Treadmill, Weights"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
                    />
                    <Button type="button" onClick={addEquipment} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.equipment.map((item, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {item}
                        <button type="button" onClick={() => removeEquipment(index)} className="ml-1">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="booking_required"
                      checked={formData.booking_required}
                      onChange={(e) => setFormData({ ...formData, booking_required: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="booking_required" className="cursor-pointer">
                      Booking Required
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Add Facility</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">All Facilities</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading facilities...</div>
          ) : facilities.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No facilities registered. Add your first facility to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilities.map((facility) => (
                  <TableRow key={facility.id} className="table-row">
                    <TableCell className="font-medium">{facility.facility_name}</TableCell>
                    <TableCell>{getTypeBadge(facility.facility_type)}</TableCell>
                    <TableCell>{facility.location}</TableCell>
                    <TableCell>{facility.capacity} people</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {facility.equipment.length > 0 ? (
                          facility.equipment.slice(0, 2).map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm">None</span>
                        )}
                        {facility.equipment.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{facility.equipment.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {facility.booking_required ? (
                        <Badge variant="secondary">Required</Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">Not required</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(facility.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(facility.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default Facilities;
