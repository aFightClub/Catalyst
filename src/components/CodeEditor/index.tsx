import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'css' | 'jsx';
  placeholder?: string;
}

export default function CodeEditor({ 
  value, 
  onChange, 
  language = 'javascript',
  placeholder = 'Enter code here...'
}: CodeEditorProps) {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={code => highlight(code, languages[language], language)}
      padding={10}
      placeholder={placeholder}
      textareaClassName="code-editor-textarea"
      preClassName="code-editor-pre"
      style={{
        fontFamily: '"Fira code", "Fira Mono", monospace',
        fontSize: 14,
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: '0.5rem',
        overflow: 'auto',
        height: '100%',
        minHeight: '200px'
      }}
    />
  );
} 