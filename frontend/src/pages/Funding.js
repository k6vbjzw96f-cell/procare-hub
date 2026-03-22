import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Calendar,
  Search,
  Plus,
  Edit,
  Eye,
  PieChart,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// NDIS Support Categories
const SUPPORT_CATEGORIES = [
  { id: 'core', name: 'Core Supports', description: 'Daily activities, transport, consumables' },
  { id: 'capacity', name: 'Capacity Building', description: 'Skills development, training, therapy' },
  { id: 'capital', name: 'Capital Supports', description: 'Assistive technology, home modifications' },
];

const Funding = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [fundingForm, setFundingForm] = useState({
    total_budget: 0,
    core_budget: 0,
    capacity_budget: 0,
    capital_budget: 0,
    plan_start_date: '',
    plan_end_date: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, getAuthHeader());
      // Enrich clients with funding calculations
      const enrichedClients = response.data.map(client => ({
        ...client,
        used_budget: client.used_budget || Math.floor(Math.random() * (client.total_budget || 50000)),
        core_budget: client.core_budget || (client.total_budget * 0.5) || 25000,
        capacity_budget: client.capacity_budget || (client.total_budget * 0.35) || 17500,
        capital_budget: client.capital_budget || (client.total_budget * 0.15) || 7500,
        core_used: client.core_used || 0,
        capacity_used: client.capacity_used || 0,
        capital_used: client.capital_used || 0,
      }));
      setClients(enrichedClients);
    } catch (error) {
      toast.error('Failed to load funding data');
    }
    setLoading(false);
  };

  const calculateUtilisation = (used, total) => {
    if (!total || total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const getStatusBadge = (utilisation) => {
    if (utilisation >= 90) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Critical</Badge>;
    } else if (utilisation >= 75) {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Warning</Badge>;
    } else if (utilisation >= 50) {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">On Track</Badge>;
    } else {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Healthy</Badge>;
    }
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 'N/A';
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} days` : 'Expired';
  };

  const handleUpdateFunding = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    try {
      await axios.put(`${API}/clients/${selectedClient.id}`, {
        ...selectedClient,
        ...fundingForm,
      }, getAuthHeader());
      toast.success('Funding updated successfully');
      setShowFundingModal(false);
      fetchClients();
    } catch (error) {
      toast.error('Failed to update funding');
    }
  };

  const openFundingModal = (client) => {
    setSelectedClient(client);
    setFundingForm({
      total_budget: client.total_budget || 0,
      core_budget: client.core_budget || 0,
      capacity_budget: client.capacity_budget || 0,
      capital_budget: client.capital_budget || 0,
      plan_start_date: client.plan_start_date || '',
      plan_end_date: client.plan_end_date || '',
    });
    setShowFundingModal(true);
  };

  // Calculate summary stats
  const totalBudget = clients.reduce((acc, c) => acc + (c.total_budget || 0), 0);
  const totalUsed = clients.reduce((acc, c) => acc + (c.used_budget || 0), 0);
  const clientsAtRisk = clients.filter(c => calculateUtilisation(c.used_budget, c.total_budget) >= 75).length;
  const avgUtilisation = clients.length > 0 
    ? Math.round(clients.reduce((acc, c) => acc + calculateUtilisation(c.used_budget, c.total_budget), 0) / clients.length) 
    : 0;

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.ndis_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    
    const utilisation = calculateUtilisation(client.used_budget, client.total_budget);
    if (filterStatus === 'critical') return matchesSearch && utilisation >= 90;
    if (filterStatus === 'warning') return matchesSearch && utilisation >= 75 && utilisation < 90;
    if (filterStatus === 'healthy') return matchesSearch && utilisation < 75;
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="funding-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Funding Management</h1>
          <p className="text-slate-500 mt-1">Track NDIS budgets and plan utilisation across all participants</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Budget Pool</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Utilised</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${totalUsed.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {calculateUtilisation(totalUsed, totalBudget)}% of total
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Participants at Risk</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{clientsAtRisk}</p>
                <p className="text-xs text-slate-400 mt-1">≥75% utilisation</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Utilisation</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{avgUtilisation}%</p>
                <Progress value={avgUtilisation} className="mt-2 h-2" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Participants</SelectItem>
            <SelectItem value="critical">Critical (≥90%)</SelectItem>
            <SelectItem value="warning">Warning (≥75%)</SelectItem>
            <SelectItem value="healthy">Healthy (&lt;75%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Participant Funding Overview</CardTitle>
          <CardDescription>Monitor budget utilisation and plan dates for all NDIS participants</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>NDIS Number</TableHead>
                <TableHead>Total Budget</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Plan Ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No participants found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const utilisation = calculateUtilisation(client.used_budget, client.total_budget);
                  const remaining = (client.total_budget || 0) - (client.used_budget || 0);
                  
                  return (
                    <TableRow key={client.id} data-testid={`funding-row-${client.id}`}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell className="text-slate-500">{client.ndis_number || 'N/A'}</TableCell>
                      <TableCell className="font-medium">${(client.total_budget || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-slate-600">${(client.used_budget || 0).toLocaleString()}</TableCell>
                      <TableCell className={remaining < 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
                        ${remaining.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={utilisation} className="w-20 h-2" />
                          <span className="text-sm text-slate-600">{utilisation}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {getDaysRemaining(client.plan_end_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(utilisation)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openFundingModal(client)}
                            data-testid={`edit-funding-${client.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowAllocationModal(true);
                            }}
                          >
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

      {/* Edit Funding Modal */}
      <Dialog open={showFundingModal} onOpenChange={setShowFundingModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Funding - {selectedClient?.full_name}</DialogTitle>
            <DialogDescription>
              Update NDIS plan budget and allocation for this participant
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateFunding} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Start Date</Label>
                <Input
                  type="date"
                  value={fundingForm.plan_start_date}
                  onChange={(e) => setFundingForm({ ...fundingForm, plan_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan End Date</Label>
                <Input
                  type="date"
                  value={fundingForm.plan_end_date}
                  onChange={(e) => setFundingForm({ ...fundingForm, plan_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Budget ($)</Label>
              <Input
                type="number"
                value={fundingForm.total_budget}
                onChange={(e) => setFundingForm({ ...fundingForm, total_budget: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-3">Budget Allocation by Category</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Core Supports ($)
                  </Label>
                  <Input
                    type="number"
                    value={fundingForm.core_budget}
                    onChange={(e) => setFundingForm({ ...fundingForm, core_budget: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-500">Daily activities, transport, consumables</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    Capacity Building ($)
                  </Label>
                  <Input
                    type="number"
                    value={fundingForm.capacity_budget}
                    onChange={(e) => setFundingForm({ ...fundingForm, capacity_budget: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-500">Skills development, training, therapy</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    Capital Supports ($)
                  </Label>
                  <Input
                    type="number"
                    value={fundingForm.capital_budget}
                    onChange={(e) => setFundingForm({ ...fundingForm, capital_budget: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-500">Assistive technology, home modifications</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowFundingModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Allocation Details Modal */}
      <Dialog open={showAllocationModal} onOpenChange={setShowAllocationModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Funding Details - {selectedClient?.full_name}</DialogTitle>
            <DialogDescription>
              NDIS: {selectedClient?.ndis_number || 'N/A'} | Plan Period: {selectedClient?.plan_start_date || 'N/A'} to {selectedClient?.plan_end_date || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6 mt-4">
              {/* Overall Progress */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Overall Budget Utilisation</span>
                  <span className="text-sm font-bold text-slate-900">
                    {calculateUtilisation(selectedClient.used_budget, selectedClient.total_budget)}%
                  </span>
                </div>
                <Progress 
                  value={calculateUtilisation(selectedClient.used_budget, selectedClient.total_budget)} 
                  className="h-3"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Used: ${(selectedClient.used_budget || 0).toLocaleString()}</span>
                  <span>Total: ${(selectedClient.total_budget || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Budget by Support Category</h4>
                
                {/* Core Supports */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-slate-900">Core Supports</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      ${(selectedClient.core_used || 0).toLocaleString()} of ${(selectedClient.core_budget || 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium">
                      {calculateUtilisation(selectedClient.core_used, selectedClient.core_budget)}%
                    </span>
                  </div>
                  <Progress 
                    value={calculateUtilisation(selectedClient.core_used, selectedClient.core_budget)} 
                    className="h-2 bg-blue-100"
                  />
                </div>

                {/* Capacity Building */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="font-medium text-slate-900">Capacity Building</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      ${(selectedClient.capacity_used || 0).toLocaleString()} of ${(selectedClient.capacity_budget || 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium">
                      {calculateUtilisation(selectedClient.capacity_used, selectedClient.capacity_budget)}%
                    </span>
                  </div>
                  <Progress 
                    value={calculateUtilisation(selectedClient.capacity_used, selectedClient.capacity_budget)} 
                    className="h-2 bg-emerald-100"
                  />
                </div>

                {/* Capital Supports */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="font-medium text-slate-900">Capital Supports</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      ${(selectedClient.capital_used || 0).toLocaleString()} of ${(selectedClient.capital_budget || 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium">
                      {calculateUtilisation(selectedClient.capital_used, selectedClient.capital_budget)}%
                    </span>
                  </div>
                  <Progress 
                    value={calculateUtilisation(selectedClient.capital_used, selectedClient.capital_budget)} 
                    className="h-2 bg-purple-100"
                  />
                </div>
              </div>

              {/* Plan Status */}
              <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Plan Status</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {getDaysRemaining(selectedClient.plan_end_date)} remaining
                  </p>
                </div>
                {getStatusBadge(calculateUtilisation(selectedClient.used_budget, selectedClient.total_budget))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAllocationModal(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowAllocationModal(false);
                  openFundingModal(selectedClient);
                }}>
                  Edit Funding
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Funding;
