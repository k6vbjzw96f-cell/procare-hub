import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, ClipboardList, Star, BarChart3, Users, Send, Eye, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Feedback = () => {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isViewResponsesOpen, setIsViewResponsesOpen] = useState(false);
  const [responseAnswers, setResponseAnswers] = useState({});
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_audience: 'all',
    questions: [{ question: '', type: 'text' }],
  });

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const response = await axios.get(`${API}/surveys`, getAuthHeader());
      setSurveys(response.data);
    } catch (error) {
      toast.error('Failed to load surveys');
    }
    setLoading(false);
  };

  const fetchSurveyResponses = async (surveyId) => {
    try {
      const response = await axios.get(`${API}/surveys/${surveyId}/responses`, getAuthHeader());
      setSurveyResponses(response.data);
    } catch (error) {
      toast.error('Failed to load responses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/surveys`, formData, getAuthHeader());
      toast.success('Survey created successfully');
      fetchSurveys();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create survey');
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    const answers = selectedSurvey.questions.map((q, idx) => ({
      question: q.question,
      answer: responseAnswers[idx] || '',
    }));

    try {
      await axios.post(
        `${API}/surveys/${selectedSurvey.id}/respond`,
        answers,
        getAuthHeader()
      );
      toast.success('Thank you for your feedback!');
      fetchSurveys();
      setIsResponseDialogOpen(false);
      setSelectedSurvey(null);
      setResponseAnswers({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit response');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_audience: 'all',
      questions: [{ question: '', type: 'text' }],
    });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { question: '', type: 'text' }],
    });
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...formData.questions];
    updated[index][field] = value;
    setFormData({ ...formData, questions: updated });
  };

  const removeQuestion = (index) => {
    if (formData.questions.length === 1) return;
    const updated = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updated });
  };

  const getAudienceLabel = (audience) => {
    const labels = {
      'clients': 'Clients',
      'staff': 'Staff',
      'all': 'Everyone',
    };
    return labels[audience] || audience;
  };

  const activeSurveys = surveys.filter(s => s.status === 'active');
  const closedSurveys = surveys.filter(s => s.status === 'closed');

  return (
    <div className="space-y-6" data-testid="feedback-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Feedback & Surveys</h1>
          <p className="text-slate-600">Collect and analyze feedback from clients and staff</p>
        </div>
        {(user.role === 'admin' || user.role === 'coordinator') && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-survey-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Create New Survey</DialogTitle>
                <DialogDescription>Design a survey to collect feedback</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Survey Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Service Satisfaction Survey"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the purpose of this survey..."
                    rows={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience *</Label>
                  <Select
                    value={formData.target_audience}
                    onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clients Only</SelectItem>
                      <SelectItem value="staff">Staff Only</SelectItem>
                      <SelectItem value="all">Everyone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Questions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                  {formData.questions.map((q, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Question {idx + 1}</span>
                        {formData.questions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                        placeholder="Enter your question..."
                        required
                      />
                      <Select
                        value={q.type}
                        onValueChange={(value) => updateQuestion(idx, 'type', value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Response</SelectItem>
                          <SelectItem value="rating">Rating (1-5)</SelectItem>
                          <SelectItem value="yes_no">Yes/No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Survey</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Active Surveys</p>
                <p className="text-3xl font-bold text-blue-700">{activeSurveys.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Responses</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {surveys.reduce((acc, s) => acc + (s.response_count || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Avg. Response Rate</p>
                <p className="text-3xl font-bold text-amber-700">--</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Closed Surveys</p>
                <p className="text-3xl font-bold text-purple-700">{closedSurveys.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surveys Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({activeSurveys.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedSurveys.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">Active Surveys</h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading surveys...</div>
              ) : activeSurveys.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No active surveys</p>
                  <p className="text-sm">Create a survey to start collecting feedback.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSurveys.map((survey) => (
                    <div
                      key={survey.id}
                      className="p-5 border border-slate-100 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{survey.title}</h3>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{survey.description}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {getAudienceLabel(survey.target_audience)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {survey.response_count || 0} responses
                        </div>
                        <div className="flex items-center gap-1">
                          <ClipboardList className="w-4 h-4" />
                          {survey.questions?.length || 0} questions
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSurvey(survey);
                            setResponseAnswers({});
                            setIsResponseDialogOpen(true);
                          }}
                          data-testid={`respond-${survey.id}`}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Take Survey
                        </Button>
                        {(user.role === 'admin' || user.role === 'coordinator') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSurvey(survey);
                              fetchSurveyResponses(survey.id);
                              setIsViewResponsesOpen(true);
                            }}
                            data-testid={`view-responses-${survey.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Responses
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">Closed Surveys</h2>
              </div>
            </CardHeader>
            <CardContent>
              {closedSurveys.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No closed surveys</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Survey</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedSurveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">{survey.title}</TableCell>
                        <TableCell>{getAudienceLabel(survey.target_audience)}</TableCell>
                        <TableCell>{survey.questions?.length || 0}</TableCell>
                        <TableCell>{survey.response_count || 0}</TableCell>
                        <TableCell>{survey.created_by}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSurvey(survey);
                              fetchSurveyResponses(survey.id);
                              setIsViewResponsesOpen(true);
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
      </Tabs>

      {/* Take Survey Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{selectedSurvey?.title}</DialogTitle>
            <DialogDescription>{selectedSurvey?.description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitResponse} className="space-y-6">
            {selectedSurvey?.questions?.map((q, idx) => (
              <div key={idx} className="space-y-3">
                <Label className="text-base font-medium">
                  {idx + 1}. {q.question}
                </Label>
                {q.type === 'text' && (
                  <Textarea
                    value={responseAnswers[idx] || ''}
                    onChange={(e) => setResponseAnswers({ ...responseAnswers, [idx]: e.target.value })}
                    placeholder="Enter your response..."
                    rows={3}
                    required
                  />
                )}
                {q.type === 'rating' && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        type="button"
                        variant={responseAnswers[idx] === rating.toString() ? 'default' : 'outline'}
                        className="w-12 h-12"
                        onClick={() => setResponseAnswers({ ...responseAnswers, [idx]: rating.toString() })}
                      >
                        <Star className={`w-5 h-5 ${responseAnswers[idx] >= rating.toString() ? 'fill-current' : ''}`} />
                      </Button>
                    ))}
                  </div>
                )}
                {q.type === 'yes_no' && (
                  <RadioGroup
                    value={responseAnswers[idx] || ''}
                    onValueChange={(value) => setResponseAnswers({ ...responseAnswers, [idx]: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`yes-${idx}`} />
                      <Label htmlFor={`yes-${idx}`}>Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`no-${idx}`} />
                      <Label htmlFor={`no-${idx}`}>No</Label>
                    </div>
                  </RadioGroup>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Responses Dialog */}
      <Dialog open={isViewResponsesOpen} onOpenChange={setIsViewResponsesOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Responses: {selectedSurvey?.title}</DialogTitle>
            <DialogDescription>
              {surveyResponses.length} response{surveyResponses.length !== 1 ? 's' : ''} received
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {surveyResponses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>No responses yet</p>
              </div>
            ) : (
              surveyResponses.map((response, idx) => (
                <div key={response.id} className="p-4 border border-slate-100 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">{response.respondent_name}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(response.completed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {response.answers?.map((ans, ansIdx) => (
                      <div key={ansIdx} className="text-sm">
                        <p className="text-slate-600 font-medium">{ans.question}</p>
                        <p className="text-slate-900 mt-1 pl-3 border-l-2 border-primary-200">{ans.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feedback;
