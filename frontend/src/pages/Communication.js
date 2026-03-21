import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, MessageSquare, Send, Mail, MailOpen, RefreshCw, Search, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Communication = () => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    message_text: '',
  });

  useEffect(() => {
    fetchMessages();
    fetchUsers();
    
    // Real-time polling every 5 seconds
    pollingRef.current = setInterval(fetchMessages, 5000);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages/inbox`, getAuthHeader());
      setMessages(response.data);
      organizeConversations(response.data);
    } catch (error) {
      // Silently fail for polling
      if (loading) toast.error('Failed to load messages');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/list`, getAuthHeader());
      setUsersList(response.data);
    } catch (error) {
      toast.error('Failed to load users list');
    }
  };

  const organizeConversations = (msgs) => {
    const convMap = new Map();
    
    msgs.forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const partnerName = msg.sender_id === user.id ? msg.recipient_name : msg.sender_name;
      
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partnerId,
          partnerName,
          messages: [],
          unreadCount: 0,
          lastMessage: null,
        });
      }
      
      const conv = convMap.get(partnerId);
      conv.messages.push(msg);
      if (!msg.is_read && msg.sender_id !== user.id) {
        conv.unreadCount++;
      }
      if (!conv.lastMessage || new Date(msg.created_at) > new Date(conv.lastMessage.created_at)) {
        conv.lastMessage = msg;
      }
    });

    // Sort by last message time
    const sortedConvs = Array.from(convMap.values()).sort((a, b) => {
      return new Date(b.lastMessage?.created_at) - new Date(a.lastMessage?.created_at);
    });

    setConversations(sortedConvs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/messages`, formData, getAuthHeader());
      toast.success('Message sent');
      fetchMessages();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConversation) return;

    try {
      await axios.post(`${API}/messages`, {
        recipient_id: selectedConversation.partnerId,
        subject: `Re: ${selectedConversation.lastMessage?.subject || 'Chat'}`,
        message_text: replyText,
      }, getAuthHeader());
      
      setReplyText('');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleMarkRead = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/read`, {}, getAuthHeader());
      fetchMessages();
    } catch (error) {
      // Silently fail
    }
  };

  const resetForm = () => {
    setFormData({
      recipient_id: '',
      subject: '',
      message_text: '',
    });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6" data-testid="communication-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Communication Hub</h1>
          <p className="text-slate-600">Real-time messaging between team members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-message-button">
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
              <DialogDescription>Start a conversation with a team member</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_id">To *</Label>
                <Select
                  value={formData.recipient_id}
                  onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Message subject"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message_text">Message *</Label>
                <Textarea
                  id="message_text"
                  value={formData.message_text}
                  onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                  placeholder="Type your message..."
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)]">
        {/* Conversations List */}
        <div className="col-span-4">
          <Card className="border-slate-100 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Conversations</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchMessages}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative mt-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 px-4">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Start a new message to begin</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.partnerId}
                        className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                          selectedConversation?.partnerId === conv.partnerId ? 'bg-primary-50 border-l-4 border-primary' : ''
                        }`}
                        onClick={() => {
                          setSelectedConversation(conv);
                          // Mark unread messages as read
                          conv.messages.forEach(msg => {
                            if (!msg.is_read && msg.sender_id !== user.id) {
                              handleMarkRead(msg.id);
                            }
                          });
                        }}
                        data-testid={`conversation-${conv.partnerId}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary-100 text-primary font-medium">
                              {getInitials(conv.partnerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-900 truncate">{conv.partnerName}</span>
                              <span className="text-xs text-slate-500">{formatTime(conv.lastMessage?.created_at)}</span>
                            </div>
                            <p className="text-sm text-slate-600 truncate mt-1">{conv.lastMessage?.message_text}</p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Messages Area */}
        <div className="col-span-8">
          <Card className="border-slate-100 shadow-sm h-full flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary-100 text-primary font-medium">
                        {getInitials(selectedConversation.partnerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.partnerName}</h3>
                      <p className="text-sm text-slate-500">
                        {selectedConversation.messages.length} messages
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {selectedConversation.messages
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .map((msg) => {
                          const isOwn = msg.sender_id === user.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                                  isOwn
                                    ? 'bg-primary text-white rounded-br-md'
                                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
                                }`}
                              >
                                {msg.subject && (
                                  <p className={`text-xs font-medium mb-1 ${isOwn ? 'text-primary-100' : 'text-slate-500'}`}>
                                    {msg.subject}
                                  </p>
                                )}
                                <p className="text-sm">{msg.message_text}</p>
                                <p className={`text-xs mt-2 ${isOwn ? 'text-primary-200' : 'text-slate-400'}`}>
                                  {new Date(msg.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                <div className="p-4 border-t border-slate-100">
                  <form onSubmit={handleReply} className="flex gap-3">
                    <Input
                      placeholder="Type a message..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1"
                      data-testid="reply-input"
                    />
                    <Button type="submit" disabled={!replyText.trim()} data-testid="send-reply">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Communication;
