import React from 'react';

interface CodeEditorProps {
  code?: string;
  onChange?: (code: string) => void;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code = '', onChange, language = 'typescript' }) => {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 h-full">
      <textarea
        value={code}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-full h-full bg-gray-900 text-gray-300 font-mono p-2 focus:outline-none resize-none"
        placeholder="Enter your code here..."
      />
    </div>
  );
};

export default CodeEditor; 