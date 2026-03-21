import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
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
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-slate-500">Last updated: March 2026</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 mb-4">
              By accessing or using ProCare Hub, you agree to be bound by these Terms of Service and our Privacy Policy. 
              If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 mb-4">
              ProCare Hub provides a cloud-based NDIS provider management platform including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Client and participant management</li>
              <li>Staff rostering and scheduling</li>
              <li>Invoicing and financial management</li>
              <li>Compliance tracking and reporting</li>
              <li>HR and workforce management</li>
              <li>Integration with third-party services</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
            <p className="text-slate-600 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. Subscription and Payment</h2>
            <p className="text-slate-600 mb-4">
              ProCare Hub offers various subscription plans:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Starter: $25/month</li>
              <li>Growth: $45/month</li>
              <li>Pro: $99/month</li>
              <li>Organisation: $160/month</li>
            </ul>
            <p className="text-slate-600 mb-4">
              All prices are in AUD and do not include GST. Annual billing provides 2 months free.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. NDIS Compliance</h2>
            <p className="text-slate-600 mb-4">
              While ProCare Hub provides tools to assist with NDIS compliance:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>You remain responsible for compliance with all NDIS requirements</li>
              <li>The platform does not guarantee NDIS audit success</li>
              <li>You must ensure data accuracy and completeness</li>
              <li>Regular review of compliance features is recommended</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Ownership</h2>
            <p className="text-slate-600 mb-4">
              You retain ownership of all data you input into ProCare Hub. We do not claim any 
              intellectual property rights over your content. You grant us license to use your 
              data solely for providing and improving our services.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. Limitation of Liability</h2>
            <p className="text-slate-600 mb-4">
              To the maximum extent permitted by law, ProCare Hub shall not be liable for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>Indirect, incidental, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Service interruptions or data loss</li>
              <li>Third-party service failures</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Termination</h2>
            <p className="text-slate-600 mb-4">
              Either party may terminate the service:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-600">
              <li>You may cancel your subscription at any time</li>
              <li>We may suspend accounts for violation of these terms</li>
              <li>Upon termination, you may request export of your data</li>
              <li>Data will be retained for 30 days post-termination</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to Terms</h2>
            <p className="text-slate-600 mb-4">
              We may update these terms from time to time. We will notify you of significant changes 
              via email or in-app notification. Continued use of the service after changes constitutes 
              acceptance of the new terms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">10. Governing Law</h2>
            <p className="text-slate-600 mb-4">
              These terms are governed by the laws of Australia. Any disputes shall be resolved in 
              the courts of Australia.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact</h2>
            <p className="text-slate-600 mb-4">
              For questions about these terms, contact us at:
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

export default Terms;
