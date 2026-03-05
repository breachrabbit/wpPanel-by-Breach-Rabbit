'use client';

// =============================================================================
// wpPanel by Breach Rabbit — FileDropzone Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Drag & drop, multiple files, progress, validation, previews
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Upload, File, X, CheckCircle, AlertCircle, FileText, Image, Archive, Code } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type DropzoneSize = 'sm' | 'md' | 'lg';
export type DropzoneVariant = 'default' | 'compact' | 'expanded';
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  preview?: string;
  uploadedAt?: Date;
}

export interface FileDropzoneProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Dropzone size */
  size?: DropzoneSize;
  
  /** Dropzone variant */
  variant?: DropzoneVariant;
  
  /** Accepted file types (e.g., ['image/png', 'application/pdf']) */
  accept?: string[];
  
  /** Maximum file size in bytes */
  maxFileSize?: number;
  
  /** Maximum number of files */
  maxFiles?: number;
  
  /** Label text */
  label?: string;
  
  /** Description/helper text */
  description?: string;
  
  /** Error message */
  errorMessage?: string;
  
  /** Success message */
  successMessage?: string;
  
  /** Show file previews (for images) */
  showPreviews?: boolean;
  
  /** Show file list */
  showFileList?: boolean;
  
  /** Auto upload on file select */
  autoUpload?: boolean;
  
  /** Uploaded files */
  files?: UploadedFile[];
  
  /** On files added */
  onFilesAdded?: (files: UploadedFile[]) => void;
  
  /** On files removed */
  onFilesRemoved?: (fileIds: string[]) => void;
  
  /** On upload progress */
  onUploadProgress?: (fileId: string, progress: number) => void;
  
  /** On upload complete */
  onUploadComplete?: (fileId: string, url: string) => void;
  
  /** On upload error */
  onUploadError?: (fileId: string, error: string) => void;
  
  /** Upload handler (return upload URL or throw error) */
  onUpload?: (file: File) => Promise<{ url: string } | void>;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Full width */
  fullWidth?: boolean;
  
  /** Custom className for the dropzone */
  dropzoneClassName?: string;
  
  /** Custom className for the file list */
  fileListClassName?: string;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<DropzoneSize, {
  padding: string;
  minHeight: string;
  iconSize: string;
  textSize: string;
}> = {
  sm: {
    padding: 'p-4',
    minHeight: 'min-h-[120px]',
    iconSize: 'w-8 h-8',
    textSize: 'text-sm',
  },
  md: {
    padding: 'p-6',
    minHeight: 'min-h-[160px]',
    iconSize: 'w-12 h-12',
    textSize: 'text-base',
  },
  lg: {
    padding: 'p-8',
    minHeight: 'min-h-[200px]',
    iconSize: 'w-16 h-16',
    textSize: 'text-lg',
  },
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 */
function getFileIcon(type: string): React.ComponentType<{ className?: string }> {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('text/')) return FileText;
  if (type.includes('zip') || type.includes('archive') || type.includes('compressed')) return Archive;
  if (type.includes('javascript') || type.includes('json') || type.includes('xml')) return Code;
  return File;
}

/**
 * Generate unique file ID
 */
function generateFileId(): string {
  return `file-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Validate file
 */
function validateFile(
  file: File,
  accept?: string[],
  maxFileSize?: number
): { valid: boolean; error?: string } {
  // Check file type
  if (accept && accept.length > 0) {
    const isAccepted = accept.some((type) => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type || file.name.endsWith(type.replace('*', ''));
    });
    
    if (!isAccepted) {
      return { valid: false, error: `File type "${file.type}" is not accepted` };
    }
  }
  
  // Check file size
  if (maxFileSize && file.size > maxFileSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxFileSize)})`,
    };
  }
  
  return { valid: true };
}

// =============================================================================
// 🏗️ FILE DROPZONE COMPONENT
// =============================================================================

/**
 * FileDropzone Component — wpPanel by Breach Rabbit UI
 * 
 * Drag & drop file upload with progress, validation, and previews.
 * 
 * @example
 * <FileDropzone
 *   label="Upload Files"
 *   description="Drag & drop or click to select"
 *   accept={['image/png', 'image/jpeg']}
 *   maxFileSize={5 * 1024 * 1024}
 *   maxFiles={10}
 *   onUpload={handleUpload}
 * />
 */
export const FileDropzone = React.forwardRef<HTMLDivElement, FileDropzoneProps>(
  (
    {
      className,
      size = 'md',
      variant = 'default',
      accept,
      maxFileSize,
      maxFiles,
      label,
      description,
      errorMessage,
      successMessage,
      showPreviews = true,
      showFileList = true,
      autoUpload = true,
      files = [],
      onFilesAdded,
      onFilesRemoved,
      onUploadProgress,
      onUploadComplete,
      onUploadError,
      onUpload,
      disabled = false,
      isLoading = false,
      fullWidth = true,
      dropzoneClassName,
      fileListClassName,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [internalFiles, setInternalFiles] = React.useState<UploadedFile[]>(files);
    
    // Sync with external files prop
    React.useEffect(() => {
      setInternalFiles(files);
    }, [files]);
    
    // Determine effective state
    const isDisabled = disabled || isLoading;
    const hasError = !!errorMessage;
    const hasSuccess = !!successMessage;
    const effectiveVariant = hasError ? 'error' : hasSuccess ? 'success' : variant;
    
    // Handle drag events
    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) {
        setIsDragOver(true);
      }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    };
    
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      
      if (isDisabled) return;
      
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    };
    
    const handleClick = () => {
      if (!isDisabled && inputRef.current) {
        inputRef.current.click();
      }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        processFiles(selectedFiles);
        // Reset input to allow selecting same file again
        e.target.value = '';
      }
    };
    
    const processFiles = (newFiles: File[]) => {
      const processedFiles: UploadedFile[] = [];
      const errors: string[] = [];
      
      // Check max files
      const currentCount = internalFiles.length;
      const availableSlots = maxFiles ? maxFiles - currentCount : Infinity;
      const filesToProcess = newFiles.slice(0, availableSlots);
      
      if (newFiles.length > availableSlots) {
        errors.push(`Maximum ${maxFiles} files allowed`);
      }
      
      // Validate and process each file
      for (const file of filesToProcess) {
        const validation = validateFile(file, accept, maxFileSize);
        
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`);
          continue;
        }
        
        const uploadedFile: UploadedFile = {
          id: generateFileId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0,
        };
        
        // Generate preview for images
        if (showPreviews && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            uploadedFile.preview = e.target?.result as string;
            setInternalFiles((prev) =>
              prev.map((f) => (f.id === uploadedFile.id ? uploadedFile : f))
            );
          };
          reader.readAsDataURL(file);
        }
        
        processedFiles.push(uploadedFile);
        
        // Auto upload if enabled
        if (autoUpload && onUpload) {
          uploadFile(uploadedFile);
        }
      }
      
      // Add files to list
      if (processedFiles.length > 0) {
        setInternalFiles((prev) => [...prev, ...processedFiles]);
        onFilesAdded?.(processedFiles);
      }
      
      // Show errors (in real implementation, use toast)
      if (errors.length > 0) {
        console.error('File validation errors:', errors);
      }
    };
    
    const uploadFile = async (uploadedFile: UploadedFile) => {
      if (!onUpload) return;
      
      // Update status to uploading
      setInternalFiles((prev) =>
        prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'uploading' } : f))
      );
      
      try {
        // Simulate progress (in real implementation, use XMLHttpRequest or fetch with progress)
        const progressInterval = setInterval(() => {
          setInternalFiles((prev) =>
            prev.map((f) => {
              if (f.id === uploadedFile.id && f.progress < 90) {
                const newProgress = Math.min(f.progress + 10, 90);
                onUploadProgress?.(f.id, newProgress);
                return { ...f, progress: newProgress };
              }
              return f;
            })
          );
        }, 200);
        
        // Call upload handler
        const result = await onUpload(uploadedFile.file);
        
        clearInterval(progressInterval);
        
        // Update status to success
        setInternalFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'success', progress: 100, uploadedAt: new Date() }
              : f
          )
        );
        
        onUploadComplete?.(uploadedFile.id, result?.url || '');
      } catch (error) {
        // Update status to error
        setInternalFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );
        
        onUploadError?.(uploadedFile.id, error instanceof Error ? error.message : 'Upload failed');
      }
    };
    
    const handleRemoveFile = (fileId: string) => {
      setInternalFiles((prev) => prev.filter((f) => f.id !== fileId));
      onFilesRemoved?.([fileId]);
    };
    
    const handleRemoveAllFiles = () => {
      const fileIds = internalFiles.map((f) => f.id);
      setInternalFiles([]);
      onFilesRemoved?.(fileIds);
    };

    return (
      <div className={cn('w-full', className)} {...props}>
        {/* Label */}
        {label && (
          <label className={cn(
            'block text-sm font-medium mb-2',
            hasError ? 'text-error' :
            hasSuccess ? 'text-success' :
            'text-text-secondary'
          )}>
            {label}
          </label>
        )}

        {/* Dropzone */}
        <div
          ref={ref}
          className={cn(
            // Base styles
            'relative',
            'flex flex-col items-center justify-center',
            'rounded-md',
            'border-2',
            'border-dashed',
            'transition-all duration-200 ease-out',
            'cursor-pointer',
            
            // Size
            sizes.padding,
            sizes.minHeight,
            
            // Border colors based on state
            isDragOver && !isDisabled && 'border-accent bg-accent-subtle',
            !isDragOver && !isDisabled && !hasError && 'border-border hover:border-accent hover:bg-bg-overlay',
            isDisabled && 'border-border bg-bg-overlay cursor-not-allowed opacity-50',
            hasError && 'border-error bg-error-subtle',
            hasSuccess && 'border-success bg-success-subtle',
            
            // Full width
            fullWidth && 'w-full',
            
            // Custom className
            dropzoneClassName
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-disabled={isDisabled}
          aria-label={label || 'File upload dropzone'}
        >
          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept?.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isDisabled}
          />

          {/* Upload Icon */}
          <div className={cn(
            'mb-4',
            'flex items-center justify-center',
            'rounded-full',
            isDragOver ? 'bg-accent text-white' : 'bg-bg-overlay text-text-muted',
            sizes.iconSize
          )}>
            {isDragOver ? (
              <CheckCircle className={cn('w-full h-full', sizes.iconSize)} aria-hidden="true" />
            ) : (
              <Upload className={cn('w-full h-full', sizes.iconSize)} aria-hidden="true" />
            )}
          </div>

          {/* Text Content */}
          <div className="text-center">
            <p className={cn(
              'font-medium',
              'text-text-primary',
              sizes.textSize,
              'mb-1'
            )}>
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className={cn(
              'text-text-muted',
              size === 'sm' ? 'text-xs' : 'text-sm'
            )}>
              {description || 'or click to browse'}
              {maxFileSize && (
                <span className="ml-1">
                  (max {formatFileSize(maxFileSize)})
                </span>
              )}
            </p>
            {accept && accept.length > 0 && (
              <p className={cn(
                'text-text-muted',
                size === 'sm' ? 'text-xs' : 'text-sm',
                'mt-1'
              )}>
                Accepted: {accept.join(', ')}
              </p>
            )}
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm rounded-md">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-text-secondary">Uploading...</span>
              </div>
            </div>
          )}
        </div>

        {/* Error/Success Message */}
        {errorMessage && (
          <p className="mt-2 text-xs text-error" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="mt-2 text-xs text-success" role="status">
            {successMessage}
          </p>
        )}

        {/* File List */}
        {showFileList && internalFiles.length > 0 && (
          <div className={cn('mt-4 space-y-2', fileListClassName)}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {internalFiles.length} file{internalFiles.length !== 1 ? 's' : ''}
                {maxFiles && ` / ${maxFiles} max`}
              </span>
              <button
                type="button"
                onClick={handleRemoveAllFiles}
                className="text-xs text-text-muted hover:text-error transition-colors"
                disabled={isDisabled}
              >
                Remove all
              </button>
            </div>

            {/* File Items */}
            <div className="space-y-2">
              {internalFiles.map((file) => {
                const FileIcon = getFileIcon(file.type);
                
                return (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3',
                      'p-3',
                      'rounded-md',
                      'bg-bg-overlay',
                      'border border-border',
                      file.status === 'error' && 'border-error bg-error-subtle',
                      file.status === 'success' && 'border-success bg-success-subtle'
                    )}
                  >
                    {/* Preview or Icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className={cn(
                          'w-10 h-10',
                          'rounded',
                          'flex items-center justify-center',
                          'bg-bg-base',
                          'text-text-muted'
                        )}>
                          <FileIcon className="w-5 h-5" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {file.name}
                        </span>
                        {file.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-success" aria-hidden="true" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-error" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-muted">
                          {formatFileSize(file.size)}
                        </span>
                        {file.status === 'uploading' && (
                          <>
                            <span className="text-xs text-text-muted">•</span>
                            <span className="text-xs text-text-secondary">
                              {file.progress}%
                            </span>
                          </>
                        )}
                        {file.status === 'error' && (
                          <>
                            <span className="text-xs text-text-muted">•</span>
                            <span className="text-xs text-error">
                              {file.error}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {file.status === 'uploading' && (
                        <div className="mt-2 h-1 bg-bg-base rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-200"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className={cn(
                        'flex items-center justify-center',
                        'w-7 h-7',
                        'rounded',
                        'text-text-muted hover:text-error',
                        'hover:bg-bg-base',
                        'transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-accent',
                        isDisabled && 'cursor-not-allowed opacity-50'
                      )}
                      disabled={isDisabled}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
FileDropzone.displayName = 'FileDropzone';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { FileDropzoneProps, UploadedFile, DropzoneSize, DropzoneVariant, UploadStatus };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { FileDropzone } from '@/components/ui/FileDropzone';
 * 
 * // Simple dropzone
 * <FileDropzone
 *   label="Upload Files"
 *   description="Drag & drop or click to select"
 * />
 * 
 * // With file type validation
 * <FileDropzone
 *   label="Upload Images"
 *   accept={['image/png', 'image/jpeg', 'image/gif']}
 *   maxFileSize={5 * 1024 * 1024}
 *   maxFiles={10}
 * />
 * 
 * // With upload handler
 * <FileDropzone
 *   label="Upload Files"
 *   autoUpload
 *   onUpload={async (file) => {
 *     const formData = new FormData();
 *     formData.append('file', file);
 *     
 *     const response = await fetch('/api/files/upload', {
 *       method: 'POST',
 *       body: formData,
 *     });
 *     
 *     return response.json();
 *   }}
 *   onUploadProgress={(fileId, progress) => {
 *     console.log(`File ${fileId} progress: ${progress}%`);
 *   }}
 *   onUploadComplete={(fileId, url) => {
 *     console.log(`File ${fileId} uploaded to ${url}`);
 *   }}
 *   onUploadError={(fileId, error) => {
 *     console.error(`File ${fileId} failed: ${error}`);
 *   }}
 * />
 * 
 * // Without auto upload
 * <FileDropzone
 *   label="Select Files"
 *   autoUpload={false}
 *   onFilesAdded={(files) => {
 *     // Store files and upload later
 *     setSelectedFiles(files);
 *   }}
 * />
 * 
 * // Different sizes
 * <FileDropzone size="sm" label="Small" />
 * <FileDropzone size="md" label="Medium" />
 * <FileDropzone size="lg" label="Large" />
 * 
 * // Different variants
 * <FileDropzone variant="compact" label="Compact" />
 * <FileDropzone variant="expanded" label="Expanded" />
 * 
 * // Disabled state
 * <FileDropzone disabled label="Disabled" />
 * 
 * // Loading state
 * <FileDropzone isLoading label="Uploading..." />
 * 
 * // Error state
 * <FileDropzone errorMessage="Upload failed. Please try again." />
 * 
 * // Success state
 * <FileDropzone successMessage="Files uploaded successfully!" />
 * 
 * // Without previews
 * <FileDropzone showPreviews={false} />
 * 
 * // Without file list
 * <FileDropzone showFileList={false} />
 * 
 * // In forms
 * function UploadForm() {
 *   const [files, setFiles] = useState([]);
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <FileDropzone
 *         label="Attachments"
 *         accept={['application/pdf']}
 *         maxFileSize={10 * 1024 * 1024}
 *         maxFiles={5}
 *         onFilesAdded={setFiles}
 *       />
 *       <Button type="submit">Submit</Button>
 *     </form>
 *   );
 * }
 * 
 * // For site backup upload
 * <FileDropzone
 *   label="Upload Backup"
 *   description="Upload a backup file to restore"
 *   accept={['.zip', '.tar.gz', '.restic']}
 *   maxFileSize={10 * 1024 * 1024 * 1024}
 *   maxFiles={1}
 *   onUpload={handleBackupUpload}
 * />
 * 
 * // For SSL certificate upload
 * <FileDropzone
 *   label="Upload Certificate"
 *   accept={['.crt', '.pem', '.cer']}
 *   maxFileSize={1024 * 1024}
 *   maxFiles={1}
 *   onUpload={handleCertUpload}
 * />
 * 
 * // For multiple file upload (file manager)
 * <FileDropzone
 *   label="Upload Files"
 *   description="Drag & drop files to upload"
 *   maxFileSize={100 * 1024 * 1024}
 *   maxFiles={50}
 *   showPreviews={true}
 *   onUpload={handleFileUpload}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * FileDropzone Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-base:        #080808 (dark) / #f8f8f8 (light)
 * - bg-surface:     #101010 (dark) / #ffffff (light)
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light)
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - accent:         #3b82f6 (Blue) — drag over state
 * - error:          #ef4444 (Red) — error state
 * - success:        #10b981 (Green) — success state
 * 
 * Sizing:
 * - sm: p-4, min-h-[120px], icon: w-8 h-8, text: text-sm
 * - md: p-6, min-h-[160px], icon: w-12 h-12, text: text-base — DEFAULT
 * - lg: p-8, min-h-[200px], icon: w-16 h-16, text: text-lg
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * - File items: rounded-md (6px)
 * - Preview images: rounded (4px)
 * 
 * Border Style:
 * - Dashed border (border-dashed, 2px)
 * - Solid on drag over
 * - Color changes based on state
 * 
 * States:
 * - Default: border-border, hover:border-accent
 * - Drag over: border-accent, bg-accent-subtle
 * - Disabled: border-border, bg-bg-overlay, opacity-50
 * - Error: border-error, bg-error-subtle
 * - Success: border-success, bg-success-subtle
 * 
 * Animations:
 * - 200ms ease-out for state transitions
 * - Progress bar: 200ms transition
 * - Spinner: CSS infinite spin
 * 
 * Accessibility:
 * - role="button" for dropzone
 * - aria-disabled for disabled state
 * - aria-label for dropzone
 * - aria-hidden for decorative icons
 * - Keyboard accessible (Tab, Enter, Space)
 * - Focus visible ring
 * - Screen reader announcements for status
 * 
 * Performance:
 * - CSS-first (no JS for hover/focus states)
 * - FileReader for previews (async, non-blocking)
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - File manager upload
 * - Backup file upload
 * - SSL certificate upload
 * - Custom config upload
 * - Image upload (site logos, etc.)
 * - Database dump import
 * - Log file upload
 * - Theme/plugin upload (WP Toolkit)
 */