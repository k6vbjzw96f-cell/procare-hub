import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, Bell, FileText, Lightbulb, HelpCircle, Users,
  Calendar, Clock, MapPin, Video, Plus, Search, ArrowLeft,
  Eye, MessageCircle, Pin, Send, Trash2, ExternalLink, CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const iconMap = {
  Bell: Bell,
  MessageSquare: MessageSquare,
  FileText: FileText,
  Lightbulb: Lightbulb,
  HelpCircle: HelpCircle,
};

const colorMap = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  primary: 'bg-primary/10 text-primary border-primary/20',
};

const eventTypeColors = {
  webinar: 'bg-blue-100 text-blue-700',
  meetup: 'bg-emerald-100 text-emerald-700',
  training: 'bg-purple-100 text-purple-700',
  workshop: 'bg-amber-100 text-amber-700',
};

const Community = () => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('forum');
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [newPost, setNewPost] = useState({ title: '', content: '', category_id: '', is_announcement: false });
  const [newEvent, setNewEvent] = useState({ 
    title: '', description: '', event_type: 'webinar', date: '', time: '', 
    duration_minutes: 60, location: '', meeting_link: '', max_attendees: null 
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'coordinator';

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchCategories();
    fetchPosts();
    fetchEvents();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/forum/categories`, getAuthHeader());
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const fetchPosts = async (categoryId = null, search = '') => {
    try {
      let url = `${API}/forum/posts`;
      const params = new URLSearchParams();
      if (categoryId) params.append('category_id', categoryId);
      if (search) params.append('search', search);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, getAuthHeader());
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to load posts');
    }
    setLoading(false);
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/community/events`, getAuthHeader());
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load events');
    }
  };

  const fetchPost = async (postId) => {
    try {
      const response = await axios.get(`${API}/forum/posts/${postId}`, getAuthHeader());
      setSelectedPost(response.data);
    } catch (error) {
      toast.error('Failed to load post');
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedPost(null);
    fetchPosts(category?.id);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPosts(selectedCategory?.id, searchQuery);
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content || !newPost.category_id) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await axios.post(`${API}/forum/posts`, newPost, getAuthHeader());
      toast.success('Post created successfully');
      setShowNewPostDialog(false);
      setNewPost({ title: '', content: '', category_id: '', is_announcement: false });
      fetchPosts(selectedCategory?.id);
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  const handleCreateReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await axios.post(`${API}/forum/posts/${selectedPost.id}/replies`, { content: replyContent }, getAuthHeader());
      toast.success('Reply posted');
      setReplyContent('');
      fetchPost(selectedPost.id);
    } catch (error) {
      toast.error('Failed to post reply');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${API}/forum/posts/${postId}`, getAuthHeader());
      toast.success('Post deleted');
      setSelectedPost(null);
      fetchPosts(selectedCategory?.id);
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await axios.post(`${API}/community/events`, newEvent, getAuthHeader());
      toast.success('Event created successfully');
      setShowNewEventDialog(false);
      setNewEvent({ title: '', description: '', event_type: 'webinar', date: '', time: '', duration_minutes: 60, location: '', meeting_link: '', max_attendees: null });
      fetchEvents();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const handleEventRegistration = async (eventId, isRegistered) => {
    try {
      if (isRegistered) {
        await axios.post(`${API}/community/events/${eventId}/unregister`, {}, getAuthHeader());
        toast.success('Unregistered from event');
      } else {
        await axios.post(`${API}/community/events/${eventId}/register`, {}, getAuthHeader());
        toast.success('Registered for event');
      }
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update registration');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`} data-testid="community-page">
      <div className="flex justify-between items-start">
        <div className={`transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Community Hub</h1>
          <p className="text-slate-600">Connect, share, and learn with the ProCare community</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="forum" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Forum
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Events
          </TabsTrigger>
        </TabsList>

        {/* Forum Tab */}
        <TabsContent value="forum" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-slate-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      !selectedCategory ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">All Discussions</span>
                    </div>
                  </button>
                  {categories.map((cat) => {
                    const IconComponent = iconMap[cat.icon] || MessageSquare;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory?.id === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{cat.post_count || 0}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Button onClick={() => setShowNewPostDialog(true)} className="w-full btn-animated" data-testid="new-post-btn">
                <Plus className="w-4 h-4 mr-2" /> New Discussion
              </Button>
            </div>

            {/* Posts List / Post Detail */}
            <div className="lg:col-span-3">
              {selectedPost ? (
                // Post Detail View
                <Card className="border-slate-100">
                  <CardHeader>
                    <Button variant="ghost" onClick={() => setSelectedPost(null)} className="w-fit -ml-2 mb-2">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back to discussions
                    </Button>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {selectedPost.is_pinned && <Pin className="w-4 h-4 text-amber-500" />}
                          {selectedPost.is_announcement && <Badge className="bg-amber-100 text-amber-700">Announcement</Badge>}
                        </div>
                        <CardTitle className="text-2xl">{selectedPost.title}</CardTitle>
                        <CardDescription className="mt-2">
                          Posted by <span className="font-medium text-slate-700">{selectedPost.author_name}</span>
                          {selectedPost.author_role && <Badge variant="outline" className="ml-2 text-xs">{selectedPost.author_role}</Badge>}
                          <span className="mx-2">•</span>
                          {formatTimeAgo(selectedPost.created_at)}
                          <span className="mx-2">•</span>
                          <Eye className="w-3 h-3 inline" /> {selectedPost.views} views
                        </CardDescription>
                      </div>
                      {(selectedPost.author_id === currentUser.id || currentUser.role === 'admin') && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePost(selectedPost.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose prose-slate max-w-none">
                      <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Replies ({selectedPost.replies?.length || 0})</h3>
                      
                      {selectedPost.replies?.map((reply) => (
                        <div key={reply.id} className="flex gap-3 mb-4 p-4 rounded-lg bg-slate-50">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">{reply.author_name?.charAt(0)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{reply.author_name}</span>
                              {reply.author_role && <Badge variant="outline" className="text-xs">{reply.author_role}</Badge>}
                              <span className="text-xs text-slate-400">{formatTimeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-slate-600 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-3 mt-4">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="flex-1"
                          data-testid="reply-input"
                        />
                        <Button onClick={handleCreateReply} className="self-end btn-animated" data-testid="send-reply-btn">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Posts List View
                <>
                  <div className="flex gap-4 mb-4">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Search discussions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="search-input"
                        />
                      </div>
                      <Button type="submit" variant="outline">Search</Button>
                    </form>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : posts.length === 0 ? (
                    <Card className="border-slate-100 text-center py-12">
                      <CardContent>
                        <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">No discussions yet. Start the first one!</p>
                        <Button onClick={() => setShowNewPostDialog(true)} className="mt-4">
                          <Plus className="w-4 h-4 mr-2" /> Start Discussion
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {posts.map((post) => (
                        <Card 
                          key={post.id} 
                          className="border-slate-100 hover:border-primary/30 transition-colors cursor-pointer card-animated"
                          onClick={() => fetchPost(post.id)}
                          data-testid={`post-${post.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-primary">{post.author_name?.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {post.is_pinned && <Pin className="w-4 h-4 text-amber-500" />}
                                  {post.is_announcement && <Badge className="bg-amber-100 text-amber-700 text-xs">Announcement</Badge>}
                                  <h3 className="font-semibold text-slate-900 truncate">{post.title}</h3>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2">{post.content}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                  <span>{post.author_name}</span>
                                  <span>{formatTimeAgo(post.created_at)}</span>
                                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>
                                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.reply_count}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Upcoming Events</h2>
              <p className="text-sm text-slate-500">Webinars, meetups, and training sessions</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowNewEventDialog(true)} className="btn-animated" data-testid="new-event-btn">
                <Plus className="w-4 h-4 mr-2" /> Create Event
              </Button>
            )}
          </div>

          {events.length === 0 ? (
            <Card className="border-slate-100 text-center py-12">
              <CardContent>
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No upcoming events</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="border-slate-100 hover:shadow-md transition-shadow card-animated" data-testid={`event-${event.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={eventTypeColors[event.event_type] || 'bg-slate-100'}>
                        {event.event_type}
                      </Badge>
                      {event.is_registered && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1" /> Registered
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{event.time} ({event.duration_minutes} min)</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.meeting_link && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Video className="w-4 h-4 text-slate-400" />
                        <span>Virtual Event</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{event.attendee_count} attendees{event.max_attendees ? ` / ${event.max_attendees} max` : ''}</span>
                    </div>

                    <div className="pt-3 flex gap-2">
                      <Button
                        onClick={() => handleEventRegistration(event.id, event.is_registered)}
                        variant={event.is_registered ? 'outline' : 'default'}
                        className="flex-1 btn-animated"
                        data-testid={`event-register-${event.id}`}
                      >
                        {event.is_registered ? 'Unregister' : 'Register'}
                      </Button>
                      {event.meeting_link && event.is_registered && (
                        <Button variant="outline" onClick={() => window.open(event.meeting_link, '_blank')}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Post Dialog */}
      <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a New Discussion</DialogTitle>
            <DialogDescription>Share your thoughts with the community</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category *</Label>
              <Select value={newPost.category_id} onValueChange={(v) => setNewPost({ ...newPost, category_id: v })}>
                <SelectTrigger data-testid="post-category-select">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="What's on your mind?"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                data-testid="post-title-input"
              />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                placeholder="Share details..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                rows={6}
                data-testid="post-content-input"
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_announcement"
                  checked={newPost.is_announcement}
                  onChange={(e) => setNewPost({ ...newPost, is_announcement: e.target.checked })}
                />
                <Label htmlFor="is_announcement" className="text-sm">Post as announcement</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPostDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePost} className="btn-animated" data-testid="submit-post-btn">Post Discussion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Schedule a community event</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Event Type *</Label>
              <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                <SelectTrigger data-testid="event-type-select">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                data-testid="event-title-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Event description..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
                data-testid="event-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  data-testid="event-date-input"
                />
              </div>
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  data-testid="event-time-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newEvent.duration_minutes}
                  onChange={(e) => setNewEvent({ ...newEvent, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Attendees</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={newEvent.max_attendees || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, max_attendees: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
            </div>
            <div>
              <Label>Location (for in-person)</Label>
              <Input
                placeholder="Address or venue name"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Meeting Link (for virtual)</Label>
              <Input
                placeholder="https://..."
                value={newEvent.meeting_link}
                onChange={(e) => setNewEvent({ ...newEvent, meeting_link: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEventDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} className="btn-animated" data-testid="submit-event-btn">Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;
