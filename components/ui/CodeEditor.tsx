'use client';

// =============================================================================
// wpPanel by Breach Rabbit — CodeEditor Component
// =============================================================================
// Next.js 16.1 — Client Component
// IMPORTANT: This component should be lazy-loaded (Monaco ~2MB)
// Features: Monaco Editor wrapper, syntax highlighting, search/replace, format
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertCircle,
  Search,
  X,
  Download,
  Upload,
  Save,
  RotateCcw,
  Maximize2,
  Minimize2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type EditorTheme = 'dark' | 'light' | 'vs-dark' | 'vs-light';
export type EditorLanguage =
  | 'plaintext'
  | 'php'
  | 'javascript'
  | 'typescript'
  | 'css'
  | 'scss'
  | 'html'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'sql'
  | 'xml'
  | 'shell'
  | 'nginx'
  | 'apache'
  | 'ini'
  | 'properties';

export interface CodeEditorProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Editor value */
  value?: string;
  
  /** Default value (uncontrolled) */
  defaultValue?: string;
  
  /** On value change */
  onChange?: (value: string) => void;
  
  /** Editor language */
  language?: EditorLanguage;
  
  /** Editor theme */
  theme?: EditorTheme;
  
  /** Font size */
  fontSize?: number;
  
  /** Font family */
  fontFamily?: string;
  
  /** Minimum line count */
  minLines?: number;
  
  /** Maximum line count */
  fontSize?: number;
  
  /** Enable word wrap */
  wordWrap?: boolean;
  
  /** Show line numbers */
  lineNumbers?: boolean;
  
  /** Show minimap */
  minimap?: boolean;
  
  /** Read-only mode */
  readOnly?: boolean;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Save state */
  isSaving?: boolean;
  
  /** Has unsaved changes */
  isDirty?: boolean;
  
  /** Error message */
  error?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Show save button */
  showSaveButton?: boolean;
  
  /** Show download button */
  showDownloadButton?: boolean;
  
  /** Show upload button */
  showUploadButton?: boolean;
  
  /** Show format button */
  showFormatButton?: boolean;
  
  /** Show search button */
  showSearchButton?: boolean;
  
  /** Show fullscreen button */
  showFullscreenButton?: boolean;
  
  /** On save */
  onSave?: (value: string) => void | Promise<void>;
  
  /** On download */
  onDownload?: (value: string) => void;
  
  /** On upload */
  onUpload?: (file: File) => void;
  
  /** On format */
  onFormat?: (value: string) => string;
  
  /** On fullscreen toggle */
  onFullscreenToggle?: (fullscreen: boolean) => void;
  
  /** Fullscreen mode */
  fullscreen?: boolean;
  
  /** Auto-save interval (ms, 0 = disabled) */
  autoSaveInterval?: number;
  
  /** Custom className for editor container */
  editorClassName?: string;
  
  /** Height override */
  height?: number | string;
  
  /** File path (for language detection) */
  filePath?: string;
}

export interface CodeEditorSkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Show toolbar skeleton */
  showToolbar?: boolean;
  
  /** Height override */
  height?: number | string;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

/**
 * Language detection by file extension
 */
const LANGUAGE_BY_EXTENSION: Record<string, EditorLanguage> = {
  '.php': 'php',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.xml': 'xml',
  '.sh': 'shell',
  '.bash': 'shell',
  '.conf': 'nginx',
  '.nginx': 'nginx',
  '.htaccess': 'apache',
  '.ini': 'ini',
  '.env': 'properties',
  '.properties': 'properties',
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  minLines: 10,
  maxLines: 50,
  wordWrap: true,
  lineNumbers: true,
  minimap: false,
  readOnly: false,
  autoSaveInterval: 0,
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Detect language from file path
 */
function detectLanguage(filePath?: string): EditorLanguage {
  if (!filePath) return 'plaintext';
  
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return LANGUAGE_BY_EXTENSION[ext] || 'plaintext';
}

/**
 * Format file size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// 🏗️ CODE EDITOR COMPONENT
// =============================================================================

/**
 * CodeEditor Component — wpPanel by Breach Rabbit UI
 * 
 * Monaco Editor wrapper with consistent styling, lazy-loaded.
 * IMPORTANT: Use dynamic import to lazy-load this component:
 * 
 * @example
 * const CodeEditor = dynamic(() => import('@/components/ui/CodeEditor'), {
 *   loading: () => <CodeEditorSkeleton />,
 *   ssr: false,
 * });
 * 
 * <CodeEditor
 *   value={fileContent}
 *   language="php"
 *   onChange={setContent}
 *   onSave={handleSave}
 *   filePath="/var/www/site/wp-config.php"
 * />
 */
export const CodeEditor = React.forwardRef<HTMLDivElement, CodeEditorProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      language,
      theme = 'vs-dark',
      fontSize = DEFAULT_CONFIG.fontSize,
      fontFamily = DEFAULT_CONFIG.fontFamily,
      minLines = DEFAULT_CONFIG.minLines,
      maxLines = DEFAULT_CONFIG.maxLines,
      wordWrap = DEFAULT_CONFIG.wordWrap,
      lineNumbers = DEFAULT_CONFIG.lineNumbers,
      minimap = DEFAULT_CONFIG.minimap,
      readOnly = DEFAULT_CONFIG.readOnly,
      isLoading = false,
      isSaving = false,
      isDirty = false,
      error,
      placeholder = '// Start typing...',
      showSaveButton = true,
      showDownloadButton = true,
      showUploadButton = false,
      showFormatButton = true,
      showSearchButton = true,
      showFullscreenButton = true,
      onSave,
      onDownload,
      onUpload,
      onFormat,
      onFullscreenToggle,
      fullscreen = false,
      autoSaveInterval = DEFAULT_CONFIG.autoSaveInterval,
      editorClassName,
      height: heightOverride,
      filePath,
      ...props
    },
    ref
  ) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const monacoRef = React.useRef<any>(null);
    const editorInstanceRef = React.useRef<any>(null);
    const [editorTheme, setEditorTheme] = React.useState<EditorTheme>(theme);
    const [showSearchWidget, setShowSearchWidget] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [lineCount, setLineCount] = React.useState(0);
    const [cursorPosition, setCursorPosition] = React.useState({ line: 1, column: 1 });
    const [fileSize, setFileSize] = React.useState(0);
    
    const detectedLanguage = language || detectLanguage(filePath);
    const height = heightOverride || (fullscreen ? 'calc(100vh - 120px)' : '500px');

    // =============================================================================
    // 🔄 INITIALIZATION
    // =============================================================================

    // Initialize Monaco Editor
    React.useEffect(() => {
      let disposed = false;
      
      const initEditor = async () => {
        if (!editorRef.current || disposed) return;
        
        try {
          // Lazy load Monaco
          const monaco = await import('@monaco-editor/react');
          
          monacoRef.current = monaco;
          
          // Editor will be rendered by @monaco-editor/react
        } catch (error) {
          console.error('Failed to initialize Monaco Editor:', error);
        }
      };
      
      initEditor();
      
      return () => {
        disposed = true;
      };
    }, []);

    // Handle editor mount
    const handleEditorMount = React.useCallback((editor: any, monaco: any) => {
      editorInstanceRef.current = editor;
      
      // Track line count
      const updateModelStats = () => {
        const model = editor.getModel();
        if (model) {
          setLineCount(model.getLineCount());
          setFileSize(model.getValueLength());
        }
      };
      
      editor.onDidChangeModelContent(updateModelStats);
      updateModelStats();
      
      // Track cursor position
      editor.onDidChangeCursorPosition((e: any) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });
      
      // Auto-save interval
      if (autoSaveInterval > 0 && onChange) {
        let timeout: NodeJS.Timeout;
        editor.onDidChangeModelContent(() => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            onChange(editor.getValue());
          }, autoSaveInterval);
        });
      }
    }, [autoSaveInterval, onChange]);

    // Handle value changes
    const handleEditorChange = React.useCallback((newValue: string | undefined) => {
      onChange?.(newValue || '');
    }, [onChange]);

    // =============================================================================
    // 🔧 ACTIONS
    // =============================================================================

    const handleSave = async () => {
      if (!editorInstanceRef.current || !onSave) return;
      
      const value = editorInstanceRef.current.getValue();
      await onSave(value);
    };

    const handleDownload = () => {
      if (!editorInstanceRef.current || !onDownload) return;
      
      const value = editorInstanceRef.current.getValue();
      onDownload(value);
      
      // Also trigger browser download
      const blob = new Blob([value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath?.split('/').pop() || 'file.txt';
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpload) {
        onUpload(file);
      }
    };

    const handleFormat = () => {
      if (!editorInstanceRef.current || !onFormat) return;
      
      const value = editorInstanceRef.current.getValue();
      const formatted = onFormat(value);
      editorInstanceRef.current.setValue(formatted);
    };

    const handleSearch = () => {
      setShowSearchWidget(!showSearchWidget);
      if (editorInstanceRef.current && searchTerm) {
        // Monaco has built-in search, but we can trigger it
        editorInstanceRef.current.trigger('keyboard', 'actions.find');
      }
    };

    const handleFullscreen = () => {
      onFullscreenToggle?.(!fullscreen);
    };

    const handleUndo = () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.trigger('keyboard', 'undo');
      }
    };

    const handleRedo = () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.trigger('keyboard', 'redo');
      }
    };

    // =============================================================================
    // 🏗️ RENDER
    // =============================================================================

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex flex-col',
          'rounded-md',
          'border',
          'border-border',
          'bg-bg-surface',
          'overflow-hidden',
          
          // Custom className
          className
        )}
        style={{ height }}
        {...props}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-overlay">
          {/* Left Actions */}
          <div className="flex items-center gap-1">
            {/* Save */}
            {showSaveButton && onSave && (
              <button
                onClick={handleSave}
                disabled={isLoading || isSaving || !isDirty}
                className={cn(
                  'flex items-center gap-1.5',
                  'px-2.5 py-1.5',
                  'rounded-md',
                  'text-xs font-medium',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  isDirty
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-base',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                title={isDirty ? 'Save changes (Ctrl+S)' : 'No changes to save'}
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Save</span>
              </button>
            )}

            {/* Undo/Redo */}
            <button
              onClick={handleUndo}
              disabled={isLoading}
              className={cn(
                'flex items-center justify-center',
                'w-8 h-8',
                'rounded-md',
                'text-text-muted hover:text-text-primary hover:bg-bg-base',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={isLoading}
              className={cn(
                'flex items-center justify-center',
                'w-8 h-8',
                'rounded-md',
                'text-text-muted hover:text-text-primary hover:bg-bg-base',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Redo (Ctrl+Y)"
            >
              <RotateCcw className="w-4 h-4 rotate-180" />
            </button>

            {/* Format */}
            {showFormatButton && onFormat && (
              <button
                onClick={handleFormat}
                disabled={isLoading}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-base',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                title="Format document"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Search */}
            {showSearchButton && (
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-base',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  showSearchWidget && 'bg-bg-base text-text-primary'
                )}
                title="Search (Ctrl+F)"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Download */}
            {showDownloadButton && onDownload && (
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-base',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Upload */}
            {showUploadButton && onUpload && (
              <label
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-base',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  'cursor-pointer',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                title="Upload file"
              >
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={isLoading}
                  accept="*/*"
                />
              </label>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Dirty Indicator */}
            {isDirty && (
              <div className="flex items-center gap-1 text-xs text-warning">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="hidden sm:inline">Unsaved changes</span>
              </div>
            )}

            {/* Theme Selector */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-1',
                    'px-2 py-1.5',
                    'rounded-md',
                    'text-xs font-medium',
                    'text-text-secondary hover:text-text-primary hover:bg-bg-base',
                    'transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-accent'
                  )}
                  title="Change theme"
                >
                  <span className="hidden sm:inline">
                    {editorTheme === 'vs-dark' ? 'Dark' : editorTheme === 'vs-light' ? 'Light' : editorTheme}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={cn(
                    'z-50',
                    'min-w-[120px]',
                    'bg-bg-elevated',
                    'border border-border',
                    'rounded-md',
                    'shadow-elevated',
                    'p-1',
                    'animate-slide-up'
                  )}
                  sideOffset={8}
                >
                  <DropdownMenu.Item
                    className={cn(
                      'flex items-center gap-2',
                      'px-3 py-2',
                      'rounded-sm',
                      'text-sm',
                      'text-text-secondary',
                      'hover:bg-bg-overlay hover:text-text-primary',
                      'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                      'cursor-pointer'
                    )}
                    onClick={() => setEditorTheme('vs-dark')}
                  >
                    {editorTheme === 'vs-dark' && <CheckCircle className="w-4 h-4 text-accent" />}
                    Dark
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={cn(
                      'flex items-center gap-2',
                      'px-3 py-2',
                      'rounded-sm',
                      'text-sm',
                      'text-text-secondary',
                      'hover:bg-bg-overlay hover:text-text-primary',
                      'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                      'cursor-pointer'
                    )}
                    onClick={() => setEditorTheme('vs-light')}
                  >
                    {editorTheme === 'vs-light' && <CheckCircle className="w-4 h-4 text-accent" />}
                    Light
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Fullscreen */}
            {showFullscreenButton && onFullscreenToggle && (
              <button
                onClick={handleFullscreen}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-base',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {fullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Search Widget */}
        {showSearchWidget && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-overlay">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in file..."
              className={cn(
                'flex-1',
                'bg-transparent',
                'text-sm',
                'text-text-primary',
                'placeholder:text-text-muted',
                'focus:outline-none'
              )}
              autoFocus
            />
            <button
              onClick={() => setShowSearchWidget(false)}
              className={cn(
                'flex items-center justify-center',
                'w-6 h-6',
                'rounded',
                'text-text-muted hover:text-text-primary hover:bg-bg-base',
                'transition-colors'
              )}
              aria-label="Close search"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-error-subtle border-b border-error">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
            <p className="text-xs text-error">{error}</p>
          </div>
        )}

        {/* Editor Container */}
        <div className="flex-1 relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-secondary">Loading editor...</span>
              </div>
            </div>
          )}

          {/* Monaco Editor */}
          {monacoRef.current && (
            <monacoRef.current.default
              height="100%"
              language={detectedLanguage}
              theme={editorTheme}
              value={value}
              defaultValue={defaultValue}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-text-secondary">Loading Monaco...</span>
                  </div>
                </div>
              }
              options={{
                fontSize,
                fontFamily,
                minimap: { enabled: minimap },
                lineNumbers: lineNumbers ? 'on' : 'off',
                wordWrap: wordWrap ? 'on' : 'off',
                readOnly,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
                guidingBrackets: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                contextmenu: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'smart',
                tabSize: 2,
                detectIndentation: true,
                formatOnPaste: true,
                formatOnType: false,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoSurround: 'languageDefined',
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                matchBrackets: 'always',
                occurrencesHighlight: true,
                selectionHighlight: true,
                semanticHighlighting: true,
                linkedEditing: true,
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                },
              }}
              className={cn('absolute inset-0', editorClassName)}
            />
          )}

          {/* Placeholder when not loaded */}
          {!monacoRef.current && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-base">
              <p className="text-sm text-text-muted">{placeholder}</p>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-bg-overlay text-xs text-text-muted">
          <div className="flex items-center gap-3">
            {/* Language */}
            <span className="font-medium text-text-secondary">
              {detectedLanguage.toUpperCase()}
            </span>
            
            {/* Lines */}
            <span>
              Line {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            
            {/* Line Count */}
            <span>{lineCount} lines</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* File Size */}
            <span>{formatBytes(fileSize)}</span>
            
            {/* Encoding */}
            <span>UTF-8</span>
            
            {/* Line Ending */}
            <span>LF</span>
          </div>
        </div>
      </div>
    );
  }
);

// Set display name for debugging
CodeEditor.displayName = 'CodeEditor';

// =============================================================================
// 📦 CODE EDITOR SKELETON
// =============================================================================

/**
 * CodeEditorSkeleton — Loading placeholder for CodeEditor
 */
export const CodeEditorSkeleton = React.forwardRef<HTMLDivElement, CodeEditorSkeletonProps>(
  (
    {
      className,
      showToolbar = true,
      height: heightOverride,
      ...props
    },
    ref
  ) => {
    const height = heightOverride || '500px';

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          'rounded-md',
          'border border-border',
          'bg-bg-surface',
          'animate-shimmer',
          'overflow-hidden',
          className
        )}
        style={{ height }}
        {...props}
      >
        {/* Toolbar Skeleton */}
        {showToolbar && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-overlay">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        )}

        {/* Editor Area Skeleton */}
        <div className="flex-1 bg-bg-base p-4">
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-4 rounded" />
                <Skeleton
                  className="flex-1 h-4 rounded"
                  style={{ width: `${Math.random() * 40 + 60}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Status Bar Skeleton */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-bg-overlay">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
    );
  }
);

// Set display name for debugging
CodeEditorSkeleton.displayName = 'CodeEditorSkeleton';

// =============================================================================
// 📦 HELPER COMPONENTS
// =============================================================================

/**
 * Skeleton — Simple skeleton placeholder
 */
function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'animate-pulse',
        'bg-bg-overlay',
        'rounded-md',
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { CodeEditorProps, CodeEditorSkeletonProps, EditorTheme, EditorLanguage };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * // IMPORTANT: Lazy load this component!
 * import dynamic from 'next/dynamic';
 * 
 * const CodeEditor = dynamic(() => import('@/components/ui/CodeEditor'), {
 *   loading: () => <CodeEditorSkeleton />,
 *   ssr: false,
 * });
 * 
 * // Simple editor
 * <CodeEditor
 *   value={content}
 *   onChange={setContent}
 *   language="php"
 *   filePath="/var/www/site/wp-config.php"
 * />
 * 
 * // With save handler
 * <CodeEditor
 *   value={content}
 *   onChange={setContent}
 *   onSave={handleSave}
 *   isDirty={isDirty}
 *   isSaving={isSaving}
 *   showSaveButton
 * />
 * 
 * // Read-only mode
 * <CodeEditor
 *   value={content}
 *   readOnly
 *   showSaveButton={false}
 * />
 * 
 * // Fullscreen mode
 * const [fullscreen, setFullscreen] = useState(false);
 * 
 * <CodeEditor
 *   value={content}
 *   fullscreen={fullscreen}
 *   onFullscreenToggle={setFullscreen}
 *   height={fullscreen ? 'calc(100vh - 120px)' : '500px'}
 * />
 * 
 * // Auto-save
 * <CodeEditor
 *   value={content}
 *   onChange={setContent}
 *   autoSaveInterval={30000}  // 30 seconds
 * />
 * 
 * // In file manager
 * function FileEditor({ file }) {
 *   const [content, setContent] = useState('');
 *   const [isDirty, setIsDirty] = useState(false);
 *   
 *   useEffect(() => {
 *     fetch(`/api/files/read?path=${file.path}`)
 *       .then(res => res.text())
 *       .then(setContent);
 *   }, [file.path]);
 *   
 *   const handleSave = async (value) => {
 *     await fetch('/api/files/save', {
 *       method: 'PUT',
 *       headers: { 'Content-Type': 'text/plain' },
 *       body: value,
 *     });
 *     setIsDirty(false);
 *   };
 *   
 *   return (
 *     <CodeEditor
 *       value={content}
 *       onChange={(v) => { setContent(v); setIsDirty(true); }}
 *       onSave={handleSave}
 *       isDirty={isDirty}
 *       filePath={file.path}
 *       language={detectLanguage(file.path)}
 *     />
 *   );
 * }
 * 
 * // With format handler
 * <CodeEditor
 *   value={content}
 *   onFormat={(value) => {
 *     // Use prettier or similar
 *     return prettier.format(value, { parser: 'babel' });
 *   }}
 *   showFormatButton
 * />
 * 
 * // Custom height
 * <CodeEditor
 *   value={content}
 *   height="600px"
 * />
 * 
 * // Minimal mode (no toolbar)
 * <CodeEditor
 *   value={content}
 *   showSaveButton={false}
 *   showDownloadButton={false}
 *   showFormatButton={false}
 *   showSearchButton={false}
 *   showFullscreenButton={false}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * CodeEditor Design System — wpPanel by Breach Rabbit
 * 
 * IMPORTANT: This component uses Monaco Editor and should be lazy-loaded!
 * Add to initial bundle: NO (~2MB Monaco library)
 * Lazy load: YES (only on file editor pages)
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — toolbar
 * - bg-base:        #080808 (dark) / #f8f8f8 (light) — editor bg (Monaco theme)
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - accent:         #3b82f6 (Blue) — save button, focus
 * - warning:        #f59e0b (Yellow) — unsaved changes
 * - error:          #ef4444 (Red) — error state
 * 
 * Monaco Themes:
 * - vs-dark: Dark theme (default)
 * - vs-light: Light theme
 * - Custom themes can be registered via monaco.editor.defineTheme()
 * 
 * Sizing:
 * - Default height: 500px
 * - Fullscreen: calc(100vh - 120px)
 * - Toolbar: h-10 + padding
 * - Status bar: h-8
 * - Font: 14px default (configurable 10-24px)
 * 
 * Border Radius:
 * - Container: rounded-md (6px)
 * - Buttons: rounded-md (6px)
 * 
 * Transitions:
 * - Button hover: 150ms ease-out
 * - Toolbar actions: 150ms ease-out
 * - Theme switch: instant (Monaco)
 * 
 * Supported Languages:
 * - php, javascript, typescript, css, scss, html
 * - json, yaml, markdown, sql, xml
 * - shell, nginx, apache, ini, properties
 * - Auto-detected from file extension
 * 
 * Features:
 * - Syntax highlighting (100+ languages via Monaco)
 * - Auto-completion
 * - Bracket matching
 * - Code folding
 * - Search/Replace (Ctrl+F, Ctrl+H)
 * - Undo/Redo (Ctrl+Z, Ctrl+Y)
 * - Format document (Shift+Alt+F)
 * - Minimap (optional)
 * - Line numbers
 * - Word wrap
 * - Multiple cursors
 * - Snippets
 * - Emmet (for HTML/CSS)
 * 
 * Keyboard Shortcuts (Monaco defaults):
 * - Ctrl+S: Save
 * - Ctrl+Z: Undo
 * - Ctrl+Y: Redo
 * - Ctrl+F: Find
 * - Ctrl+H: Replace
 * - Ctrl+/: Toggle comment
 * - Shift+Alt+F: Format
 * - Ctrl+D: Select next occurrence
 * - Alt+Click: Multi-cursor
 * 
 * Accessibility:
 * - aria-label on action buttons
 * - Keyboard navigation (Tab through buttons)
 * - Focus visible rings
 * - Screen reader friendly status bar
 * 
 * Performance:
 * - LAZY LOAD REQUIRED (Monaco ~2MB)
 * - Web Worker for syntax highlighting
 * - Virtual scrolling for large files
 * - CSS-first styling (minimal JS)
 * - Tree-shaken Lucide icons
 * 
 * Dark/Light Theme:
 * - Monaco themes: vs-dark, vs-light
 * - Independent of panel theme
 * - Can be switched independently
 * 
 * Common Use Cases in wpPanel:
 * - File manager (edit config files, scripts)
 * - PHP file editing (wp-config.php, etc.)
 * - CSS/JS editing (theme files)
 * - JSON/YAML config editing
 * - SQL query editor
 * - Shell script editing
 * - Nginx/Apache config
 */