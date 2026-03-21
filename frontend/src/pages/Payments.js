import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle, FileText, Receipt } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Payments = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    reference: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`, getAuthHeader());
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    }
    setLoading(false);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await axios.put(
        `${API}/invoices/${selectedInvoice.id}/status?status=paid`,
        {},
        getAuthHeader()
      );
      toast.success('Payment recorded successfully');
      fetchInvoices();
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentData({ amount: '', payment_method: 'bank_transfer', reference: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'draft': { label: 'Draft', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: FileText },
      'sent': { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ArrowUpRight },
      'paid': { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
      'overdue': { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
      'cancelled': { label: 'Cancelled', color: 'bg-slate-50 text-slate-500 border-slate-200', icon: XCircle },
    };
    return configs[status] || configs['draft'];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };

  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalPending = pendingInvoices.reduce((acc, i) => acc + i.total_amount, 0);
  const totalReceived = paidInvoices.reduce((acc, i) => acc + i.total_amount, 0);

  return (
    <div className="space-y-6" data-testid="payments-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Payment Processing</h1>
          <p className="text-slate-600">Track invoice payments and financial transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Invoices</p>
                <p className="text-3xl font-bold text-blue-700">{invoices.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Pending Payment</p>
                <p className="text-3xl font-bold text-amber-700">{pendingInvoices.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Amount Pending</p>
                <p className="text-2xl font-bold text-rose-700">{formatCurrency(totalPending)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Received</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalReceived)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({paidInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">Pending Payments</h2>
              </div>
            </CardHeader>
            <CardContent>
              {pendingInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm">No pending payments at the moment.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service Period</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvoices.map((invoice) => {
                      const statusConfig = getStatusConfig(invoice.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow key={invoice.id} className="table-row">
                          <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.client_name}</TableCell>
                          <TableCell>{invoice.service_period}</TableCell>
                          <TableCell>{invoice.due_date}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentData({ ...paymentData, amount: invoice.total_amount.toString() });
                                setIsPaymentDialogOpen(true);
                              }}
                              data-testid={`record-payment-${invoice.id}`}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Record Payment
                            </Button>
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

        <TabsContent value="paid">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">Paid Invoices</h2>
              </div>
            </CardHeader>
            <CardContent>
              {paidInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No payments recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="table-row">
                        <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>{invoice.service_period}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
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
                <h2 className="text-xl font-manrope font-semibold">All Invoices</h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No invoices found</p>
                  <p className="text-sm">Create invoices from the Invoices page.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service Period</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const statusConfig = getStatusConfig(invoice.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow key={invoice.id} className="table-row">
                          <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.client_name}</TableCell>
                          <TableCell>{invoice.service_period}</TableCell>
                          <TableCell>{invoice.due_date}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
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

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment for invoice {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Invoice Amount</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(selectedInvoice?.total_amount || 0)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-slate-600">Client</span>
                <span className="font-medium">{selectedInvoice?.client_name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={paymentData.payment_method}
                onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="ndis_direct">NDIS Direct Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference</Label>
              <Input
                id="reference"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="e.g., Transaction ID, Cheque number"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
