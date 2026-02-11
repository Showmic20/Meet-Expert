
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  StatusBar,
  ListRenderItem,
  ActivityIndicator,
  Alert 
} from 'react-native';

import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const GEMINI_API_KEY = 'AIzaSyB48WvpPZnSg_PekKbqs9iiRWmWOYIQ6t8'; 
const MODEL_NAME = 'gemini-2.5-flash';


interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

const ChatScreen = () => {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      sender: 'ai', 
      text: 'Hello! Share your problme with me, I will help you!' 
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const flatListRef = useRef<FlatList<Message>>(null);

  const getHistoryForGemini = (currentMessages: Message[]): GeminiContent[] => {
    return currentMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
  };
  useEffect(() => {
    const checkAvailableModels = async () => {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );
        const data = await response.json();
        
        
        console.log("Available Models:", JSON.stringify(data, null, 2));
        
        
        if (data.models) {
          const validModel = data.models.find((m:any) => m.name.includes('gemini'));
         
        }
      } catch (error) {
        console.error("Model Check Error:", error);
      }
    };

    checkAvailableModels();
  }, []);
const handleSend = async () => {
    if (!input.trim()) return;

   
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const apiHistory = getHistoryForGemini(newMessages.slice(1));

      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            
            system_instruction: {
              parts: {
                text: `You are Gemini, a highly advanced and helpful AI assistant. 
                1. Always provide detailed, comprehensive, and well-explained answers. 
                2. Use Markdown formatting (Bold, Bullet points, Code blocks) nicely.
                3. Do not give short one-line answers unless asked. 
                4. If the user asks for code, explain the code logic after providing it.
                5. Be friendly, empathetic, and professional.
                6. Always discuss about career, I any ask about other things always say that, I'm only for career guidelines`
              }
            },
            contents: apiHistory,
            generationConfig: {
              temperature: 0.9, 
              maxOutputTokens: 4000, 
            },
          }),
        }
      );

      const data = await response.json();


      if (data.error) {
        console.error("Model Error:", data.error);
        throw new Error(data.error.message);
      }

      const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I am thinking...";

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        text: aiResponseText 
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      let errorMessage = "Something went wrong.";
      
      if (error.message.includes('not found') || error.message.includes('404')) {
        errorMessage = `⚠️ Model '${MODEL_NAME}' not found. Please check if you have access to this specific version in Google AI Studio.`;
      } else {
        errorMessage = `⚠️ Error: ${error.message}`;
      }

      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: errorMessage 
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem: ListRenderItem<Message> = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowReverse : styles.rowStart]}>
        <View style={[styles.avatar, isUser ? styles.userAvatar : styles.botAvatar]}>
          {isUser ? (
            <Ionicons name="person" size={18} color="#FFF" />
          ) : (
            <MaterialCommunityIcons name="robot" size={18} color="#FFF" />
          )}
        </View>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.messageText, isUser ? styles.textWhite : styles.textDark]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="robot-excited" size={24} color="#FFF" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Meet Ai</Text>
          <Text style={styles.headerSubtitle}>Powered by Google AI</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? (
              <View style={{ padding: 10, marginLeft: 40 }}>
                 <Text style={{color: '#666', fontSize: 12, fontStyle: 'italic'}}>Gemini is thinking...</Text>
                 <ActivityIndicator size="small" color="#2563EB" style={{marginTop: 5, alignSelf: 'flex-start'}} />
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Gemini..."
            placeholderTextColor="#888"
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity 
            onPress={handleSend} 
            disabled={!input.trim() || isLoading}
            style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.disclaimer}>AI can make mistakes. Verify info.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
  },
  headerIconContainer: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f9d58',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  headerSubtitle: { fontSize: 12, color: '#6B7280' },
  chatList: { padding: 16, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', maxWidth: '100%' },
  rowReverse: { flexDirection: 'row-reverse' },
  rowStart: { flexDirection: 'row' },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  userAvatar: { backgroundColor: '#374151', marginLeft: 8 },
  botAvatar: { backgroundColor: '#0f9d58', marginRight: 8 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, maxWidth: '75%' },
  userBubble: { backgroundColor: '#1F2937', borderTopRightRadius: 4 },
  botBubble: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderTopLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  textWhite: { color: '#FFF' },
  textDark: { color: '#1F2937' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 16,
    paddingVertical: 10, maxHeight: 100, fontSize: 15, color: '#1F2937', marginRight: 10,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f9d58',
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#E5E7EB' },
  disclaimer: {
    textAlign: 'center', fontSize: 10, color: '#9CA3AF', paddingBottom: 8, backgroundColor: '#FFF',
  },
});

export default ChatScreen;