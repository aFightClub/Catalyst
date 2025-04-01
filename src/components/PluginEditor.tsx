import React, { useState, useEffect } from 'react';
import { StoredPlugin } from '../types/plugin';
import { pluginManager } from '../services/pluginManager';
import { FiSave, FiTrash, FiPlayCircle, FiPauseCircle, FiCode } from 'react-icons/fi';

interface PluginEditorProps {
  onClose: () => void;
  initialPlugin?: StoredPlugin;
}

const PluginEditor: React.FC<PluginEditorProps> = ({ onClose, initialPlugin }) => {
  const [name, setName] = useState(initialPlugin?.name || '');
  const [code, setCode] = useState(initialPlugin?.code || '');
  const [type, setType] = useState<'css' | 'js' | 'html'>(initialPlugin?.type || 'js');
  const [enabled, setEnabled] = useState<boolean>(initialPlugin?.enabled || true);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = () => {
    if (name.trim() === '') {
      alert('Please provide a name for the plugin');
      return;
    }

    if (code.trim() === '') {
      alert('Plugin code cannot be empty');
      return;
    }

    if (initialPlugin) {
      // Update existing plugin
      pluginManager.updatePlugin({
        ...initialPlugin,
        name,
        code,
        type,
        enabled
      });
    } else {
      // Create new plugin
      pluginManager.addPlugin({
        name,
        code,
        type,
        enabled
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialPlugin && confirm('Are you sure you want to delete this plugin?')) {
      pluginManager.deletePlugin(initialPlugin.id);
      onClose();
    }
  };

  const generateCodeFromAI = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for the AI');
      return;
    }

    setIsGenerating(true);

    try {
      // Use OpenAI API to generate code based on the prompt
      const apiKey = localStorage.getItem('openai_api_key');
      
      if (!apiKey) {
        const key = window.prompt('Please enter your OpenAI API key:');
        if (key) {
          localStorage.setItem('openai_api_key', key);
        } else {
          setIsGenerating(false);
          return;
        }
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || localStorage.getItem('openai_api_key')}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a web plugin generator. Generate ${type} code for a web browser plugin based on the user's request. Provide only the code with no explanations or markdown.`
            },
            {
              role: 'user',
              content: `Create a ${type} plugin that: ${prompt}`
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedCode = data.choices[0].message.content.trim();
      
      // Extract code from markdown code blocks if present
      let cleanCode = generatedCode;
      const codeBlockMatch = /```(?:html|css|javascript|js)?\n([\s\S]*?)\n```/g.exec(generatedCode);
      if (codeBlockMatch && codeBlockMatch[1]) {
        cleanCode = codeBlockMatch[1].trim();
      }

      setCode(cleanCode);
      setShowAIPrompt(false);
    } catch (error: any) {
      console.error('Error generating code from OpenAI:', error);
      alert(`Failed to generate code: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {initialPlugin ? 'Edit Plugin' : 'Create New Plugin'}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAIPrompt(true)}
              className="btn-primary"
              title="Generate code with AI"
            >
              <FiCode className="mr-1" />
              Generate with AI
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Plugin Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 text-white p-2 rounded"
            placeholder="Enter plugin name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Plugin Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center text-gray-300">
              <input
                type="radio"
                checked={type === 'js'}
                onChange={() => setType('js')}
                className="mr-2"
              />
              JavaScript
            </label>
            <label className="flex items-center text-gray-300">
              <input
                type="radio"
                checked={type === 'css'}
                onChange={() => setType('css')}
                className="mr-2"
              />
              CSS
            </label>
            <label className="flex items-center text-gray-300">
              <input
                type="radio"
                checked={type === 'html'}
                onChange={() => setType('html')}
                className="mr-2"
              />
              HTML
            </label>
          </div>
        </div>

        <div className="mb-4 flex-1 overflow-hidden">
          <label className="block text-gray-300 mb-2">Plugin Code</label>
          <div className="h-full flex flex-col">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded font-mono flex-1 min-h-[300px]"
              placeholder={`Enter your ${type} code here...`}
              spellCheck="false"
            />
          </div>
        </div>

        <div className="flex items-center mb-4">
          <label className="flex items-center text-gray-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
              className="mr-2"
            />
            Enable plugin after saving
          </label>
        </div>

        <div className="flex justify-between">
          <div>
            {initialPlugin && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
              >
                <FiTrash className="mr-2" />
                Delete
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              <FiSave className="mr-2" />
              {initialPlugin ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        {/* AI Prompt Modal */}
        {showAIPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full">
              <h3 className="text-lg font-bold text-white mb-4">Generate Plugin Code with AI</h3>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  Describe what you want the plugin to do:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded min-h-[120px]"
                  placeholder={`E.g., "Create a dark mode toggle for websites" or "Block all ads on the page"`}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAIPrompt(false)}
                  className="btn-secondary"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={generateCodeFromAI}
                  className="btn-primary"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiCode className="mr-2" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginEditor; 