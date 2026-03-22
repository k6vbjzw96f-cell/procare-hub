import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, FileText, Video, Link as LinkIcon, HelpCircle, Download, 
  Eye, Star, BookOpen, ExternalLink, Edit, Trash2, Filter, FolderOpen
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const CATEGORIES = [
  { value: 'guides', label: 'Guides & How-To', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
  { value: 'fact-sheets', label: 'Fact Sheets', icon: FileText, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'videos', label: 'Videos', icon: Video, color: 'bg-purple-100 text-purple-700' },
  { value: 'faqs', label: 'FAQs', icon: HelpCircle, color: 'bg-amber-100 text-amber-700' },
  { value: 'forms', label: 'Forms & Templates', icon: Download, color: 'bg-pink-100 text-pink-700' },
  { value: 'external-links', label: 'Useful Links', icon: LinkIcon, color: 'bg-cyan-100 text-cyan-700' },
];

const CONTENT_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'video', label: 'Video' },
  { value: 'link', label: 'External Link' },
  { value: 'faq', label: 'FAQ' },
];

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [userRole, setUserRole] = useState('support_worker');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'guides',
    content_type: 'article',
    content: '',
    url: '',
    file_url: '',
    thumbnail_url: '',
    tags: [],
    is_featured: false,
  });

  useEffect(() => {
    fetchData();
    // Get user role from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role || 'support_worker');
  }, []);

  const fetchData = async () => {
    try {
      const [resourcesRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/resources`, getAuthHeader()),
        axios.get(`${API}/resources/categories/list`, getAuthHeader()),
      ]);
      setResources(resourcesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to load resources');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selectedResource) {
        await axios.put(`${API}/resources/${selectedResource.id}`, formData, getAuthHeader());
        toast.success('Resource updated');
      } else {
        // Convert tags string to array
        const submitData = {
          ...formData,
          tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : formData.tags
        };
        await axios.post(`${API}/resources`, submitData, getAuthHeader());
        toast.success('Resource created');
      }
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save resource');
    }
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await axios.delete(`${API}/resources/${resourceId}`, getAuthHeader());
      toast.success('Resource deleted');
      fetchData();
      setShowViewModal(false);
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'guides',
      content_type: 'article',
      content: '',
      url: '',
      file_url: '',
      thumbnail_url: '',
      tags: [],
      is_featured: false,
    });
    setEditMode(false);
  };

  const openEditModal = (resource) => {
    setFormData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      content_type: resource.content_type,
      content: resource.content || '',
      url: resource.url || '',
      file_url: resource.file_url || '',
      thumbnail_url: resource.thumbnail_url || '',
      tags: resource.tags || [],
      is_featured: resource.is_featured,
    });
    setSelectedResource(resource);
    setEditMode(true);
    setShowCreateModal(true);
  };

  const viewResource = async (resource) => {
    try {
      const response = await axios.get(`${API}/resources/${resource.id}`, getAuthHeader());
      setSelectedResource(response.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to load resource');
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[0];
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredResources = resources.filter(r => r.is_featured);
  const canEdit = ['admin', 'coordinator'].includes(userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="resources-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Resource Library</h1>
          <p className="text-slate-500 mt-1">NDIS guides, fact sheets, videos, and helpful resources</p>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Featured Resources */}
      {featuredResources.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Featured Resources
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredResources.slice(0, 3).map((resource) => {
              const catInfo = getCategoryInfo(resource.category);
              const CatIcon = catInfo.icon;
              return (
                <Card key={resource.id} className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => viewResource(resource)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${catInfo.color}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </div>
                    <CardTitle className="text-lg mt-2">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-2">{resource.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            All ({resources.length})
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={activeCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.value)}
              className={activeCategory === cat.value ? '' : cat.color.replace('text-', 'hover:text-')}
            >
              <cat.icon className="w-4 h-4 mr-1" />
              {cat.label} ({categories[cat.value] || 0})
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full lg:w-[300px]"
          />
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">No resources found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your search or filters</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map((resource) => {
            const catInfo = getCategoryInfo(resource.category);
            const CatIcon = catInfo.icon;
            return (
              <Card key={resource.id} className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30" onClick={() => viewResource(resource)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${catInfo.color}`}>
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Eye className="w-3 h-3" />
                      {resource.view_count || 0}
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-2">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-slate-600 line-clamp-2">{resource.description}</p>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="flex flex-wrap gap-1">
                    {resource.tags?.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Resource Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Update the resource details' : 'Share helpful information with your team'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Resource title" required />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of this resource" rows={2} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content Type *</Label>
                <Select value={formData.content_type} onValueChange={(v) => setFormData({ ...formData, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.content_type === 'article' || formData.content_type === 'faq') && (
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Article content or FAQ answer" rows={6} required />
              </div>
            )}

            {(formData.content_type === 'video' || formData.content_type === 'link') && (
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." required />
              </div>
            )}

            {formData.content_type === 'pdf' && (
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} placeholder="URL to PDF file" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input 
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags} 
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })} 
                placeholder="e.g., NDIS, funding, supports" 
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded border-slate-300"
              />
              <Label htmlFor="featured" className="text-sm font-normal">Mark as featured resource</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit">{editMode ? 'Update' : 'Create'} Resource</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Resource Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedResource && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const catInfo = getCategoryInfo(selectedResource.category);
                      const CatIcon = catInfo.icon;
                      return (
                        <div className={`p-2 rounded-lg ${catInfo.color}`}>
                          <CatIcon className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <DialogTitle className="text-xl">{selectedResource.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{getCategoryInfo(selectedResource.category).label}</Badge>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {selectedResource.view_count} views
                        </span>
                      </DialogDescription>
                    </div>
                  </div>
                  {selectedResource.is_featured && (
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <p className="text-slate-600">{selectedResource.description}</p>

                {/* Content based on type */}
                {selectedResource.content && (
                  <div className="prose prose-sm max-w-none p-4 bg-slate-50 rounded-lg">
                    <div className="whitespace-pre-wrap">{selectedResource.content}</div>
                  </div>
                )}

                {selectedResource.url && (
                  <a 
                    href={selectedResource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-medium">Open Resource</span>
                    <span className="text-sm text-blue-500 truncate flex-1">{selectedResource.url}</span>
                  </a>
                )}

                {selectedResource.file_url && (
                  <a 
                    href={selectedResource.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-medium">Download File</span>
                  </a>
                )}

                {/* Tags */}
                {selectedResource.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedResource.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    {canEdit && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { openEditModal(selectedResource); setShowViewModal(false); }}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => handleDelete(selectedResource.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Resources;
