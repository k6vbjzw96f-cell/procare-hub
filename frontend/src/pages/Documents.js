import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, FileSignature, Send, Eye, CheckCircle2, Clock, XCircle, AlertTriangle, FileText, Users, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Documents = () => {
  const [templates, setTemplates] = useState([]);
  const [signatureRequests, setSignatureRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [integrationStatus, setIntegrationStatus] = useState({ mock_mode: true });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    template_id: '',
    client_id: '',
    signers: [{ email: '', name: '', role: 'participant' }],
    send_immediately: true,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchIntegrationStatus(),
      fetchTemplates(),
      fetchSignatureRequests(),
      fetchClients()
    ]);
    setLoading(false);
  };

  const fetchIntegrationStatus = async () => {
    try {
      const response = await axios.get(`${API}/documents/status`, getAuthHeader());
      setIntegrationStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch integration status');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/documents/templates`, getAuthHeader());
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to load templates');
    }
  };

  const fetchSignatureRequests = async () => {
    try {
      const response = await axios.get(`${API}/documents/signature-requests`, getAuthHeader());
      setSignatureRequests(response.data);
    } catch (error) {
      toast.error('Failed to load signature requests');
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, getAuthHeader());
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate signers
    const validSigners = formData.signers.filter(s => s.email && s.name);
    if (validSigners.length === 0) {
      toast.error('Please add at least one signer');
      return;
    }

    try {
      await axios.post(`${API}/documents/signature-request`, {
        ...formData,
        signers: validSigners
      }, getAuthHeader());
      
      toast.success('Signature request created');
      fetchSignatureRequests();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create signature request');
    }
  };

  const handleMockSign = async (requestId, signerEmail) => {
    try {
      await axios.post(`${API}/documents/mock-sign/${requestId}?signer_email=${signerEmail}`, {}, getAuthHeader());
      toast.success('Document signed (demo)');
      fetchSignatureRequests();
      if (selectedRequest?.id === requestId) {
        const updated = await axios.get(`${API}/documents/signature-requests/${requestId}`, getAuthHeader());
        setSelectedRequest(updated.data);
      }
    } catch (error) {
      toast.error('Failed to sign document');
    }
  };

  const handleResend = async (requestId) => {
    try {
      await axios.post(`${API}/documents/signature-requests/${requestId}/resend`, {}, getAuthHeader());
      toast.success('Signature request resent');
      fetchSignatureRequests();
    } catch (error) {
      toast.error('Failed to resend request');
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await axios.post(`${API}/documents/signature-requests/${requestId}/cancel`, {}, getAuthHeader());
      toast.success('Signature request cancelled');
      fetchSignatureRequests();
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const resetForm = () => {
    setFormData({
      template_id: '',
      client_id: '',
      signers: [{ email: '', name: '', role: 'participant' }],
      send_immediately: true,
    });
  };

  const addSigner = () => {
    setFormData({
      ...formData,
      signers: [...formData.signers, { email: '', name: '', role: 'signer' }]
    });
  };

  const updateSigner = (index, field, value) => {
    const updated = [...formData.signers];
    updated[index][field] = value;
    setFormData({ ...formData, signers: updated });
  };

  const removeSigner = (index) => {
    if (formData.signers.length === 1) return;
    const updated = formData.signers.filter((_, i) => i !== index);
    setFormData({ ...formData, signers: updated });
  };

  const getStatusConfig = (status) => {
    const configs = {
      'draft': { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
      'sent': { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
      'viewed': { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Eye },
      'signed': { label: 'Partially Signed', color: 'bg-amber-100 text-amber-700', icon: Clock },
      'completed': { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      'declined': { label: 'Declined', color: 'bg-rose-100 text-rose-700', icon: XCircle },
      'expired': { label: 'Expired', color: 'bg-slate-100 text-slate-500', icon: AlertTriangle },
      'cancelled': { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: XCircle },
    };
    return configs[status] || configs['draft'];
  };

  const pendingRequests = signatureRequests.filter(r => ['sent', 'viewed', 'signed'].includes(r.status));
  const completedRequests = signatureRequests.filter(r => r.status === 'completed');

  return (
    <div className="space-y-6" data-testid="documents-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Document Signing</h1>
          <p className="text-slate-600">E-sign service agreements and consent forms</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-signature-request">
              <Plus className="w-4 h-4 mr-2" />
              New Signature Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create Signature Request</DialogTitle>
              <DialogDescription>Send a document for electronic signature</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Document Template *</Label>
                <Select
                  value={formData.template_id}
                  onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Client/Participant *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => {
                    const client = clients.find(c => c.id === value);
                    setFormData({ 
                      ...formData, 
                      client_id: value,
                      signers: [{
                        email: client?.email || '',
                        name: `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
                        role: 'participant'
                      }]
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Signers</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSigner}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Signer
                  </Button>
                </div>
                {formData.signers.map((signer, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Signer {idx + 1}</span>
                      {formData.signers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSigner(idx)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Name"
                        value={signer.name}
                        onChange={(e) => updateSigner(idx, 'name', e.target.value)}
                        required
                      />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={signer.email}
                        onChange={(e) => updateSigner(idx, 'email', e.target.value)}
                        required
                      />
                    </div>
                    <Select
                      value={signer.role}
                      onValueChange={(value) => updateSigner(idx, 'role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="participant">Participant</SelectItem>
                        <SelectItem value="guardian">Guardian/Nominee</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="witness">Witness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="w-4 h-4 mr-2" />
                  Send for Signing
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integration Status Banner */}
      {integrationStatus.mock_mode && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Demo Mode</p>
                <p className="text-sm text-amber-700">
                  SignWell integration not configured. Documents are simulated. 
                  Add SIGNWELL_API_KEY to enable real e-signatures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-blue-700">{pendingRequests.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-emerald-700">{completedRequests.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Templates</p>
                <p className="text-3xl font-bold text-purple-700">{templates.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Requests</p>
                <p className="text-3xl font-bold text-amber-700">{signatureRequests.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FileSignature className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signature Requests */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
          <TabsTrigger value="all">All ({signatureRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-manrope font-semibold">Pending Signatures</h2>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSignatureRequests}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No pending signatures</p>
                  <p className="text-sm">Create a new signature request to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Signers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => {
                      const statusConfig = getStatusConfig(request.status);
                      const StatusIcon = statusConfig.icon;
                      const signedCount = request.signers?.filter(s => s.signed).length || 0;
                      const totalSigners = request.signers?.length || 0;
                      
                      return (
                        <TableRow key={request.id} className="cursor-pointer hover:bg-slate-50">
                          <TableCell className="font-medium">{request.template_name}</TableCell>
                          <TableCell>{request.client_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span>{signedCount}/{totalSigners} signed</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig.color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.sent_at ? new Date(request.sent_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResend(request.id)}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">Completed Documents</h2>
              </div>
            </CardHeader>
            <CardContent>
              {completedRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No completed documents</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Signers</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.template_name}</TableCell>
                        <TableCell>{request.client_name}</TableCell>
                        <TableCell>{request.signers?.length || 0} signers</TableCell>
                        <TableCell>
                          {request.completed_at ? new Date(request.completed_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">All Signature Requests</h2>
              </div>
            </CardHeader>
            <CardContent>
              {signatureRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No signature requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatureRequests.map((request) => {
                      const statusConfig = getStatusConfig(request.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.template_name}</TableCell>
                          <TableCell>{request.client_name}</TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig.color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{request.created_by}</TableCell>
                          <TableCell>
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{selectedRequest?.template_name}</DialogTitle>
            <DialogDescription>
              For {selectedRequest?.client_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusConfig(selectedRequest.status).color} border-0`}>
                  {getStatusConfig(selectedRequest.status).label}
                </Badge>
                {integrationStatus.mock_mode && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Demo Mode</Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Signers</Label>
                <div className="space-y-2">
                  {selectedRequest.signers?.map((signer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{signer.name}</p>
                        <p className="text-sm text-slate-500">{signer.email}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{signer.role}</Badge>
                      </div>
                      <div className="text-right">
                        {signer.signed ? (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">Signed</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-amber-600">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">Pending</span>
                            </div>
                            {integrationStatus.mock_mode && selectedRequest.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMockSign(selectedRequest.id, signer.email)}
                              >
                                Mock Sign
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                {selectedRequest.sent_at && (
                  <div>
                    <p className="text-slate-500">Sent</p>
                    <p className="font-medium">{new Date(selectedRequest.sent_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedRequest.completed_at && (
                  <div>
                    <p className="text-slate-500">Completed</p>
                    <p className="font-medium">{new Date(selectedRequest.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedRequest.status !== 'completed' && selectedRequest.status !== 'cancelled' && (
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => handleResend(selectedRequest.id)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend
                  </Button>
                  <Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => {
                    handleCancel(selectedRequest.id);
                    setIsDetailDialogOpen(false);
                  }}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
