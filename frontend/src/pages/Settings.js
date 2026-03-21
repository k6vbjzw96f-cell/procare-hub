import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, User, Building, Bell, Lock, Upload } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Settings = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    fetchSettings();
  }, []);

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building className="w-4 h-4" />
            Organization
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
