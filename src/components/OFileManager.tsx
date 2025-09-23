import React, { useState, useRef } from 'react';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Search,
  Calendar,
  Tag,
  MoreVertical,
  Upload,
  HelpCircle
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { MarkdownDocument } from '@/types';

interface OFileManagerProps {
  className?: string;
  createWelcomeDocument?: () => void;
}

const OFileManager: React.FC<OFileManagerProps> = ({ className = '', createWelcomeDocument }) => {
  const { 
    documents, 
    currentDocument, 
    createDocument, 
    deleteDocument, 
    setCurrentDocument 
  } = useEditorStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle document selection
  const handleDocumentSelect = (doc: MarkdownDocument) => {
    setCurrentDocument(doc);
    setSelectedDocId(null);
  };

  // Handle document creation
  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;
    
    try {
      await createDocument({
        FTMdcTitle: newDocTitle.trim(),
        FTMdcContent: '',
        FTMdcTags: [],
        FNMdcSize: 0,
        FBMdcFavorite: false,
        FDMdcCreated: new Date(),
        FDMdcModified: new Date(),
        // Legacy properties for compatibility
        title: newDocTitle.trim(),
        content: '',
        tags: []
      });
      setNewDocTitle('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('Failed to create document');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(docId);
        setSelectedDocId(null);
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Failed to delete document');
      }
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get document preview (first 100 characters)
  const getDocumentPreview = (content: string) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          const fileName = file.name.replace(/\.md$/, '');
          
          try {
            await createDocument({
              FTMdcTitle: fileName,
              FTMdcContent: content,
              FTMdcTags: [],
              FNMdcSize: content.length,
              FBMdcFavorite: false,
              FDMdcCreated: new Date(),
              FDMdcModified: new Date(),
              // Legacy properties for compatibility
              title: fileName,
              content: content,
              tags: []
            });
          } catch (error) {
            console.error('Failed to upload document:', error);
            alert(`Failed to upload ${file.name}`);
          }
        };
        reader.readAsText(file);
      } else {
        alert(`${file.name} is not a markdown file. Please upload .md files only.`);
      }
    });
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`
        flex flex-col h-full
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700
        ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''}
        ${className}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="
        p-4 border-b border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800
      ">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {createWelcomeDocument && (
              <button
                onClick={createWelcomeDocument}
                className="
                  flex items-center gap-1 px-3 py-1
                  bg-purple-500 hover:bg-purple-600
                  text-white text-sm rounded-lg
                  transition-colors duration-200
                "
                title="Show Welcome Document"
              >
                <HelpCircle className="w-4 h-4" />
                Help
              </button>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="
                flex items-center gap-1 px-3 py-1
                bg-green-500 hover:bg-green-600
                text-white text-sm rounded-lg
                transition-colors duration-200
              "
              title="Upload Markdown File"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            
            <button
              onClick={() => setIsCreating(true)}
              className="
                flex items-center gap-1 px-3 py-1
                bg-blue-500 hover:bg-blue-600
                text-white text-sm rounded-lg
                transition-colors duration-200
              "
              title="Create New Document"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="
              w-full pl-10 pr-4 py-2
              bg-white dark:bg-gray-700
              border border-gray-300 dark:border-gray-600
              rounded-lg text-sm
              text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          />
        </div>
      </div>

      {/* Create New Document Form */}
      {isCreating && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document title..."
              className="
                flex-1 px-3 py-2
                bg-white dark:bg-gray-700
                border border-gray-300 dark:border-gray-600
                rounded-lg text-sm
                text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateDocument();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewDocTitle('');
                }
              }}
              autoFocus
            />
            <button
              onClick={handleCreateDocument}
              disabled={!newDocTitle.trim()}
              className="
                px-3 py-2 bg-blue-500 hover:bg-blue-600
                text-white text-sm rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewDocTitle('');
              }}
              className="
                px-3 py-2 bg-gray-500 hover:bg-gray-600
                text-white text-sm rounded-lg
                transition-colors duration-200
              "
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="
          absolute inset-0 z-10
          bg-blue-100/80 dark:bg-blue-900/40
          border-2 border-dashed border-blue-400 dark:border-blue-500
          flex items-center justify-center
          backdrop-blur-sm
        ">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-blue-500 dark:text-blue-400" />
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              Drop markdown files here
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Supports .md and .`` files
            </p>
          </div>
        </div>
      )}
      
      {/* Documents List */}
      <div className="flex-1 overflow-auto relative">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">
              {searchTerm ? 'No documents found' : 'No documents yet'}
            </p>
            <p className="text-sm text-center mt-1">
              {searchTerm ? 'Try a different search term' : 'Create your first document to get started'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`
                  relative group p-3 mb-2 rounded-lg cursor-pointer
                  border transition-all duration-200
                  ${
                    currentDocument?.id === doc.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                onClick={() => handleDocumentSelect(doc)}
              >
                {/* Document Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="
                      font-medium text-gray-900 dark:text-gray-100
                      truncate text-sm
                    ">
                      {doc.title || 'Untitled Document'}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                  
                  {/* Actions Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocId(selectedDocId === doc.id ? null : doc.id);
                      }}
                      className="
                        opacity-0 group-hover:opacity-100
                        p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600
                        transition-all duration-200
                      "
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    
                    {selectedDocId === doc.id && (
                      <div className="
                        absolute right-0 top-8 z-10
                        bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        rounded-lg shadow-lg py-1 min-w-[120px]
                      ">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                          className="
                            w-full px-3 py-2 text-left text-sm
                            text-red-600 dark:text-red-400
                            hover:bg-red-50 dark:hover:bg-red-900/20
                            flex items-center gap-2
                          "
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Preview */}
                {doc.content && (
                  <p className="
                    text-xs text-gray-600 dark:text-gray-400
                    line-clamp-2 mb-2
                  ">
                    {getDocumentPreview(doc.content)}
                  </p>
                )}

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag className="w-3 h-3 text-gray-400" />
                    {doc.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="
                          px-2 py-1 rounded-full
                          bg-gray-200 dark:bg-gray-700
                          text-gray-700 dark:text-gray-300
                          text-xs
                        "
                      >
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{doc.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="
        p-3 border-t border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800
        text-xs text-gray-500 dark:text-gray-400
      ">
        {documents.length} document{documents.length !== 1 ? 's' : ''}
        {searchTerm && (
          <span> • {filteredDocuments.length} filtered</span>
        )}
      </div>
    </div>
  );
};

export default OFileManager;