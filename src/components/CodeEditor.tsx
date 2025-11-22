import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Mission Code</h2>
        <span className="text-xs text-slate-400">
          Write commands for Nova the Explorer Rover
        </span>
      </div>
      <div className="flex-1 border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(value) => onChange(value ?? "")}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
