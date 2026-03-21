import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Check, 
  ArrowRight, 
  Users, 
  Calendar, 
  FileText, 
  Shield, 
  BarChart3, 
  Clock,
  Building2,
  Smartphone,
  MessageCircle,
  X,
  Send,
  ChevronRight,
  Star,
  Play,
  Zap,
  HeadphonesIcon,
  Globe
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { from: 'support', text: 'Hi! 👋 Welcome to ProCare Hub. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [demoForm, setDemoForm] = useState({ name: '', email: '', company: '', phone: '', message: '' });

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [...prev, { from: 'user', text: chatInput }]);
    setChatInput('');
    
    // Simulate support response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        from: 'support', 
        text: "Thanks for your message! Our team typically responds within 2 hours during business hours. You can also email us at support@procarehub.com.au or request a demo for a personalized walkthrough." 
      }]);
    }, 1000);
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    toast.success('Demo request submitted! We\'ll contact you within 24 hours.');
    setShowDemoModal(false);
    setDemoForm({ name: '', email: '', company: '', phone: '', message: '' });
  };

  const pricingPlans = [
    {
      name: 'Starter',
      price: 25,
      description: 'Perfect for small providers just getting started',
      features: [
        'Up to 10 clients',
        'Up to 5 staff members',
        'Basic rostering',
        'Client management',
        'Mobile app access',
        'Email support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Growth',
      price: 45,
      description: 'For growing providers with expanding teams',
      features: [
        'Up to 50 clients',
        'Up to 20 staff members',
        'Advanced rostering',
        'Invoicing & payments',
        'Compliance tracking',
        'Goal tracking',
        'Priority email support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Pro',
      price: 99,
      description: 'Full-featured solution for established providers',
      features: [
        'Up to 200 clients',
        'Up to 100 staff members',
        'All Growth features',
        'HR module',
        'Document signing',
        'Custom reports',
        'API access',
        'Phone & chat support'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Organisation',
      price: 160,
      description: 'Enterprise solution for large organisations',
      features: [
        'Unlimited clients',
        'Unlimited staff',
        'All Pro features',
        'Multi-location support',
        'SSO authentication',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        '24/7 priority support'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const features = [
    { icon: Users, title: 'Client Management', description: 'Comprehensive participant profiles with NDIS plan tracking and support needs documentation.' },
    { icon: Calendar, title: 'Smart Rostering', description: 'Intelligent shift scheduling with availability matching and conflict detection.' },
    { icon: FileText, title: 'Invoicing & Billing', description: 'NDIS-compliant invoicing with automatic line item generation and payment tracking.' },
    { icon: Shield, title: 'Compliance Tracking', description: 'Stay audit-ready with incident reporting, certifications, and compliance calendars.' },
    { icon: BarChart3, title: 'Reports & Analytics', description: 'Actionable insights with customizable reports for NDIS audits and business decisions.' },
    { icon: Clock, title: 'Time & Attendance', description: 'Digital clock-in/out with GPS verification and automated timesheet generation.' }
  ];

  const testimonials = [
    { name: 'Sarah Mitchell', role: 'Operations Manager', company: 'Inclusive Care Services', text: 'ProCare Hub transformed how we manage our 150+ participants. The compliance features alone saved us countless hours.' },
    { name: 'James Chen', role: 'Director', company: 'Community Support Network', text: 'Finally, a platform built specifically for NDIS providers. The rostering system is intuitive and our staff love the mobile app.' },
    { name: 'Emma Thompson', role: 'CEO', company: 'Ability First Australia', text: 'We reduced our admin time by 40% after switching to ProCare Hub. The ROI was immediate.' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/procare-logo.jpeg" alt="ProCare Hub" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-primary">ProCare Hub</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-primary transition-colors">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-primary transition-colors">Testimonials</a>
              <Button variant="ghost" onClick={() => setShowDemoModal(true)}>Request Demo</Button>
              <Button onClick={() => navigate('/login')}>Sign In</Button>
            </div>
            <div className="md:hidden">
              <Button onClick={() => navigate('/login')}>Sign In</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 bg-gradient-to-br from-primary-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <Zap className="w-3 h-3 mr-1" />
              14-Day Free Trial • No Credit Card Required
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6">
              The Complete Platform for{' '}
              <span className="text-primary">NDIS Providers</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Streamline your operations, ensure compliance, and deliver exceptional support to participants — all in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate('/login')}>
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => setShowDemoModal(true)}>
                <Play className="w-4 h-4 mr-2" />
                Request Demo
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Trusted by 500+ NDIS providers across Australia
            </p>
          </div>

          {/* Hero Image/Screenshot */}
          <div className="mt-12 relative">
            <div className="bg-gradient-to-t from-white via-transparent to-transparent absolute inset-x-0 bottom-0 h-32 z-10" />
            <div className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden mx-auto max-w-5xl border-8 border-slate-800">
              <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-400 text-sm ml-2">ProCare Hub Dashboard</span>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-emerald-50 p-8 text-center">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Active Clients', value: '156' },
                    { label: 'Staff Members', value: '48' },
                    { label: 'Shifts Today', value: '23' },
                    { label: 'Compliance', value: '98%' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="text-xs text-slate-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-slate-400 text-sm">Interactive dashboard preview</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Purpose-built for NDIS providers, with features that actually make your life easier.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Features Row */}
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Smartphone, text: 'Mobile App (iOS & Android)' },
              { icon: Building2, text: 'Multi-Location Support' },
              { icon: Globe, text: 'SSO Integration' },
              { icon: HeadphonesIcon, text: '24/7 Australian Support' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">
              Simple, Transparent Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Choose the Perfect Plan for Your Organisation
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-slate-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white shadow-lg">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => plan.cta === 'Contact Sales' ? setShowDemoModal(true) : navigate('/login')}
                  >
                    {plan.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="text-center mt-8 text-slate-500">
            All prices in AUD. GST not included. Annual billing available with 2 months free.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Loved by NDIS Providers
            </h2>
            <p className="text-lg text-slate-600">
              See what our customers have to say
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{testimonial.name}</div>
                      <div className="text-sm text-slate-500">{testimonial.role}, {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your NDIS Operations?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join 500+ providers who trust ProCare Hub to manage their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="h-12 px-8" onClick={() => navigate('/login')}>
              Start Your Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 bg-transparent text-white border-white hover:bg-white/10" onClick={() => setShowDemoModal(true)}>
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/procare-logo.jpeg" alt="ProCare Hub" className="w-8 h-8 rounded" />
                <span className="text-white font-bold">ProCare Hub</span>
              </div>
              <p className="text-sm">
                The complete NDIS provider management platform built for Australian disability service providers.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">NDIS Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 ProCare Hub. All rights reserved.</p>
            <p className="text-sm">Made with ❤️ in Australia</p>
          </div>
        </div>
      </footer>

      {/* Support Chat Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        {showChat ? (
          <Card className="w-80 sm:w-96 shadow-2xl border-slate-200 animate-in slide-in-from-bottom-4">
            <CardHeader className="bg-primary text-white rounded-t-lg py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold">Support Chat</span>
                </div>
                <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.from === 'user' 
                        ? 'bg-primary text-white' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-3 flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSendChat}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button 
            size="lg" 
            className="rounded-xl w-16 h-16 shadow-xl hover:shadow-2xl transition-all duration-200"
            onClick={() => setShowChat(true)}
            aria-label="Open support chat"
          >
            <MessageCircle className="w-7 h-7" />
          </Button>
        )}
      </div>

      {/* Demo Request Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Demo</DialogTitle>
            <DialogDescription>
              Fill out the form below and our team will contact you within 24 hours to schedule a personalized demo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-name">Name *</Label>
                <Input 
                  id="demo-name" 
                  required
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({...demoForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-email">Email *</Label>
                <Input 
                  id="demo-email" 
                  type="email" 
                  required
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({...demoForm, email: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-company">Organisation *</Label>
                <Input 
                  id="demo-company" 
                  required
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({...demoForm, company: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-phone">Phone</Label>
                <Input 
                  id="demo-phone" 
                  type="tel"
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm({...demoForm, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-message">Tell us about your needs</Label>
              <Textarea 
                id="demo-message" 
                rows={3}
                placeholder="How many clients do you support? What challenges are you facing?"
                value={demoForm.message}
                onChange={(e) => setDemoForm({...demoForm, message: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full">
              Submit Request
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
