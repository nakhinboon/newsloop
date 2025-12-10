'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const editorRef = useRef<unknown>(null);

  const handleEditorChange = (newContent: string) => {
    onChange(newContent);
  };

  return (
    <div className={cn('rounded-lg border bg-background', className)}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 border-b p-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'edit' | 'preview')}>
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="h-7 px-2">
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-7 px-2">
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Editor Content */}
      {mode === 'edit' ? (
        <Editor
          apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
          onInit={(_evt, editor) => {
            editorRef.current = editor;
          }}
          value={content}
          onEditorChange={handleEditorChange}
          init={{
            height: 400,
            menubar: false,
            placeholder,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount',
              'codesample'
            ],
            toolbar: 'undo redo | blocks | ' +
              'bold italic strikethrough | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'link image codesample | removeformat | help',
            content_style: `
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; 
                font-size: 14px;
                line-height: 1.6;
              }
              pre[class*="language-"] {
                background: #1e1e1e;
                border-radius: 8px;
                padding: 16px;
              }
            `,
            codesample_languages: [
              { text: 'HTML/XML', value: 'markup' },
              { text: 'JavaScript', value: 'javascript' },
              { text: 'TypeScript', value: 'typescript' },
              { text: 'CSS', value: 'css' },
              { text: 'PHP', value: 'php' },
              { text: 'Python', value: 'python' },
              { text: 'Java', value: 'java' },
              { text: 'C', value: 'c' },
              { text: 'C++', value: 'cpp' },
              { text: 'C#', value: 'csharp' },
              { text: 'Ruby', value: 'ruby' },
              { text: 'Go', value: 'go' },
              { text: 'Rust', value: 'rust' },
              { text: 'SQL', value: 'sql' },
              { text: 'Bash', value: 'bash' },
              { text: 'JSON', value: 'json' },
              { text: 'YAML', value: 'yaml' },
            ],
            image_advtab: true,
            link_default_target: '_blank',
            skin: 'oxide-dark',
            content_css: 'dark',
          }}
        />
      ) : (
        <div
          className="prose prose-sm dark:prose-invert max-w-none min-h-[400px] p-4"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}

export default RichTextEditor;
