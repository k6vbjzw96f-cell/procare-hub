import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Palette, Globe, Bell, Shield, Users, FileText, Upload, ImagePlus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Organisation = () => {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [orgSettings, setOrgSettings] = useState({
    company_name: '',
    tagline: '',
    abn: '',
    ndis_provider_number: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: '',
  });

  const [brandSettings, setBrandSettings] = useState({
    primary_color: '#10b981',
    secondary_color: '#14b8a6',
    accent_color: '#f59e0b',
    roster_color_scheme: 'default',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    shift_reminders: true,
    incident_alerts: true,
    compliance_alerts: true,
    leave_notifications: true,
    new_staff_notifications: true,
  });

  const [bankSettings, setBankSettings] = useState({
    bank_name: '',
    bank_account_name: '',
    bank_bsb: '',
    bank_account_number: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/company-settings`, getAuthHeader());
      if (response.data) {
        setOrgSettings({
          company_name: response.data.company_name || '',
          tagline: response.data.tagline || '',
          abn: response.data.abn || '',
          ndis_provider_number: response.data.ndis_provider_number || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          website: response.data.website || '',
          logo_url: response.data.logo_url || '',
        });
        setBankSettings({
          bank_name: response.data.bank_name || '',
          bank_account_name: response.data.bank_account_name || '',
          bank_bsb: response.data.bank_bsb || '',
          bank_account_number: response.data.bank_account_number || '',
        });
        if (response.data.brand_settings) {
          setBrandSettings(response.data.brand_settings);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleSaveOrganisation = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/company-settings`, {
        ...orgSettings,
        ...bankSettings,
        brand_settings: brandSettings,
      }, getAuthHeader());
      toast.success('Organisation settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
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
      setOrgSettings({ ...orgSettings, logo_url: response.data.logo_url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    }
    setUploadingLogo(false);
  };

  const colorPresets = [
    { name: 'Emerald', primary: '#10b981', secondary: '#14b8a6' },
    { name: 'Blue', primary: '#3b82f6', secondary: '#0ea5e9' },
    { name: 'Purple', primary: '#8b5cf6', secondary: '#a855f7' },
    { name: 'Rose', primary: '#f43f5e', secondary: '#ec4899' },
    { name: 'Orange', primary: '#f97316', secondary: '#fb923c' },
    { name: 'Slate', primary: '#475569', secondary: '#64748b' },
  ];

  return (
    <div className="space-y-6" data-testid="organisation-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Organisation Settings</h1>
        <p className="text-slate-600">Manage your organisation's profile, branding, and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <FileText className="w-4 h-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Profile</CardTitle>
              <CardDescription>Your organisation's public information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveOrganisation} className="space-y-6">
                {/* Logo Section */}
                <div className="flex items-start gap-6 pb-6 border-b">
                  <div className="flex-shrink-0">
                    {orgSettings.logo_url ? (
                      <div className="relative">
                        <img 
                          src={orgSettings.logo_url} 
                          alt="Organisation Logo" 
                          className="w-32 h-32 object-contain border rounded-lg bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => setOrgSettings({ ...orgSettings, logo_url: '' })}
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
                    <Label className="text-base font-semibold">Organisation Logo</Label>
                    <p className="text-sm text-slate-500 mb-3">
                      This logo appears on invoices, reports, and throughout the platform.
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
                  </div>
                </div>

                {/* Organisation Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Organisation Name *</Label>
                    <Input
                      value={orgSettings.company_name}
                      onChange={(e) => setOrgSettings({ ...orgSettings, company_name: e.target.value })}
                      placeholder="Your Organisation Name"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Tagline / Description</Label>
                    <Input
                      value={orgSettings.tagline}
                      onChange={(e) => setOrgSettings({ ...orgSettings, tagline: e.target.value })}
                      placeholder="e.g., Quality NDIS Support Services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ABN</Label>
                    <Input
                      value={orgSettings.abn}
                      onChange={(e) => setOrgSettings({ ...orgSettings, abn: e.target.value })}
                      placeholder="12 345 678 901"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NDIS Provider Number</Label>
                    <Input
                      value={orgSettings.ndis_provider_number}
                      onChange={(e) => setOrgSettings({ ...orgSettings, ndis_provider_number: e.target.value })}
                      placeholder="4-XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={orgSettings.email}
                      onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                      placeholder="contact@organisation.com.au"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={orgSettings.phone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                      placeholder="1300 XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={orgSettings.website}
                      onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                      placeholder="www.organisation.com.au"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={orgSettings.address}
                      onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                      placeholder="Street Address, City, State, Postcode"
                      rows={2}
                    />
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

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Customize colors used throughout the platform and on rosters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Presets */}
              <div>
                <Label className="mb-3 block">Quick Presets</Label>
                <div className="flex gap-3 flex-wrap">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setBrandSettings({
                        ...brandSettings,
                        primary_color: preset.primary,
                        secondary_color: preset.secondary,
                      })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        brandSettings.primary_color === preset.primary
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="text-sm font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custom Colors */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandSettings.primary_color}
                      onChange={(e) => setBrandSettings({ ...brandSettings, primary_color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandSettings.primary_color}
                      onChange={(e) => setBrandSettings({ ...brandSettings, primary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Used for buttons, links, and accents</p>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandSettings.secondary_color}
                      onChange={(e) => setBrandSettings({ ...brandSettings, secondary_color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandSettings.secondary_color}
                      onChange={(e) => setBrandSettings({ ...brandSettings, secondary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Used for secondary elements</p>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandSettings.accent_color}
                      onChange={(e) => setBrandSettings({ ...brandSettings, accent_color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandSettings.accent_color}
                      onChange={(e) => setBrandSettings({ ...brandSettings, accent_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Used for highlights and alerts</p>
                </div>
              </div>

              <Separator />

              {/* Roster Color Scheme */}
              <div>
                <Label className="mb-3 block">Roster Color Scheme</Label>
                <Select
                  value={brandSettings.roster_color_scheme}
                  onValueChange={(value) => setBrandSettings({ ...brandSettings, roster_color_scheme: value })}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Service Type Colors)</SelectItem>
                    <SelectItem value="staff">By Staff Member</SelectItem>
                    <SelectItem value="client">By Client</SelectItem>
                    <SelectItem value="status">By Shift Status</SelectItem>
                    <SelectItem value="brand">Brand Colors Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">Choose how shifts are color-coded on the roster</p>
              </div>

              {/* Preview */}
              <div className="mt-6 p-6 bg-slate-50 rounded-lg">
                <Label className="mb-4 block">Preview</Label>
                <div className="flex gap-4">
                  <div 
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: brandSettings.primary_color }}
                  >
                    Primary Button
                  </div>
                  <div 
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: brandSettings.secondary_color }}
                  >
                    Secondary
                  </div>
                  <div 
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: brandSettings.accent_color }}
                  >
                    Accent
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveOrganisation} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Brand Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure which notifications your organisation receives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'shift_reminders', label: 'Shift Reminders', desc: 'Send reminders to staff before their shifts' },
                { key: 'incident_alerts', label: 'Incident Alerts', desc: 'Immediate alerts when incidents are reported' },
                { key: 'compliance_alerts', label: 'Compliance Alerts', desc: 'Alerts for expiring certifications and compliance items' },
                { key: 'leave_notifications', label: 'Leave Notifications', desc: 'Notifications for leave requests and approvals' },
                { key: 'new_staff_notifications', label: 'New Staff Alerts', desc: 'Alerts when new staff members are added' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <Label className="text-base">{item.label}</Label>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notificationSettings[item.key]}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, [item.key]: checked })}
                  />
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveOrganisation} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bank & Payment Details</CardTitle>
              <CardDescription>These details appear on your invoices for participant payments</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveOrganisation} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={bankSettings.bank_name}
                      onChange={(e) => setBankSettings({ ...bankSettings, bank_name: e.target.value })}
                      placeholder="Commonwealth Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      value={bankSettings.bank_account_name}
                      onChange={(e) => setBankSettings({ ...bankSettings, bank_account_name: e.target.value })}
                      placeholder="Your Organisation Pty Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BSB</Label>
                    <Input
                      value={bankSettings.bank_bsb}
                      onChange={(e) => setBankSettings({ ...bankSettings, bank_bsb: e.target.value })}
                      placeholder="XXX-XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={bankSettings.bank_account_number}
                      onChange={(e) => setBankSettings({ ...bankSettings, bank_account_number: e.target.value })}
                      placeholder="XXXX XXXX"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Payment Details'}
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

export default Organisation;
