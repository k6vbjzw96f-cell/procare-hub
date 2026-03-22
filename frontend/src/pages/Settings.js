import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, User, Building, Bell, Lock, Upload, Calendar, Link2, CheckCircle2, AlertTriangle, ExternalLink, FileText, ImagePlus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Settings = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [calendarStatus, setCalendarStatus] = useState({ connected: false, mock_mode: true });
  
  const [profileData, setProfileData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [orgData, setOrgData] = useState({
    organization_name: '',
    abn: '',
    ndis_provider_number: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notifications: true,
    shift_reminders: true,
    incident_alerts: true,
    invoice_notifications: true,
    compliance_alerts: true,
  });

  // Company Settings for Invoice Branding
  const [companyData, setCompanyData] = useState({
    company_name: '',
    tagline: '',
    abn: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: '',
    bank_name: '',
    bank_account_name: '',
    bank_bsb: '',
    bank_account_number: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCalendarStatus();
    fetchCompanySettings();
    
    // Check for calendar connection success
    if (searchParams.get('calendar') === 'connected') {
      toast.success('Google Calendar connected successfully!');
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    try {
      const [orgRes, notifsRes] = await Promise.all([
        axios.get(`${API}/settings/organization`, getAuthHeader()),
        axios.get(`${API}/settings/notifications`, getAuthHeader()),
      ]);
      setOrgData(orgRes.data);
      setNotificationPrefs(notifsRes.data);
    } catch (error) {
      // Silent fail
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      const response = await axios.get(`${API}/calendar/status`, getAuthHeader());
      setCalendarStatus(response.data);
    } catch (error) {
      // Silent fail
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await axios.get(`${API}/company-settings`, getAuthHeader());
      if (response.data) {
        setCompanyData({
          company_name: response.data.company_name || '',
          tagline: response.data.tagline || '',
          abn: response.data.abn || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          website: response.data.website || '',
          logo_url: response.data.logo_url || '',
          bank_name: response.data.bank_name || '',
          bank_account_name: response.data.bank_account_name || '',
          bank_bsb: response.data.bank_bsb || '',
          bank_account_number: response.data.bank_account_number || '',
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleUpdateCompanySettings = async (e) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      toast.error('Only administrators can update company settings');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API}/company-settings`, companyData, getAuthHeader());
      toast.success('Company settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save company settings');
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/company-settings/logo`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setCompanyData({ ...companyData, logo_url: response.data.logo_url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    }
    setUploadingLogo(false);
  };

  const handleConnectCalendar = async () => {
    try {
      const response = await axios.get(`${API}/calendar/auth-url`, getAuthHeader());
      window.location.href = response.data.authorization_url;
    } catch (error) {
      toast.error('Failed to initiate calendar connection');
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await axios.delete(`${API}/calendar/disconnect`, getAuthHeader());
      setCalendarStatus({ ...calendarStatus, connected: false, google_email: null });
      toast.success('Calendar disconnected');
    } catch (error) {
      toast.error('Failed to disconnect calendar');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.put(`${API}/settings/profile`, profileData, getAuthHeader());
      localStorage.setItem('user', JSON.stringify(response.data));
      setUser(response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/settings/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      }, getAuthHeader());
      toast.success('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/settings/profile-photo`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const updatedUser = { ...user, photo_url: response.data.photo_url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Photo uploaded successfully');
      window.location.reload(); // Refresh to show new photo
    } catch (error) {
      toast.error('Failed to upload photo');
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      toast.error('Only administrators can update organization settings');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API}/settings/organization`, orgData, getAuthHeader());
      toast.success('Organization settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update organization');
    }
    setLoading(false);
  };

  const handleUpdateNotifications = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/settings/notifications`, notificationPrefs, getAuthHeader());
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Settings</h1>
        <p className="text-slate-600">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <FileText className="w-4 h-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile photo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.photo_url ? `${API}${user.photo_url}?auth=${localStorage.getItem('token')}` : undefined} />
                  <AvatarFallback className="bg-primary-100 text-primary-700 text-2xl">
                    {user.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <label className="cursor-pointer">
                    <Button variant="outline" type="button" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG or JPEG. Max 2MB.</p>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={user.role || 'N/A'} disabled className="bg-slate-50" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Company Branding</CardTitle>
              <CardDescription>
                Customize your company logo and details that appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCompanySettings} className="space-y-6">
                {/* Logo Upload Section */}
                <div className="flex items-start gap-6 pb-6 border-b">
                  <div className="flex-shrink-0">
                    {companyData.logo_url ? (
                      <div className="relative">
                        <img 
                          src={companyData.logo_url} 
                          alt="Company Logo" 
                          className="w-32 h-32 object-contain border rounded-lg bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => setCompanyData({ ...companyData, logo_url: '' })}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50">
                        <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs text-slate-500">No logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-base font-semibold">Company Logo</Label>
                    <p className="text-sm text-slate-500 mb-3">
                      Upload your company logo to display on invoices. Recommended size: 200x200px
                    </p>
                    <label className="cursor-pointer">
                      <Button variant="outline" type="button" disabled={uploadingLogo} asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">PNG, JPG or JPEG. Max 5MB.</p>
                  </div>
                </div>

                {/* Company Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={companyData.company_name}
                      onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                      placeholder="Your Company Name"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="tagline">Tagline / Description</Label>
                    <Input
                      id="tagline"
                      value={companyData.tagline}
                      onChange={(e) => setCompanyData({ ...companyData, tagline: e.target.value })}
                      placeholder="e.g., NDIS Provider Services"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_abn">ABN</Label>
                    <Input
                      id="company_abn"
                      value={companyData.abn}
                      onChange={(e) => setCompanyData({ ...companyData, abn: e.target.value })}
                      placeholder="12 345 678 901"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Phone</Label>
                    <Input
                      id="company_phone"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                      placeholder="+61 4XX XXX XXX"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      placeholder="accounts@company.com"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_website">Website</Label>
                    <Input
                      id="company_website"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      placeholder="www.company.com"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="company_address">Address</Label>
                    <Input
                      id="company_address"
                      value={companyData.address}
                      onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                      placeholder="123 Main St, City, State 1234"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                </div>

                {/* Bank Details */}
                <Separator />
                <div>
                  <Label className="text-base font-semibold mb-4 block">Payment Details (shown on invoices)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={companyData.bank_name}
                        onChange={(e) => setCompanyData({ ...companyData, bank_name: e.target.value })}
                        placeholder="Commonwealth Bank"
                        disabled={user.role !== 'admin'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_name">Account Name</Label>
                      <Input
                        id="bank_account_name"
                        value={companyData.bank_account_name}
                        onChange={(e) => setCompanyData({ ...companyData, bank_account_name: e.target.value })}
                        placeholder="Company Pty Ltd"
                        disabled={user.role !== 'admin'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_bsb">BSB</Label>
                      <Input
                        id="bank_bsb"
                        value={companyData.bank_bsb}
                        onChange={(e) => setCompanyData({ ...companyData, bank_bsb: e.target.value })}
                        placeholder="XXX-XXX"
                        disabled={user.role !== 'admin'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_number">Account Number</Label>
                      <Input
                        id="bank_account_number"
                        value={companyData.bank_account_number}
                        onChange={(e) => setCompanyData({ ...companyData, bank_account_number: e.target.value })}
                        placeholder="XXXX XXXX"
                        disabled={user.role !== 'admin'}
                      />
                    </div>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Company Settings'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                {user.role === 'admin' 
                  ? 'Manage your organization information' 
                  : 'View organization information (admin access required to edit)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOrganization} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="organization_name">Organization Name</Label>
                    <Input
                      id="organization_name"
                      value={orgData.organization_name}
                      onChange={(e) => setOrgData({ ...orgData, organization_name: e.target.value })}
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      value={orgData.abn}
                      onChange={(e) => setOrgData({ ...orgData, abn: e.target.value })}
                      placeholder="12 345 678 901"
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ndis_provider_number">NDIS Provider Number</Label>
                    <Input
                      id="ndis_provider_number"
                      value={orgData.ndis_provider_number}
                      onChange={(e) => setOrgData({ ...orgData, ndis_provider_number: e.target.value })}
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={orgData.contact_email}
                      onChange={(e) => setOrgData({ ...orgData, contact_email: e.target.value })}
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={orgData.contact_phone}
                      onChange={(e) => setOrgData({ ...orgData, contact_phone: e.target.value })}
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={orgData.address}
                      onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                      disabled={user.role !== 'admin'}
                    />
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          {/* Google Calendar Integration */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Google Calendar
                      {calendarStatus.mock_mode && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Demo Mode</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Sync your shifts with Google Calendar</CardDescription>
                  </div>
                </div>
                {calendarStatus.connected ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {calendarStatus.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">Connected Account</p>
                      <p className="text-sm text-slate-500">{calendarStatus.google_email || 'demo.user@gmail.com'}</p>
                    </div>
                    <Button variant="outline" onClick={handleDisconnectCalendar}>
                      Disconnect
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Auto-sync Shifts</Label>
                      <p className="text-sm text-slate-500">Automatically sync new shifts to your calendar</p>
                    </div>
                    <Switch
                      checked={calendarStatus.sync_enabled}
                      onCheckedChange={() => {}}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {calendarStatus.mock_mode && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Demo Mode</p>
                        <p>Google Calendar API credentials not configured. Click below to simulate connection.</p>
                        <p className="mt-1 text-xs">To enable real integration, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment.</p>
                      </div>
                    </div>
                  )}
                  <Button onClick={handleConnectCalendar}>
                    <Calendar className="w-4 h-4 mr-2" />
                    {calendarStatus.mock_mode ? 'Simulate Connection' : 'Connect Google Calendar'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Signing Integration */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    SignWell E-Signatures
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Demo Mode</Badge>
                  </CardTitle>
                  <CardDescription>Electronic document signing for service agreements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium">E-Signature Integration</p>
                    <p className="text-slate-500 mt-1">
                      Send service agreements and consent forms for electronic signature. 
                      Go to <a href="/documents" className="text-primary hover:underline">Documents</a> to create signature requests.
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href="/documents">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Go to Document Signing
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email_notifications" className="text-base font-medium">Email Notifications</Label>
                    <p className="text-sm text-slate-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="email_notifications"
                    checked={notificationPrefs.email_notifications}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, email_notifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="shift_reminders" className="text-base font-medium">Shift Reminders</Label>
                    <p className="text-sm text-slate-500">Get notified about upcoming shifts</p>
                  </div>
                  <Switch
                    id="shift_reminders"
                    checked={notificationPrefs.shift_reminders}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, shift_reminders: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="incident_alerts" className="text-base font-medium">Incident Alerts</Label>
                    <p className="text-sm text-slate-500">High priority incident notifications</p>
                  </div>
                  <Switch
                    id="incident_alerts"
                    checked={notificationPrefs.incident_alerts}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, incident_alerts: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="invoice_notifications" className="text-base font-medium">Invoice Notifications</Label>
                    <p className="text-sm text-slate-500">Updates about invoices and payments</p>
                  </div>
                  <Switch
                    id="invoice_notifications"
                    checked={notificationPrefs.invoice_notifications}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, invoice_notifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compliance_alerts" className="text-base font-medium">Compliance Alerts</Label>
                    <p className="text-sm text-slate-500">NDIS compliance and audit notifications</p>
                  </div>
                  <Switch
                    id="compliance_alerts"
                    checked={notificationPrefs.compliance_alerts}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, compliance_alerts: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateNotifications} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
