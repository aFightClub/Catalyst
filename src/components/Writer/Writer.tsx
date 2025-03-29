import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiTrash2, FiList, FiFolder, FiFile, FiMoreVertical, FiEdit, FiX, FiSave } from 'react-icons/fi';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import Marker from '@editorjs/marker';
import Checklist from '@editorjs/checklist';
import Table from '@editorjs/table';
import { storeService } from '../../services/storeService';

// OpenAI Tool for EditorJS
interface OpenAIToolData {
  prompt?: string;
  result?: string;
}

interface OpenAIToolAPI {
  blocks: {
    getCurrentBlockIndex: () => number;
    insert: (type: string, data: any, options: any, position?: number, replace?: boolean) => void;
    delete: (index: number) => void;
  };
}

// Storage keys matching those in AIChat
const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
};

class OpenAITool {
  api: OpenAIToolAPI;
  data: OpenAIToolData;
  container!: HTMLDivElement;
  promptInput!: HTMLTextAreaElement;
  resultOutput!: HTMLDivElement;

  static get toolbox() {
    return {
      title: 'AI Writer',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M3 10h2v4H3v-4z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>'
    };
  }

  constructor({ data, api }: { data: OpenAIToolData; api: OpenAIToolAPI }) {
    this.api = api;
    this.data = {
      prompt: data.prompt || '',
      result: data.result || '',
    };
  }

  render() {
    this.container = document.createElement('div');
    this.container.classList.add('openai-tool');
    
    const promptWrapper = document.createElement('div');
    promptWrapper.classList.add('openai-prompt-wrapper');
    
    const promptLabel = document.createElement('div');
    promptLabel.classList.add('openai-prompt-label');
    promptLabel.innerHTML = 'Ask OpenAI:';
    
    this.promptInput = document.createElement('textarea');
    this.promptInput.classList.add('openai-prompt-input');
    this.promptInput.placeholder = 'Enter your prompt here...';
    this.promptInput.value = this.data.prompt || '';
    
    const promptButton = document.createElement('button');
    promptButton.classList.add('openai-prompt-button');
    promptButton.innerHTML = 'Generate';
    promptButton.addEventListener('click', this.generateContent.bind(this));
    
    promptWrapper.appendChild(promptLabel);
    promptWrapper.appendChild(this.promptInput);
    promptWrapper.appendChild(promptButton);
    
    this.resultOutput = document.createElement('div');
    this.resultOutput.classList.add('openai-result');
    if (this.data.result) {
      this.resultOutput.innerHTML = this.data.result;
    }
    
    this.container.appendChild(promptWrapper);
    this.container.appendChild(this.resultOutput);
    
    return this.container;
  }
  
  async generateContent() {
    const prompt = this.promptInput.value.trim();
    if (!prompt) return;
    
    // Show loading indicator
    this.resultOutput.innerHTML = `
      <div class="openai-loading">
        <span>Generating</span>
        <div class="dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    `;
    
    try {
      // Get API key from localStorage (same as in AIChat)
      const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      
      if (!apiKey) {
        throw new Error('OpenAI API key is missing. Please set it in AI Chat settings.');
      }
      
      // Make direct request to OpenAI API (similar to AIChat implementation)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful writing assistant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch response from OpenAI');
      }
      
      const data = await response.json();
      const result = data.choices[0]?.message?.content || 'No response from OpenAI';
      
      this.data.result = result;
      
      // Insert the AI response into the editor immediately without showing in the tool
      this.insertResponseIntoEditor(result);
      
    } catch (error) {
      console.error('Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
      this.resultOutput.innerHTML = `
        <div class="openai-error">
          <strong>Error:</strong> ${errorMessage}
        </div>
        <div class="mt-2 text-sm">
          <p>Make sure you have set up your OpenAI API key in the AI Chat settings section.</p>
        </div>
      `;
    }
  }
  
  insertResponseIntoEditor(content: string) {
    try {
      // Get current block index
      const currentBlockIndex = this.api.blocks.getCurrentBlockIndex();
      
      // Split content by paragraphs
      const paragraphs = content.split('\n\n');
      
      // Track the number of blocks added
      let blocksAdded = 0;
      
      // For each paragraph, determine its type and insert appropriate block
      paragraphs.forEach((paragraph, index) => {
        const paragraphText = paragraph.trim();
        
        if (!paragraphText) return;
        
        // Detect if this might be a header (starts with # or ##)
        const headerMatch = paragraphText.match(/^(#{1,6})\s+(.+)$/);
        
        // Detect if this might be a list (starts with -, *, or 1.)
        const listItemRegex = /^\s*[-*•]\s+(.+)$/gm;
        const numberedListItemRegex = /^\s*\d+\.\s+(.+)$/gm;
        const isListItem = listItemRegex.test(paragraphText) || numberedListItemRegex.test(paragraphText);
        
        if (headerMatch) {
          // This is a header, determine level (1-6 based on number of #)
          const level = Math.min(headerMatch[1].length, 6);
          const text = headerMatch[2].trim();
          
          this.api.blocks.insert(
            'header',
            { text, level },
            {},
            currentBlockIndex + blocksAdded + (index === 0 ? 0 : 1),
            index === 0 // Replace the OpenAI block only with the first item
          );
          blocksAdded++;
        } 
        else if (isListItem) {
          // Reset regex state
          listItemRegex.lastIndex = 0;
          numberedListItemRegex.lastIndex = 0;
          
          // Determine list type (unordered or ordered)
          const isOrdered = numberedListItemRegex.test(paragraphText);
          
          // Parse list items (either - or 1. format)
          const items = paragraphText
            .split('\n')
            .map(line => {
              const bulletMatch = line.match(/^\s*[-*•]\s+(.+)$/);
              const numberMatch = line.match(/^\s*\d+\.\s+(.+)$/);
              return bulletMatch ? bulletMatch[1] : numberMatch ? numberMatch[1] : line;
            })
            .filter(item => item.trim());
          
          this.api.blocks.insert(
            'list',
            { 
              style: isOrdered ? 'ordered' : 'unordered',
              items 
            },
            {},
            currentBlockIndex + blocksAdded + (index === 0 ? 0 : 1),
            index === 0 // Replace the OpenAI block only with the first item
          );
          blocksAdded++;
        }
        else {
          // Regular paragraph
          this.api.blocks.insert(
            'paragraph',
            { text: paragraphText.replace(/\n/g, ' ') },
            {},
            currentBlockIndex + blocksAdded + (index === 0 ? 0 : 1),
            index === 0 // Replace the OpenAI block only with the first item
          );
          blocksAdded++;
        }
      });
      
      // If no blocks were added or the first block didn't replace the tool,
      // make sure we still remove the OpenAI tool block
      if (blocksAdded === 0 || paragraphs.length === 0) {
        this.api.blocks.insert(
          'paragraph',
          { text: content || 'No content generated.' },
          {},
          currentBlockIndex,
          true // Replace the current block
        );
      } 
      // If we added more than one block, but the first one didn't replace the tool
      else if (blocksAdded > 1 && paragraphs[0].trim() === '') {
        // Remove the original OpenAI block if it wasn't replaced
        setTimeout(() => {
          this.api.blocks.delete(currentBlockIndex);
        }, 50);
      }
    } catch (error) {
      console.error('Error inserting AI response into editor:', error);
      
      // In case of error, show error message and don't remove the block
      this.resultOutput.innerHTML = `
        <div class="openai-error">
          <strong>Error:</strong> Failed to insert content into the editor.
        </div>
      `;
    }
  }

  save() {
    return {
      prompt: this.promptInput.value,
      result: this.data.result
    };
  }
}

interface Document {
  id: string;
  name: string;
  content: any;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'default',
    name: 'General',
    color: '#3B82F6', // blue-500
    createdAt: new Date().toISOString()
  },
  {
    id: 'work',
    name: 'Work Documents',
    color: '#EF4444', // red-500
    createdAt: new Date().toISOString()
  },
  {
    id: 'personal',
    name: 'Personal Notes',
    color: '#10B981', // emerald-500
    createdAt: new Date().toISOString()
  }
];

const COLORS = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#6366F1', // indigo-500
  '#F97316', // orange-500
];

const Writer: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [showDocList, setShowDocList] = useState(true);
  const [newDocName, setNewDocName] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showProjectActions, setShowProjectActions] = useState<string | null>(null);
  const editorInstance = useRef<any>(null);

  // Load documents and projects from store on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load documents
        const storedDocs = await storeService.getDocuments();
        if (Array.isArray(storedDocs)) {
          setDocuments(storedDocs);
          
          // Backward compatibility - add projectId if missing
          const docsWithProjects = storedDocs.map(doc => {
            if (!doc.projectId) {
              return { ...doc, projectId: 'default' };
            }
            return doc;
          });
          
          if (JSON.stringify(docsWithProjects) !== JSON.stringify(storedDocs)) {
            await storeService.saveDocuments(docsWithProjects);
            setDocuments(docsWithProjects);
          }
          
          if (storedDocs.length > 0 && !currentDocId) {
            setCurrentDocId(storedDocs[0].id);
          }
        } else {
          console.warn("Documents data is not an array, using empty array", storedDocs);
          setDocuments([]);
        }
        
        // Load projects
        const storedProjects = await storeService.getProjects();
        if (Array.isArray(storedProjects) && storedProjects.length > 0) {
          setProjects(storedProjects);
        } else {
          console.log("No projects found, using defaults for Writer");
          setProjects(DEFAULT_PROJECTS);
          await storeService.saveProjects(DEFAULT_PROJECTS);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setDocuments([]);
        setProjects(DEFAULT_PROJECTS);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save documents whenever they change
  useEffect(() => {
    const saveData = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        await storeService.saveDocuments(documents);
      } catch (error) {
        console.error("Failed to save documents:", error);
      }
    };
    
    saveData();
  }, [documents, isLoading]);
  
  // Save projects whenever they change
  useEffect(() => {
    const saveProjects = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        await storeService.saveProjects(projects);
      } catch (error) {
        console.error("Failed to save projects:", error);
      }
    };
    
    saveProjects();
  }, [projects, isLoading]);
  
  // Filter documents by active project
  const filteredDocuments = documents.filter(doc => doc.projectId === activeProjectId);

  // Add dark mode styles for Editor.js when component mounts
  useEffect(() => {
    // Inject dark mode styles
    const darkModeStyle = document.createElement('style');
    darkModeStyle.id = 'editor-dark-mode-style';
    darkModeStyle.textContent = `
      /* Dark mode for Editor.js */
      .codex-editor {
        color: #e2e8f0;
      }
      .codex-editor .ce-block__content, 
      .codex-editor .ce-toolbar__content {
        max-width: 90%;
      }
      .codex-editor .ce-paragraph {
        color: #e2e8f0;
        font-size: 16px;
        line-height: 1.6;
      }
      .codex-editor .ce-header {
        color: #f8fafc;
        font-weight: 700;
        padding: 0.5em 0;
      }
      
      /* Specific header level styling with LARGER text */
      .codex-editor h1.ce-header {
        font-size: 3em;
        margin: 0.67em 0;
        border-bottom: 1px solid #374151;
        padding-bottom: 0.3em;
        font-weight: 800;
        line-height: 1.2;
      }

      .codex-editor h2.ce-header {
        font-size: 2.5em;
        margin: 0.83em 0;
        border-bottom: 1px solid #374151;
        padding-bottom: 0.3em;
        font-weight: 700;
        line-height: 1.3;
      }

      .codex-editor h3.ce-header {
        font-size: 2em;
        margin: 1em 0;
        font-weight: 600;
        line-height: 1.4;
      }

      .codex-editor h4.ce-header {
        font-size: 1.5em;
        margin: 1.33em 0;
        font-weight: 600;
        line-height: 1.4;
      }

      .codex-editor h5.ce-header {
        font-size: 1.25em;
        margin: 1.67em 0;
        font-weight: 600;
        line-height: 1.4;
      }

      .codex-editor h6.ce-header {
        font-size: 1.1em;
        margin: 2.33em 0;
        font-weight: 600;
        line-height: 1.4;
      }
      
      /* Alternative header styling with data attributes */
      .codex-editor .ce-header[data-level="1"] {
        font-size: 3em;
        margin: 0.67em 0;
        border-bottom: 1px solid #374151;
        padding-bottom: 0.3em;
        font-weight: 800;
        line-height: 1.2;
      }
      
      .codex-editor .ce-header[data-level="2"] {
        font-size: 2.5em;
        margin: 0.83em 0;
        border-bottom: 1px solid #374151;
        padding-bottom: 0.3em;
        font-weight: 700;
        line-height: 1.3;
      }
      
      .codex-editor .ce-header[data-level="3"] {
        font-size: 2em;
        margin: 1em 0;
        font-weight: 600;
        line-height: 1.4;
      }
      
      .codex-editor .ce-header[data-level="4"] {
        font-size: 1.5em;
        margin: 1.33em 0;
        font-weight: 600;
        line-height: 1.4;
      }
      
      .codex-editor .ce-header[data-level="5"] {
        font-size: 1.25em;
        margin: 1.67em 0;
        font-weight: 600;
        line-height: 1.4;
      }
      
      .codex-editor .ce-header[data-level="6"] {
        font-size: 1.1em;
        margin: 2.33em 0;
        font-weight: 600;
        line-height: 1.4;
      }
      
      /* OpenAI Tool Styles */
      .openai-tool {
        padding: 15px;
        background-color: #1a202c;
        border-radius: 6px;
        margin-bottom: 15px;
        border: 1px solid #374151;
      }
      
      .openai-prompt-wrapper {
        margin-bottom: 10px;
      }
      
      .openai-prompt-label {
        font-weight: bold;
        margin-bottom: 5px;
        color: #e2e8f0;
      }
      
      .openai-prompt-input {
        width: 100%;
        padding: 8px 12px;
        border-radius: 4px;
        background-color: #2d3748;
        color: #e2e8f0;
        border: 1px solid #4a5568;
        margin-bottom: 8px;
        min-height: 80px;
        resize: vertical;
      }
      
      .openai-prompt-button {
        padding: 6px 12px;
        background-color: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
      }
      
      .openai-prompt-button:hover {
        background-color: #2563eb;
      }
      
      .openai-result {
        padding: 12px;
        background-color: #2d3748;
        border-radius: 4px;
        color: #e2e8f0;
        white-space: pre-wrap;
        min-height: 20px;
        line-height: 1.5;
      }
      
      .openai-loading {
        display: flex;
        align-items: center;
        color: #60a5fa;
        font-size: 0.9em;
      }
      
      .openai-loading .dots {
        display: flex;
        margin-left: 5px;
      }
      
      .openai-loading .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #60a5fa;
        margin: 0 2px;
        opacity: 0.8;
        animation: pulse 1.5s infinite ease-in-out;
      }
      
      .openai-loading .dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .openai-loading .dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      .openai-error {
        color: #f87171;
        border-left: 3px solid #f87171;
        padding-left: 10px;
        background-color: rgba(248, 113, 113, 0.1);
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(0.8);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      
      /* Rest of existing styles */
      .codex-editor--narrow .ce-toolbar__plus,
      .codex-editor .ce-toolbar__plus,
      .codex-editor .ce-toolbar__settings-btn {
        background-color: #4b5563 !important;
        color: #e2e8f0 !important;
      }
      .codex-editor .ce-inline-toolbar {
        background-color: #1f2937 !important;
        border-color: #374151 !important;
        color: #e2e8f0 !important;
      }
      .codex-editor .cdx-marker {
        background-color: rgba(255, 230, 0, 0.3);
      }
      .codex-editor .ce-inline-tool {
        color: #e2e8f0 !important;
      }
      .codex-editor .ce-inline-tool:hover {
        background-color: #374151 !important;
      }
      .codex-editor .ce-inline-tool--active {
        color: #60a5fa !important;
      }
      .codex-editor .ce-conversion-toolbar {
        background-color: #1f2937 !important;
        border-color: #374151 !important;
        color: #e2e8f0 !important;
      }
      .codex-editor .ce-conversion-tool {
        color: #e2e8f0 !important;
      }
      .codex-editor .ce-conversion-tool--focused {
        background-color: #374151 !important;
      }
      .codex-editor .cdx-checklist__item-checkbox {
        background-color: #1f2937 !important;
        border-color: #4b5563 !important;
      }
      .codex-editor .cdx-checklist__item--checked .cdx-checklist__item-checkbox {
        background-color: #60a5fa !important;
        border-color: #3b82f6 !important;
      }
      .codex-editor .ce-block--selected .ce-block__content {
        background-color: rgba(66, 153, 225, 0.1) !important;
      }
      .codex-editor .cdx-list {
        color: #e2e8f0;
        margin-left: 1em;
        font-size: 16px;
        line-height: 1.6;
      }
      .codex-editor .cdx-list__item {
        padding: 0.3em 0;
      }
      .codex-editor .cdx-quote {
        color: #e2e8f0;
        padding: 0.8em 1em;
        border-left: 4px solid #3b82f6;
        background-color: rgba(59, 130, 246, 0.1);
        margin: 1em 0;
      }
      .codex-editor .cdx-quote__text {
        font-style: italic;
        font-size: 1.1em;
        line-height: 1.6;
      }
      .codex-editor .cdx-quote__caption {
        margin-top: 0.5em;
        color: #9ca3af;
      }
      .codex-editor .tc-table {
        border-color: #4b5563 !important;
        width: 100%;
        margin: 1em 0;
      }
      .codex-editor .tc-table__cell {
        border-color: #4b5563 !important;
        background-color: #1f2937 !important;
        color: #e2e8f0 !important;
        padding: 0.8em;
      }
      .codex-editor .tc-table__wrap {
        background-color: #1f2937 !important;
      }
      .codex-editor .tc-row--selected .tc-cell,
      .codex-editor .tc-cell--selected {
        background-color: rgba(59, 130, 246, 0.2) !important;
      }
      .codex-editor .tc-add-row,
      .codex-editor .tc-add-column {
        background-color: #4b5563 !important;
      }
      .codex-editor .tc-add-column:hover,
      .codex-editor .tc-add-row:hover {
        background-color: #6b7280 !important;
      }
      
      /* Better link styling */
      .codex-editor a {
        color: #60a5fa;
        text-decoration: underline;
      }
      
      /* Better spacing for blocks */
      .codex-editor .ce-block {
        margin-bottom: 0.5em;
      }
      
      /* Style for code blocks if used */
      .codex-editor .ce-code {
        background-color: #1e293b;
        padding: 1em;
        font-family: monospace;
        border-radius: 4px;
        margin: 1em 0;
      }
      
      /* Style for block placeholder text */
      .codex-editor [contentEditable=true][data-placeholder]::before {
        color: #64748b;
        font-style: italic;
      }
    `;
    document.head.appendChild(darkModeStyle);

    return () => {
      // Clean up when component unmounts
      document.getElementById('editor-dark-mode-style')?.remove();
    };
  }, []);

  // Initialize editor when current document changes
  useEffect(() => {
    if (!currentDocId || isLoading) return;

    // Destroy existing editor instance if it exists
    if (editorInstance.current) {
      editorInstance.current.destroy();
      editorInstance.current = null;
    }

    const currentDoc = documents.find(doc => doc.id === currentDocId);
    if (!currentDoc) return;

    // Initialize editor with the current document's content
    initializeEditor(currentDoc.content);
  }, [currentDocId, documents, isLoading]);

  const initializeEditor = (initialData: any = {}) => {
    if (editorInstance.current) return;

    editorInstance.current = new EditorJS({
      holder: 'editorjs',
      tools: {
        header: {
          class: Header,
          inlineToolbar: ['marker', 'link'],
          config: {
            placeholder: 'Enter a header',
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 3
          }
        },
        list: {
          class: List,
          inlineToolbar: true
        },
        paragraph: {
          class: Paragraph,
          inlineToolbar: true
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Enter a quote',
            captionPlaceholder: 'Quote\'s author'
          }
        },
        marker: {
          class: Marker,
          shortcut: 'CMD+SHIFT+M'
        },
        checklist: {
          class: Checklist,
          inlineToolbar: true
        },
        table: {
          class: Table,
          inlineToolbar: true,
        },
        openai: {
          class: OpenAITool,
        }
      },
      data: initialData,
      autofocus: true,
      placeholder: 'Let\'s write something awesome!',
    });
  };

  const saveDocuments = async (updatedDocs: Document[]) => {
    try {
      await storeService.saveDocuments(updatedDocs);
      setDocuments(updatedDocs);
    } catch (error) {
      console.error("Failed to save documents:", error);
    }
  };

  const createNewDocument = () => {
    if (!newDocName.trim()) return;
    
    const now = new Date().toISOString();
    
    const newDoc: Document = {
      id: Date.now().toString(),
      name: newDocName.trim(),
      content: {
        time: Date.now(),
        blocks: [
          {
            type: 'header',
            data: {
              text: newDocName.trim(),
              level: 1
            }
          },
          {
            type: 'paragraph',
            data: {
              text: 'Start writing...'
            }
          }
        ]
      },
      createdAt: now,
      updatedAt: now,
      projectId: activeProjectId
    };
    
    const updatedDocs = [...documents, newDoc];
    setDocuments(updatedDocs);
    setCurrentDocId(newDoc.id);
    setShowDocList(false);
    setIsCreatingDoc(false);
    setNewDocName('');
    
    // Wait for render, then initialize editor
    setTimeout(() => {
      initializeEditor(newDoc.content);
    }, 100);
  };

  // Add project
  const addProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      color: newProjectColor,
      createdAt: new Date().toISOString()
    };

    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    setIsCreatingProject(false);
    setNewProjectName('');
    setNewProjectColor(COLORS[0]);
  };

  // Delete project
  const deleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      alert('You must have at least one project');
      return;
    }

    if (confirm('Are you sure you want to delete this project and all its documents?')) {
      // Delete the project
      const updatedProjects = projects.filter(project => project.id !== projectId);
      setProjects(updatedProjects);
      
      // Set documents in this project to the default project
      const updatedDocs = documents.map(doc => 
        doc.projectId === projectId ? {...doc, projectId: 'default'} : doc
      );
      
      setDocuments(updatedDocs);
      
      // Switch to another project if the active project was deleted
      if (activeProjectId === projectId) {
        setActiveProjectId(updatedProjects[0]?.id || 'default');
      }
      
      setShowProjectActions(null);
    }
  };
  
  // Save current document
  const saveCurrentDocument = async () => {
    if (!currentDocId || !editorInstance.current) return;
    
    try {
      setIsSaving(true);
      
      // Get data from editor
      const editorData = await editorInstance.current.save();
      
      // Update document in state
      const updatedDocs = documents.map(doc => {
        if (doc.id === currentDocId) {
          return {
            ...doc,
            content: editorData,
            updatedAt: new Date().toISOString()
          };
        }
        return doc;
      });
      
      setDocuments(updatedDocs);
      console.log('Document saved.');
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      const updatedDocs = documents.filter(doc => doc.id !== docId);
      saveDocuments(updatedDocs);
      
      if (currentDocId === docId) {
        setCurrentDocId(updatedDocs.length > 0 ? updatedDocs[0].id : null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  const currentDocument = currentDocId && documents ? documents.find(doc => doc.id === currentDocId) : null;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Write</h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-400">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Write</h2>
        <div className="flex space-x-2">
          {currentDocId && (
            <button 
              onClick={saveCurrentDocument}
              className={`p-2 rounded-lg hover:bg-gray-700 flex items-center ${isSaving ? 'opacity-50' : ''}`}
              title="Save Document"
              disabled={isSaving}
            >
              <FiSave className="w-5 h-5 mr-1" />
              <span className="text-sm">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          )}
          <button 
            onClick={() => setShowDocList(!showDocList)}
            className={`p-2 rounded-lg hover:bg-gray-700 ${showDocList ? 'bg-gray-700' : ''}`}
            title="Toggle Document List"
          >
            <FiList className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {showDocList && (
          <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-white font-medium mb-2">Projects</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {projects.map(project => (
                  <div 
                    key={project.id}
                    className={`p-2 rounded flex items-center justify-between cursor-pointer ${
                      activeProjectId === project.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveProjectId(project.id)}
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <span className="text-white text-sm truncate">{project.name}</span>
                    </div>
                    <button
                      className="opacity-0 hover:opacity-100 p-1 rounded hover:bg-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProjectActions(project.id);
                      }}
                    >
                      <FiMoreVertical className="w-3 h-3 text-gray-400" />
                    </button>
                    
                    {showProjectActions === project.id && (
                      <div className="absolute z-10 right-0 mt-8 bg-gray-800 border border-gray-700 rounded shadow-lg">
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                        >
                          <FiTrash2 className="w-3 h-3 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setIsCreatingProject(true)}
                className="mt-2 w-full px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
              >
                <FiPlus className="w-3 h-3 mr-1" />
                New Project
              </button>
            </div>
            
            {isCreatingProject && (
              <div className="p-3 border-b border-gray-700">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project name"
                  autoFocus
                />
                <div className="flex mb-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`w-6 h-6 rounded-full mr-1 ${
                        newProjectColor === color ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreatingProject(false)}
                    className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addProject}
                    className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700"
                    disabled={!newProjectName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-white font-medium">Documents</h3>
              <button 
                onClick={() => setIsCreatingDoc(true)}
                className="p-1 rounded hover:bg-gray-700"
                title="New Document"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            
            {isCreatingDoc && (
              <div className="p-3 border-b border-gray-700">
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Document name"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreatingDoc(false)}
                    className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewDocument}
                    className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700"
                    disabled={!newDocName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto">
              {!filteredDocuments || filteredDocuments.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <FiFolder className="w-8 h-8 mx-auto mb-2" />
                  <p>No documents in this project</p>
                </div>
              ) : (
                filteredDocuments.map(doc => (
                  <div 
                    key={doc.id}
                    className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 group ${
                      currentDocId === doc.id ? 'bg-gray-700' : ''
                    }`}
                    onClick={() => setCurrentDocId(doc.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <FiFile className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-white font-medium truncate">
                          {doc.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-600 transition-opacity"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      Last edited: {formatDate(doc.updatedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {currentDocument ? (
            <>
              <div className="p-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium truncate">{currentDocument.name}</h3>
                  {isSaving && (
                    <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Last edited: {formatDate(currentDocument.updatedAt)}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-900 p-5">
                <div id="editorjs" className="prose max-w-none"></div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400">
              <div>
                <FiFile className="w-12 h-12 mx-auto mb-4" />
                <p>Select a document or create a new one</p>
                <button
                  onClick={() => setIsCreatingDoc(true)}
                  className="mt-4 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FiPlus className="w-4 h-4 mr-2 inline-block" />
                  New Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Writer; 