import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiCpu, FiSettings } from 'react-icons/fi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showAPISettings, setShowAPISettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    // First try to get from AIChat's own storage key
    let savedKey = localStorage.getItem('openai_api_key');
    
    // If not found, check other possible storage locations used by Settings
    if (!savedKey) {
      // Try getting from settings storage
      const storedKeys = localStorage.getItem('api_keys');
      if (storedKeys) {
        try {
          const parsedKeys = JSON.parse(storedKeys);
          if (parsedKeys.openai) {
            savedKey = parsedKeys.openai;
            // Save it to our own storage for future use
            localStorage.setItem('openai_api_key', parsedKeys.openai);
          }
        } catch (e) {
          console.error('Failed to parse API keys:', e);
        }
      }
    }
    
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    }
  }, [apiKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !apiKey) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Add loading message for assistant
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    try {
      // Call OpenAI API with streaming
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch response');
      }
      
      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      let partialResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the array buffer to text
        const chunk = new TextDecoder().decode(value);
        
        // Process SSE format
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            // Check for the end of the stream
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                partialResponse += content;
                
                // Update the assistant's message with accumulated response
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: partialResponse
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // Update the assistant message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">AI Chat</h2>
        <button 
          onClick={() => setShowAPISettings(!showAPISettings)}
          className="p-2 rounded-lg hover:bg-gray-700"
          title="API Settings"
        >
          <FiSettings className="w-5 h-5" />
        </button>
      </div>

      {showAPISettings ? (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <label className="block text-gray-300 mb-2">OpenAI API Key</label>
          <div className="flex">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your OpenAI API key"
            />
            <button
              onClick={() => setShowAPISettings(false)}
              className="px-4 py-2 bg-blue-600 rounded-r hover:bg-blue-700"
            >
              Save
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <FiCpu className="w-12 h-12 mx-auto mb-4" />
            <p>Send a message to start chatting with AI</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3/4 rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                <div className="flex items-center mb-1">
                  {message.role === 'user' ? (
                    <>
                      <span className="font-medium">You</span>
                      <FiUser className="ml-1 w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <FiCpu className="mr-1 w-4 h-4" />
                      <span className="font-medium">AI</span>
                    </>
                  )}
                </div>
                <div className="whitespace-pre-wrap">
                  {message.content || (isLoading && index === messages.length - 1 ? (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200" />
                    </div>
                  ) : '')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            disabled={isLoading || !apiKey}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-r flex items-center justify-center ${
              isLoading || !apiKey || !input.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isLoading || !apiKey || !input.trim()}
          >
            <FiSend className="w-5 h-5" />
          </button>
        </form>
        {!apiKey && (
          <p className="mt-2 text-sm text-red-400">
            Please set your OpenAI API key in settings
          </p>
        )}
      </div>
    </div>
  );
};

export default AIChat; 