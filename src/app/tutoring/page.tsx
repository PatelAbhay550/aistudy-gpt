
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
import { Loader2, User, Bot, Save, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  topic?: string;
  timestamp?: Timestamp;
}

export default function AITutoringPage() {
  const [topic, setTopic] = useState<string>('General Knowledge');
  const [question, setQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatLoadedForTopic, setChatLoadedForTopic] = useState<string | null>(null);

  const { toast } = useToast();
  const { user, signInWithGoogle } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

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
        // Optionally, clear local chat history or keep it
        // setChatHistory([]); 
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
      timestamp: Timestamp.now() // For local display and potential Firestore save
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
      }

      // Save user message to Firestore if logged in and chat exists
      if (user && activeChatId) {
        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
          type: 'user',
          text: userMessageText,
          topic: topic, // Storing topic with message for context, might be redundant if chat doc has it
          timestamp: serverTimestamp(),
        });
        // Update chat's updatedAt timestamp
        await updateDoc(doc(db, 'chats', activeChatId), { updatedAt: serverTimestamp() });
      }
      
      // Get AI answer
      const response = await answerQuestion({ topic, question: userMessageText });
      const aiMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        type: 'ai', 
        text: response.answer,
        timestamp: Timestamp.now() // For local display and potential Firestore save
      };
      setChatHistory(prev => [...prev, aiMessage]);

      // Save AI message to Firestore if logged in and chat exists
      if (user && activeChatId) {
        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
          type: 'ai',
          text: response.answer,
          timestamp: serverTimestamp(),
        });
         // Update chat's updatedAt timestamp
        await updateDoc(doc(db, 'chats', activeChatId), { updatedAt: serverTimestamp() });
      }

    } catch (error) {
      console.error('Error during chat submission or AI call:', error);
      toast({
        title: 'Error',
        description: 'Failed to process message or get an answer. Please try again.',
        variant: 'destructive',
      });
      // Remove the optimistic user message if saving failed
      setChatHistory(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      setIsSaving(false);
    }
  };

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    // Reset chat loaded state so it attempts to load for the new topic
    // If newTopic is same as current, it won't reload due to chatLoadedForTopic check
    if (newTopic !== chatLoadedForTopic) {
      setChatLoadedForTopic(null); 
      setCurrentChatId(null); // Reset current chat ID when topic changes
      setChatHistory([]); // Clear chat history when topic changes, it will be reloaded
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
          <Input
            placeholder="e.g., Quantum Physics, Shakespearean Literature"
            value={topic}
            onChange={(e) => handleTopicChange(e.target.value)}
            className="text-base"
          />
        </CardContent>
      </Card>

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
            <div className="space-y-4">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.type === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {msg.type === 'ai' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg p-3 max-w-[70%] text-sm shadow-md ${
                      msg.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.topic && msg.type === 'user' && <p className="font-semibold text-xs mb-1 opacity-80">Topic: {msg.topic}</p>}
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                     {msg.timestamp && (
                        <p className="text-xs mt-1 opacity-70 text-right">
                          {/* Ensure timestamp is a Firebase Timestamp before calling toDate */}
                          {msg.timestamp instanceof Timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : ''}
                        </p>
                      )}
                  </div>
                  {msg.type === 'user' && (
                     <Avatar className="h-8 w-8">
                       <AvatarFallback><User className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {isLoading && chatHistory.length > 0 && chatHistory[chatHistory.length -1].type === 'user' && (
                 <div className="flex items-start gap-3 mt-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg p-3 bg-secondary text-secondary-foreground max-w-[70%] shadow-md">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  </div>
               )}
            </div>
          </ScrollArea>
        </CardContent>
        <form onSubmit={handleSubmit} className="border-t p-4">
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
              }}
              disabled={isLoading && chatHistory.length === 0 && user !== null}
            />
            <Button type="submit" disabled={isLoading || !question.trim() || !topic.trim() || (isLoading && chatHistory.length === 0 && user !== null)}>
              {isLoading && !(isLoading && chatHistory.length === 0 && user !== null) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
