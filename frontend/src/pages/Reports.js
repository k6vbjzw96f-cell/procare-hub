import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Users } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Reports</h1>
        <p className="text-slate-600">Analytics and insights for your NDIS operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-manrope">
              <BarChart3 className="w-5 h-5 text-primary" />
              Service Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Service utilization chart</p>
                <p className="text-xs">Chart visualization will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-manrope">
              <DollarSign className="w-5 h-5 text-primary" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Revenue trends chart</p>
                <p className="text-xs">Chart visualization will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-manrope">
              <Users className="w-5 h-5 text-primary" />
              Client Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Client growth chart</p>
                <p className="text-xs">Chart visualization will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-manrope">
              <BarChart3 className="w-5 h-5 text-primary" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Compliance status overview</p>
                <p className="text-xs">Chart visualization will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-manrope">Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" data-testid="export-financial-report">
              <div>
                <p className="font-medium text-slate-700">Financial Report</p>
                <p className="text-sm text-slate-500">Export complete financial data</p>
              </div>
              <DollarSign className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" data-testid="export-client-report">
              <div>
                <p className="font-medium text-slate-700">Client Report</p>
                <p className="text-sm text-slate-500">Export client and service data</p>
              </div>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" data-testid="export-compliance-report">
              <div>
                <p className="font-medium text-slate-700">Compliance Report</p>
                <p className="text-sm text-slate-500">Export compliance and audit data</p>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;