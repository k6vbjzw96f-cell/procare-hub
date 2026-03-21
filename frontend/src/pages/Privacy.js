import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <img src="/procare-logo.png" alt="ProCare Hub" className="h-12" />
            </div>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-slate-500">Last updated: March 2026</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
            <p className="text-slate-600 mb-4">
              ProCare Hub collects information necessary to provide NDIS provider management services, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Account information (name, email, phone number)</li>
              <li>Organization details</li>
              <li>Client and participant information</li>
              <li>Staff records and employment details</li>
              <li>Service delivery records</li>
              <li>Financial and invoicing data</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600 mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Provide and maintain our services</li>
              <li>Process NDIS claims and invoices</li>
              <li>Manage staff rostering and scheduling</li>
              <li>Ensure compliance with NDIS requirements</li>
              <li>Send important notifications and updates</li>
              <li>Improve our services</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Security</h2>
            <p className="text-slate-600 mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>256-bit SSL encryption for all data transmission</li>
              <li>Secure cloud infrastructure with regular backups</li>
              <li>Multi-factor authentication options</li>
              <li>Regular security audits and updates</li>
              <li>Role-based access controls</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Sharing</h2>
            <p className="text-slate-600 mb-4">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>NDIS and relevant government agencies (as required)</li>
              <li>Integrated services (Xero, payment processors) with your consent</li>
              <li>Service providers who assist our operations</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
            <p className="text-slate-600 mb-4">
              Under Australian Privacy Principles, you have the right to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Access your personal information</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Lodge a complaint with the OAIC</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Retention</h2>
            <p className="text-slate-600 mb-4">
              We retain data in accordance with NDIS record-keeping requirements and applicable laws. 
              Generally, records are kept for a minimum of 7 years after the last service delivery.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              For privacy inquiries or concerns, contact us at:
            </p>
            <p className="text-slate-600">
              <strong>Email:</strong> support@procare-hub.com<br />
              <strong>Website:</strong> www.procare-hub.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
