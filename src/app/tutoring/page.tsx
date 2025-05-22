'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { answerQuestion } from '@/ai/flows/answer-question';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Bot, Save, LogIn, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  topic?: string;
  timestamp?: Timestamp;
}

interface UserTopic {
  topic: string;
  lastUpdated: Timestamp;
  chatId: string;
}

export default function AITutoringPage() {
  const [topic, setTopic] = useState<string>('General Knowledge');
  const [question, setQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatLoadedForTopic, setChatLoadedForTopic] = useState<string | null>(null);
  const [userTopics, setUserTopics] = useState<UserTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicToDelete, setTopicToDelete] = useState<UserTopic | null>(null);

  const { toast } = useToast();
  const { user, signInWithGoogle } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Load user's topics when user logs in
useEffect(() => {
    async function loadUserTopics() {
        if (user) {
            setLoadingTopics(true);
            try {
                const chatsRef = collection(db, 'chats');
                const q = query(
                    chatsRef,
                    where('userId', '==', user.uid),
                    orderBy('updatedAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const topics = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        topic: typeof data.topic === 'string' ? data.topic : '',
                        lastUpdated: data.updatedAt ?? data.createdAt ?? Timestamp.now(),
                        chatId: doc.id
                    };
                });
                setUserTopics(topics);
            } catch (error) {
                console.error('Error loading user topics:', error);
                toast({ title: 'Error loading your topics', variant: 'destructive' });
            } finally {
                setLoadingTopics(false);
            }
        } else {
            setUserTopics([]);
            setSelectedTopics([]);
        }
    }
    loadUserTopics();
}, [user, toast]);

  // Effect to load existing chat for the current topic if user logs in or topic changes
  useEffect(() => {
    async function loadChatForTopic() {
      if (user && topic && topic !== chatLoadedForTopic) {
        setIsLoading(true);
        setChatHistory([]); // Clear local history before loading
        try {
          const chatsRef = collection(db, 'chats');
          const q = query(
            chatsRef,
            where('userId', '==', user.uid),
            where('topic', '==', topic),
            orderBy('updatedAt', 'desc'),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const chatDoc = querySnapshot.docs[0];
            setCurrentChatId(chatDoc.id);

            const messagesRef = collection(db, `chats/${chatDoc.id}/messages`);
            const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
            const messagesSnapshot = await getDocs(messagesQuery);
            const loadedMessages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setChatHistory(loadedMessages);
            setChatLoadedForTopic(topic);
            toast({ title: `Chat history loaded for "${topic}"`});
          } else {
            setCurrentChatId(null); // No existing chat for this topic
            setChatHistory([]);
            setChatLoadedForTopic(topic); // Mark as attempted to load
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          toast({ title: 'Error loading chat history', variant: 'destructive' });
          setCurrentChatId(null);
          setChatHistory([]);
        } finally {
          setIsLoading(false);
        }
      } else if (!user) {
        // If user logs out, clear Firebase-related chat state
        setCurrentChatId(null);
        setChatLoadedForTopic(null);
      }
    }
    loadChatForTopic();
  }, [user, topic, toast, chatLoadedForTopic]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({
        title: 'Missing question',
        description: 'Please enter a question.',
        variant: 'destructive',
      });
      return;
    }
    if (!topic.trim()) {
      toast({
        title: 'Missing topic',
        description: 'Please set an academic topic.',
        variant: 'destructive',
      });
      return;
    }

    const userMessageText = question;
    const userMessage: Message = { 
      id: Date.now().toString(), 
      type: 'user', 
      text: userMessageText, 
      topic,
      timestamp: Timestamp.now()
    };
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    setIsSaving(true);

    let activeChatId = currentChatId;

    try {
      // Create new chat session if needed (and user is logged in)
      if (user && !activeChatId) {
        const chatRef = await addDoc(collection(db, 'chats'), {
          userId: user.uid,
          topic: topic,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = chatRef.id;
        setCurrentChatId(activeChatId);
        
        // Add the new topic to user's topics list
        setUserTopics(prev => [
          { topic, lastUpdated: Timestamp.now(), chatId: activeChatId! },
          ...prev
        ]);
      }

      // Save user message to Firestore if logged in and chat exists
      if (user && activeChatId) {
        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
          type: 'user',
          text: userMessageText,
          topic: topic,
          timestamp: serverTimestamp(),
        });
        // Update chat's updatedAt timestamp
        await updateDoc(doc(db, 'chats', activeChatId), { updatedAt: serverTimestamp() });
        
        // Update the topic's lastUpdated in the local state
        setUserTopics(prev => prev.map(t => 
          t.chatId === activeChatId 
            ? { ...t, lastUpdated: Timestamp.now() }
            : t
        ));
      }
      
      // Get AI answer
      const response = await answerQuestion({ topic, question: userMessageText });
      const aiMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        type: 'ai', 
        text: response.answer,
        timestamp: Timestamp.now()
      };
      setChatHistory(prev => [...prev, aiMessage]);

      // Save AI message to Firestore if logged in and chat exists
      if (user && activeChatId) {
        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
          type: 'ai',
          text: response.answer,
          timestamp: serverTimestamp(),
        });
        await updateDoc(doc(db, 'chats', activeChatId), { updatedAt: serverTimestamp() });
      }

    } catch (error) {
      console.error('Error during chat submission or AI call:', error);
      toast({
        title: 'Error',
        description: 'Failed to process message or get an answer. Please try again.',
        variant: 'destructive',
      });
      setChatHistory(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      setIsSaving(false);
    }
  };

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (newTopic !== chatLoadedForTopic) {
      setChatLoadedForTopic(null); 
      setCurrentChatId(null);
      setChatHistory([]);
    }
  };

  const switchToTopic = (selectedTopic: UserTopic) => {
    if (selectedTopic.topic !== topic) {
      handleTopicChange(selectedTopic.topic);
    }
  };

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const confirmDeleteTopic = (topic: UserTopic) => {
    setTopicToDelete(topic);
  };

  const deleteTopic = async () => {
    if (!topicToDelete || !user) return;

    try {
      // Delete the chat document and all its messages
      await deleteDoc(doc(db, 'chats', topicToDelete.chatId));
      
      // Remove from local state
      setUserTopics(prev => prev.filter(t => t.chatId !== topicToDelete.chatId));
      
      // If the deleted topic was the current one, reset the chat
      if (topicToDelete.topic === topic) {
        setCurrentChatId(null);
        setChatHistory([]);
        setChatLoadedForTopic(null);
      }

      // Clear selection if it was selected
      setSelectedTopics(prev => prev.filter(id => id !== topicToDelete.chatId));

      toast({
        title: 'Topic deleted',
        description: `"${topicToDelete.topic}" and its conversation have been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast({
        title: 'Error deleting topic',
        variant: 'destructive',
      });
    } finally {
      setTopicToDelete(null);
    }
  };

  const deleteSelectedTopics = async () => {
    if (!user || selectedTopics.length === 0) return;

    try {
      // Delete all selected topics
      await Promise.all(
        selectedTopics.map(async chatId => {
          await deleteDoc(doc(db, 'chats', chatId));
        })
      );

      // Update local state
      setUserTopics(prev => prev.filter(t => !selectedTopics.includes(t.chatId)));

      // If current topic was deleted, reset chat
      if (selectedTopics.includes(currentChatId || '')) {
        setCurrentChatId(null);
        setChatHistory([]);
        setChatLoadedForTopic(null);
      }

      toast({
        title: 'Topics deleted',
        description: `${selectedTopics.length} topic(s) and their conversations have been deleted.`,
      });

      setSelectedTopics([]);
    } catch (error) {
      console.error('Error deleting topics:', error);
      toast({
        title: 'Error deleting topics',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
          <Card className="mb-4">
              <CardHeader>
                  <CardTitle className="text-lg">Set Academic Topic</CardTitle>
                  <CardDescription>Changing the topic will start a new chat session or load an existing one for that topic if you are logged in.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      <Input
                          placeholder="e.g., Quantum Physics, Shakespearean Literature"
                          value={topic}
                          onChange={(e) => handleTopicChange(e.target.value)}
                          className="text-base" />

                      {user && (
                          <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                  <p className="text-sm font-medium">Your Topics</p>
                                  {selectedTopics.length > 0 && (
                                      <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={deleteSelectedTopics}
                                          className="h-8"
                                      >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete Selected
                                      </Button>
                                  )}
                              </div>
                              {loadingTopics ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                              ) : userTopics.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                      {userTopics.map((userTopic) => (
                                          <div key={userTopic.chatId} className="relative">
                                              <Badge
                                                  variant={userTopic.topic === topic ? 'outline' : 'outline'}
                                                  className={`cursor-pointer hover:bg-blue-100 text-blue-800 pr-8 ${selectedTopics.includes(userTopic.chatId) ? 'bg-blue-100 border-blue-300' : ''}`}
                                                  onClick={() => switchToTopic(userTopic)}
                                              >
                                                  {userTopic.topic}
                                              </Badge>
                                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          toggleTopicSelection(userTopic.chatId);
                                                      } }
                                                      className={`p-1 rounded-full ${selectedTopics.includes(userTopic.chatId)
                                                              ? 'bg-blue-500 text-white'
                                                              : 'text-gray-400 hover:text-gray-600'}`}
                                                  >
                                                      {selectedTopics.includes(userTopic.chatId) ? (
                                                          <Check className="h-3 w-3" />
                                                      ) : (
                                                          <div className="h-3 w-3 border border-gray-400 rounded-sm" />
                                                      )}
                                                  </button>
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          confirmDeleteTopic(userTopic);
                                                      } }
                                                      className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                                                  >
                                                      <Trash2 className="h-3 w-3" />
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-sm text-muted-foreground">No previous topics found</p>
                              )}
                          </div>
                      )}
                  </div>
              </CardContent>
          </Card>

          {/* Delete confirmation dialog */}
          <AlertDialog open={!!topicToDelete} onOpenChange={(open) => !open && setTopicToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Delete this topic?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete the topic "<span className="font-semibold">{topicToDelete?.topic}</span>" and all its conversation history.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                          onClick={deleteTopic}
                          className="bg-red-600 hover:bg-red-700"
                      >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

          {!user && (
              <Alert className="mb-4">
                  <LogIn className="h-4 w-4" />
                  <AlertDescription>
                      <Button variant="link" className="p-0 h-auto mr-1" onClick={signInWithGoogle}>Sign in</Button>
                      to save your chat history and access it across devices.
                  </AlertDescription>
              </Alert>
          )}

          <Card className="flex-grow flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>AI Tutor Chat</CardTitle>
                  {isSaving && user && <div className="flex items-center text-sm text-muted-foreground"><Save className="mr-1 h-4 w-4 animate-pulse" />Saving...</div>}
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden p-0">
                  <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
                      {isLoading && chatHistory.length === 0 && <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                      {/* Group messages by date */}
                      {(() => {
                          // Helper to format date headers
                          function formatDateHeader(date: Date) {
                              const now = new Date();
                              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
                              if (diffDays === 0) return 'Today';
                              if (diffDays === 1) return 'Yesterday';
                              if (diffDays < 7) return msgDate.toLocaleDateString(undefined, { weekday: 'long' });
                              return msgDate.toLocaleDateString();
                          }

                          // Group messages by date string
                          const grouped: { [date: string]: Message[]; } = {};
                          chatHistory.forEach(msg => {
                              let date: Date | null = null;
                              if (msg.timestamp instanceof Timestamp) {
                                  date = msg.timestamp.toDate();
                              } else if (msg.timestamp instanceof Date) {
                                  date = msg.timestamp;
                              } else {
                                  date = new Date();
                              }
                              const dateKey = date.toDateString();
                              if (!grouped[dateKey]) grouped[dateKey] = [];
                              grouped[dateKey].push(msg);
                          });

                          const sortedDates = Object.keys(grouped).sort(
                              (a, b) => new Date(a).getTime() - new Date(b).getTime()
                          );

                      return (
                          <div className="space-y-4">
                              {sortedDates.map(dateKey => (
                                  <div key={dateKey}>
                                      <div className="flex justify-center my-2">
                                          <span className="text-xs px-3 py-1 rounded bg-black/50 text-white">
                                              {formatDateHeader(new Date(dateKey))}
                                          </span>
                                      </div>
                                      {grouped[dateKey].map((msg) => (
                                          <div
                                              key={msg.id}
                                              className={`flex items-start gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}
                                          >
                                              {msg.type === 'ai' && (
                                                  <Avatar className="h-8 w-8">
                                                      <AvatarFallback><Bot className="h-5 w-5 text-black" /></AvatarFallback>
                                                  </Avatar>
                                              )}
                                              <div
                                                  className={`rounded-lg p-3 max-w-[70%] text-sm shadow-md ${msg.type === 'user'
                                                      ? 'text-blue-800 '
                                                      : 'bg-secondary text-secondary-foreground'}`}
                                              >
                                                  {msg.topic && msg.type === 'user' && <p className="font-semibold text-xs mb-1 opacity-80">Topic: {msg.topic}</p>}
                                                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                                  {msg.timestamp && (
                                                      <p className="text-xs mt-1 opacity-70 text-right">
                                                          {msg.timestamp instanceof Timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : ''}
                                                      </p>
                                                  )}
                                              </div>
                                              {msg.type === 'user' && (
                                                  <Avatar className="h-8 w-8">
                                                      <AvatarFallback><User className="h-5 w-5 text-black" /></AvatarFallback>
                                                  </Avatar>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              ))}
                          </div>
                      );
                  })()}
                  {isLoading && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].type === 'user' && (
                      <div className="flex items-start gap-3 mt-4">
                          <Avatar className="h-8 w-8">
                              <AvatarFallback><Bot className="h-5 w-5 text-primary" /></AvatarFallback>
                          </Avatar>
                          <div className="rounded-lg p-3 bg-secondary text-secondary-foreground max-w-[70%] shadow-md">
                              <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                      </div>
                  )}
              
              
          </ScrollArea>
      </CardContent><form onSubmit={handleSubmit} className="border-t p-4">
              <div className="flex items-center gap-2">
                  <Textarea
                      placeholder={topic ? `Ask about ${topic}...` : "Ask your question..."}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={1}
                      className="flex-grow resize-none text-base min-h-[40px]"
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
                          }
                      } }
                      disabled={isLoading && chatHistory.length === 0 && user !== null} />
                  <Button type="submit" disabled={isLoading || !question.trim() || !topic.trim() || (isLoading && chatHistory.length === 0 && user !== null)}>
                      {isLoading && !(isLoading && chatHistory.length === 0 && user !== null) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
              </div>
          </form>
        </Card>
        </div>
        )}
