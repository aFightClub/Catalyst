import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiSave, FiTrash2, FiList, FiFolder, FiFile } from 'react-icons/fi';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import Marker from '@editorjs/marker';
import Checklist from '@editorjs/checklist';
import Table from '@editorjs/table';

interface Document {
  id: string;
  name: string;
  content: any;
  createdAt: string;
  updatedAt: string;
}

const Writer: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [showDocList, setShowDocList] = useState(true);
  const [newDocName, setNewDocName] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorInstance = useRef<any>(null);

  // Load documents from localStorage on component mount
  useEffect(() => {
    const savedDocs = localStorage.getItem('writer_docs');
    if (savedDocs) {
      try {
        const parsedDocs = JSON.parse(savedDocs);
        setDocuments(parsedDocs);
      } catch (e) {
        console.error('Failed to parse saved documents:', e);
      }
    }
  }, []);

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
      
      /* Specific header level styling */
      .codex-editor .ce-header[data-level="1"] {
        font-size: 2.5em;
        margin: 0.67em 0;
        border-bottom: 1px solid #374151;
        padding-bottom: 0.3em;
      }
      .codex-editor .ce-header[data-level="2"] {
        font-size: 2em;
        margin: 0.83em 0;
        border-bottom: 1px solid #374151;
        padding-bottom: 0.3em;
      }
      .codex-editor .ce-header[data-level="3"] {
        font-size: 1.5em;
        margin: 1em 0;
      }
      .codex-editor .ce-header[data-level="4"] {
        font-size: 1.25em;
        margin: 1.33em 0;
      }
      .codex-editor .ce-header[data-level="5"] {
        font-size: 1.1em;
        margin: 1.67em 0;
      }
      .codex-editor .ce-header[data-level="6"] {
        font-size: 1em;
        margin: 2.33em 0;
      }
      
      .codex-editor--narrow .ce-toolbar__plus,
      .codex-editor .ce-toolbar__plus,
      .codex-editor .ce-toolbar__settings-btn {
        background-color: #4b5563 !important;
        color: #e2e8f0 !important;
      }
      .codex-editor .ce-toolbar__plus:hover,
      .codex-editor .ce-toolbar__settings-btn:hover {
        background-color: #6b7280 !important;
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
    if (!currentDocId) return;

    // Destroy existing editor instance if it exists
    if (editorInstance.current) {
      editorInstance.current.destroy();
      editorInstance.current = null;
    }

    const currentDoc = documents.find(doc => doc.id === currentDocId);
    if (!currentDoc) return;

    // Initialize editor with the current document's content
    initializeEditor(currentDoc.content);
  }, [currentDocId, documents]);

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
        }
      },
      data: initialData,
      autofocus: true,
      placeholder: 'Let\'s write something awesome!',
    });
  };

  const saveDocuments = (updatedDocs: Document[]) => {
    localStorage.setItem('writer_docs', JSON.stringify(updatedDocs));
    setDocuments(updatedDocs);
  };

  const createNewDocument = () => {
    if (!newDocName.trim()) return;

    const now = new Date().toISOString();
    const newDoc: Document = {
      id: Date.now().toString(),
      name: newDocName.trim(),
      content: {
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
              text: 'Start writing here...'
            }
          }
        ]
      },
      createdAt: now,
      updatedAt: now
    };

    const updatedDocs = [...documents, newDoc];
    saveDocuments(updatedDocs);
    setCurrentDocId(newDoc.id);
    setNewDocName('');
    setIsCreatingDoc(false);
  };

  const saveCurrentDocument = async () => {
    if (!editorInstance.current || !currentDocId) return;

    setIsSaving(true);
    
    try {
      const savedData = await editorInstance.current.save();
      const now = new Date().toISOString();
      
      const updatedDocs = documents.map(doc => 
        doc.id === currentDocId
          ? { ...doc, content: savedData, updatedAt: now }
          : doc
      );
      
      saveDocuments(updatedDocs);
    } catch (error) {
      console.error('Failed to save document:', error);
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

  const currentDocument = currentDocId ? documents.find(doc => doc.id === currentDocId) : null;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Writer</h2>
        <div className="flex space-x-2">
          <button 
            onClick={saveCurrentDocument}
            className={`p-2 rounded-lg ${currentDocId ? 'hover:bg-blue-600 bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}
            disabled={!currentDocId || isSaving}
            title="Save Document"
          >
            <FiSave className="w-5 h-5" />
          </button>
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
              {documents.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <FiFolder className="w-8 h-8 mx-auto mb-2" />
                  <p>No documents yet</p>
                  <button
                    onClick={() => setIsCreatingDoc(true)}
                    className="mt-2 px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700"
                  >
                    Create your first document
                  </button>
                </div>
              ) : (
                documents.map(doc => (
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
                <h3 className="text-white font-medium truncate">{currentDocument.name}</h3>
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