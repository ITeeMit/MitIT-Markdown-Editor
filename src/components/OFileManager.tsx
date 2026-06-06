import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  FileText,
  Trash2,
  Search,
  Tag,
  MoreVertical,
  Upload,
  FileSpreadsheet,
  GitBranch,
  Workflow,
  Edit,
  Star,
  Clock,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  MoveRight,
  Download,
  Palette,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { MarkdownDocument, Project, PROJECT_COLORS, RECENT_DOCUMENT_LIMIT } from '@/types';
import { DatabaseService } from '@/database';
import { csvToMarkdownTable } from '@/utils/csvUtils';
import { downloadProjectAsJson, downloadProjectAsMarkdownZip } from '@/utils/projectExport';
import ProjectColorPicker from '@/components/ProjectColorPicker';
import { messageBox } from '@/utils/messageBox';

const DOC_DRAG_TYPE = 'application/x-mitit-doc-id';
type DropTargetId = string | 'uncategorized';

interface OFileManagerProps {
  className?: string;
  createWelcomeDocument?: () => void;
}

function formatDate(date: Date | string) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch {
    return 'Invalid Date';
  }
}

function matchesSearch(doc: MarkdownDocument, term: string) {
  if (!term.trim()) return true;
  const q = term.toLowerCase();
  return (
    doc.title?.toLowerCase().includes(q) ||
    doc.content?.toLowerCase().includes(q) ||
    doc.tags?.some((tag) => tag?.toLowerCase().includes(q))
  );
}

function getModeIcon(doc: MarkdownDocument) {
  switch (doc.mode) {
    case 'mermaid':
      return <GitBranch className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case 'plantuml':
      return <Workflow className="w-3.5 h-3.5 text-green-500 shrink-0" />;
    default:
      return <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
  }
}

const OFileManager: React.FC<OFileManagerProps> = ({ className = '' }) => {
  const {
    documents,
    currentDocument,
    createDocument,
    deleteDocument,
    setCurrentDocument,
    loadAllDocuments,
    setContent,
    currentMode,
    content,
  } = useEditorStore();

  const {
    projects,
    showStarred,
    showRecent,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    toggleStarredSection,
    toggleRecentSection,
    toggleProjectExpanded,
    isProjectExpanded,
    moveDocumentToProject,
    toggleDocumentStar,
  } = useProjectStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [createInProjectId, setCreateInProjectId] = useState<string | undefined>(undefined);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState<string>(PROJECT_COLORS[0]);
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<DropTargetId | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [moveDocId, setMoveDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const isSearching = searchTerm.trim().length > 0;

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const filteredDocuments = useMemo(
    () => documents.filter((doc) => matchesSearch(doc, searchTerm)),
    [documents, searchTerm]
  );

  const starredDocs = useMemo(
    () =>
      (isSearching ? filteredDocuments : documents)
        .filter((doc) => doc.isStarred)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [documents, filteredDocuments, isSearching]
  );

  const recentDocs = useMemo(
    () =>
      (isSearching ? filteredDocuments : documents)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, RECENT_DOCUMENT_LIMIT),
    [documents, filteredDocuments, isSearching]
  );

  const uncategorizedDocs = useMemo(
    () =>
      filteredDocuments
        .filter((doc) => !doc.folderId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [filteredDocuments]
  );

  const docsByProject = useMemo(() => {
    const map = new Map<string, MarkdownDocument[]>();
    for (const project of projects) {
      map.set(
        project.id,
        filteredDocuments
          .filter((doc) => doc.folderId === project.id)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    }
    return map;
  }, [projects, filteredDocuments]);

  const refreshLists = async () => {
    await loadAllDocuments();
    await loadProjects();
  };

  const handleDocumentSelect = (doc: MarkdownDocument) => {
    setCurrentDocument(doc);
    setSelectedDocId(null);
    setMoveDocId(null);
  };

  const handleRenameDocument = async (docId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await DatabaseService.updateDocument(docId, { title: newTitle.trim() });
      await refreshLists();
      setRenamingDocId(null);
      setRenameTitle('');
      setSelectedDocId(null);
    } catch (error) {
      console.error('Failed to rename document:', error);
      await messageBox.error('Failed to rename document');
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;
    try {
      await createDocument({
        title: newDocTitle.trim(),
        content: '# ' + newDocTitle.trim() + '\n\nStart writing here...',
        tags: [],
        mode: 'markdown',
        folderId: createInProjectId,
      });
      setNewDocTitle('');
      setIsCreatingDoc(false);
      setCreateInProjectId(undefined);
    } catch (error) {
      console.error('Failed to create document:', error);
      await messageBox.error('Failed to create document');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProject(newProjectName.trim(), newProjectColor);
      setNewProjectName('');
      setNewProjectColor(PROJECT_COLORS[(projects.length + 1) % PROJECT_COLORS.length]);
      setIsCreatingProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      await messageBox.error('Failed to create project');
    }
  };

  const handleProjectColorChange = async (projectId: string, color: string) => {
    try {
      await updateProject(projectId, { color });
      await refreshLists();
    } catch (error) {
      console.error('Failed to update project color:', error);
      await messageBox.error('Failed to update project color');
    }
  };

  const handleExportProject = async (project: Project, format: 'json' | 'zip') => {
    try {
      if (format === 'json') {
        downloadProjectAsJson(project, documents);
      } else {
        downloadProjectAsMarkdownZip(project, documents);
      }
    } catch (error) {
      console.error('Failed to export project:', error);
      await messageBox.error(error instanceof Error ? error.message : 'Failed to export project');
    }
  };

  const handleDocDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData(DOC_DRAG_TYPE, docId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingDocId(docId);
  };

  const handleDocDragEnd = () => {
    setDraggingDocId(null);
    setDropTargetId(null);
  };

  const handleDropZoneDragOver = (e: React.DragEvent, targetId: DropTargetId) => {
    if (!e.dataTransfer.types.includes(DOC_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(targetId);
  };

  const handleDropZoneDragLeave = (e: React.DragEvent, targetId: DropTargetId) => {
    if (!e.dataTransfer.types.includes(DOC_DRAG_TYPE)) return;
    if (dropTargetId === targetId) setDropTargetId(null);
  };

  const handleDropOnTarget = async (e: React.DragEvent, targetId: DropTargetId) => {
    if (!e.dataTransfer.types.includes(DOC_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    const docId = e.dataTransfer.getData(DOC_DRAG_TYPE);
    if (!docId) return;

    const projectId = targetId === 'uncategorized' ? undefined : targetId;
    const doc = documents.find((d) => d.id === docId);
    if (doc?.folderId === projectId) {
      handleDocDragEnd();
      return;
    }

    await handleMoveToProject(docId, projectId);
    handleDocDragEnd();
  };

  const isFileDragEvent = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('Files');

  const handleDeleteDocument = async (docId: string) => {
    const confirmed = await messageBox.confirm('ต้องการลบเอกสารนี้หรือไม่?', {
      title: 'ลบเอกสาร',
      type: 'warning',
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
    });
    if (!confirmed) return;

    try {
      await deleteDocument(docId);
      setSelectedDocId(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      await messageBox.error('Failed to delete document');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    const confirmed = await messageBox.confirm(
      `ลบโปรเจกต์ "${project.name}"?\nเอกสารจะย้ายไป Uncategorized`,
      {
        title: 'ลบโปรเจกต์',
        type: 'warning',
        confirmText: 'ลบ',
        cancelText: 'ยกเลิก',
      }
    );
    if (!confirmed) return;

    try {
      await deleteProject(project.id);
      await refreshLists();
    } catch (error) {
      console.error('Failed to delete project:', error);
      await messageBox.error('Failed to delete project');
    }
  };

  const handleToggleStar = async (docId: string) => {
    await toggleDocumentStar(docId);
    await refreshLists();
    setSelectedDocId(null);
  };

  const handleMoveToProject = async (docId: string, projectId: string | undefined) => {
    await moveDocumentToProject(docId, projectId);
    await refreshLists();
    setMoveDocId(null);
    setSelectedDocId(null);
  };

  const openCreateDoc = (projectId?: string) => {
    setCreateInProjectId(projectId);
    setIsCreatingDoc(true);
    setNewDocTitle('');
  };

  const handleFileUpload = (files: FileList | null, projectId?: string) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileContent = e.target?.result as string;
          const fileName = file.name.replace(/\.md$/, '');
          try {
            await createDocument({
              title: fileName,
              content: fileContent,
              tags: [],
              mode: 'markdown',
              folderId: projectId,
            });
          } catch (error) {
            console.error('Failed to upload document:', error);
            void messageBox.error(`Failed to upload ${file.name}`);
          }
        };
        reader.readAsText(file);
      } else {
        void messageBox.warning(`${file.name} is not a markdown file. Please upload .md files only.`);
      }
    });
  };

  const renderDocActions = (doc: MarkdownDocument) => (
    <>
      {selectedDocId === doc.id && (
        <div
          className="absolute right-0 top-7 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setRenamingDocId(doc.id);
              setRenameTitle(doc.title || 'Untitled Document');
              setSelectedDocId(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Rename
          </button>
          <button
            onClick={() => handleToggleStar(doc.id)}
            className="w-full px-3 py-2 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
          >
            <Star className={`w-4 h-4 ${doc.isStarred ? 'fill-current' : ''}`} />
            {doc.isStarred ? 'Unstar' : 'Star'}
          </button>
          <button
            onClick={() => setMoveDocId(moveDocId === doc.id ? null : doc.id)}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <MoveRight className="w-4 h-4" /> Move to...
          </button>
          {moveDocId === doc.id && (
            <div className="border-t border-gray-100 dark:border-gray-700 py-1 max-h-36 overflow-auto">
              <button
                onClick={() => handleMoveToProject(doc.id, undefined)}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Uncategorized
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleMoveToProject(doc.id, p.id)}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => handleDeleteDocument(doc.id)}
            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </>
  );

  const renderDocItem = (doc: MarkdownDocument, compact = false, draggable = true) => {
    const isActive = currentDocument?.id === doc.id;
    const project = doc.folderId ? projectMap.get(doc.folderId) : undefined;
    const isDragging = draggingDocId === doc.id;

    return (
      <div
        key={doc.id}
        draggable={draggable && !isSearching && renamingDocId !== doc.id}
        onDragStart={(e) => draggable && handleDocDragStart(e, doc.id)}
        onDragEnd={handleDocDragEnd}
        className={`relative group rounded-md cursor-pointer border transition-all duration-150 ${
          compact ? 'px-2 py-1.5 mb-0.5' : 'p-2.5 mb-1'
        } ${
          isDragging ? 'opacity-40 scale-[0.98]' : ''
        } ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/25 border-blue-200 dark:border-blue-700'
            : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        onClick={() => handleDocumentSelect(doc)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {getModeIcon(doc)}
          {renamingDocId === doc.id ? (
            <input
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameDocument(doc.id, renameTitle);
                if (e.key === 'Escape') {
                  setRenamingDocId(null);
                  setRenameTitle('');
                }
              }}
              onBlur={() => handleRenameDocument(doc.id, renameTitle)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-0.5 text-sm bg-white dark:bg-gray-700 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {doc.isStarred && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                )}
                <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                  {doc.title || 'Untitled Document'}
                </span>
              </div>
              {!compact && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDate(doc.updatedAt)}
                  {isSearching && project && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDocId(selectedDocId === doc.id ? null : doc.id);
              setMoveDocId(null);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
          >
            <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        {!compact && doc.tags && doc.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 ml-5 flex-wrap">
            <Tag className="w-3 h-3 text-gray-400" />
            {doc.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {tag}
              </span>
            ))}
          </div>
        )}
        {renderDocActions(doc)}
      </div>
    );
  };

  const renderSectionHeader = (
    icon: React.ReactNode,
    label: string,
    count: number,
    expanded: boolean,
    onToggle: () => void,
    action?: React.ReactNode
  ) => (
    <div className="flex items-center justify-between px-2 py-1.5 group">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {icon}
        <span>{label}</span>
        <span className="font-normal normal-case">({count})</span>
      </button>
      {action}
    </div>
  );

  const renderProjectNode = (project: Project) => {
    const projectDocs = docsByProject.get(project.id) || [];
    const expanded = isProjectExpanded(project.id);
    const isDropTarget = dropTargetId === project.id;

    return (
      <div key={project.id} className="mb-1">
        <div
          className={`flex items-center gap-1 px-1 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 group ${
            isDropTarget ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          onDragOver={(e) => handleDropZoneDragOver(e, project.id)}
          onDragLeave={(e) => handleDropZoneDragLeave(e, project.id)}
          onDrop={(e) => handleDropOnTarget(e, project.id)}
        >
          <button
            onClick={() => toggleProjectExpanded(project.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-4 h-4 shrink-0" style={{ color: project.color }} />
            ) : (
              <Folder className="w-4 h-4 shrink-0" style={{ color: project.color }} />
            )}
            <span className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
              {project.name}
            </span>
            <span className="text-xs text-gray-400 shrink-0">({projectDocs.length})</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setColorPickerProjectId(colorPickerProjectId === project.id ? null : project.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Change color"
          >
            <Palette className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={() => openCreateDoc(project.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="New document in project"
          >
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={() => handleExportProject(project, 'json')}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Export project (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={() => handleDeleteProject(project)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
        {colorPickerProjectId === project.id && (
          <div className="ml-6 mt-1 mb-1 p-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">Project color</p>
            <ProjectColorPicker
              value={project.color}
              onChange={(color) => handleProjectColorChange(project.id, color)}
            />
            {projectDocs.length > 0 && (
              <button
                onClick={() => handleExportProject(project, 'zip')}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Export as .md ZIP
              </button>
            )}
          </div>
        )}
        {expanded && (
          <div
            className={`ml-4 border-l pl-1 ${
              isDropTarget ? 'border-blue-400' : 'border-gray-200 dark:border-gray-700'
            }`}
            onDragOver={(e) => handleDropZoneDragOver(e, project.id)}
            onDrop={(e) => handleDropOnTarget(e, project.id)}
          >
            {projectDocs.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-2">Drop documents here</p>
            ) : (
              projectDocs.map((doc) => renderDocItem(doc, true))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 relative ${isFileDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${className}`}
      onDragOver={(e) => {
        if (isFileDragEvent(e)) {
          e.preventDefault();
          setIsFileDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (isFileDragEvent(e)) {
          e.preventDefault();
          setIsFileDragOver(false);
        }
      }}
      onDrop={(e) => {
        if (isFileDragEvent(e)) {
          e.preventDefault();
          setIsFileDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }
      }}
    >
      {/* Header actions */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={async () => {
              if (currentMode !== 'markdown') {
                await messageBox.warning('กรุณาเปลี่ยนไปที่โหมด Markdown ก่อนนำเข้า CSV');
                return;
              }
              csvInputRef.current?.click();
            }}
            className="flex items-center gap-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg"
            title="Import CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            onClick={() => openCreateDoc(undefined)}
            className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".md,.markdown,text/markdown" multiple onChange={(e) => { handleFileUpload(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="hidden" />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (currentMode !== 'markdown') {
            await messageBox.warning('กรุณาเปลี่ยนไปที่โหมด Markdown ก่อนนำเข้า CSV');
            e.currentTarget.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            void (async () => {
              try {
                const text = String(reader.result || '');
                const table = csvToMarkdownTable(text, { title: file.name });
                const prefix = content?.trim() ? '\n\n' : '';
                setContent(`${content || ''}${prefix}${table}`);
                await messageBox.success('นำเข้า CSV สำเร็จ');
              } catch {
                await messageBox.error('เกิดข้อผิดพลาดในการนำเข้า CSV');
              } finally {
                e.currentTarget.value = '';
              }
            })();
          };
          reader.readAsText(file);
        }}
        className="hidden"
      />

      {/* Create project form */}
      {isCreatingProject && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-violet-50 dark:bg-violet-900/20">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-2">New Project</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="flex-1 px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') { setIsCreatingProject(false); setNewProjectName(''); }
              }}
              autoFocus
            />
            <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="px-2 py-1.5 bg-violet-500 text-white text-sm rounded-lg disabled:opacity-50">Add</button>
            <button onClick={() => { setIsCreatingProject(false); setNewProjectName(''); }} className="px-2 py-1.5 bg-gray-400 text-white text-sm rounded-lg">Cancel</button>
          </div>
          <ProjectColorPicker value={newProjectColor} onChange={setNewProjectColor} />
        </div>
      )}

      {/* Create document form */}
      {isCreatingDoc && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
            New Document
            {createInProjectId && projectMap.get(createInProjectId) && (
              <span> in {projectMap.get(createInProjectId)!.name}</span>
            )}
            {!createInProjectId && <span> (Uncategorized)</span>}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document title..."
              className="flex-1 px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateDocument();
                if (e.key === 'Escape') { setIsCreatingDoc(false); setNewDocTitle(''); }
              }}
              autoFocus
            />
            <button onClick={handleCreateDocument} disabled={!newDocTitle.trim()} className="px-2 py-1.5 bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50">Create</button>
            <button onClick={() => { setIsCreatingDoc(false); setNewDocTitle(''); }} className="px-2 py-1.5 bg-gray-400 text-white text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {isFileDragOver && (
        <div className="absolute inset-0 z-10 bg-blue-100/80 dark:bg-blue-900/40 border-2 border-dashed border-blue-400 flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload className="w-10 h-10 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Drop markdown files here</p>
          </div>
        </div>
      )}

      {/* Document tree */}
      <div className="flex-1 overflow-auto p-2" onClick={() => { setSelectedDocId(null); setMoveDocId(null); }}>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No documents yet</p>
            <button onClick={() => openCreateDoc(undefined)} className="mt-2 text-sm text-blue-500 hover:underline">Create your first document</button>
          </div>
        ) : isSearching && filteredDocuments.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">No documents found</div>
        ) : isSearching ? (
          <div>{filteredDocuments.map((doc) => renderDocItem(doc))}</div>
        ) : (
          <>
            {/* Starred */}
            {starredDocs.length > 0 && (
              <section className="mb-3">
                {renderSectionHeader(
                  <Star className="w-3.5 h-3.5 text-amber-400" />,
                  'Starred',
                  starredDocs.length,
                  showStarred,
                  toggleStarredSection
                )}
                {showStarred && starredDocs.map((doc) => renderDocItem(doc, true))}
              </section>
            )}

            {/* Recent */}
            {recentDocs.length > 0 && (
              <section className="mb-3">
                {renderSectionHeader(
                  <Clock className="w-3.5 h-3.5" />,
                  'Recent',
                  recentDocs.length,
                  showRecent,
                  toggleRecentSection
                )}
                {showRecent && recentDocs.map((doc) => renderDocItem(doc, true))}
              </section>
            )}

            {/* Projects */}
            <section className="mb-3">
              {renderSectionHeader(
                <Folder className="w-3.5 h-3.5" />,
                'Projects',
                projects.length,
                true,
                () => {},
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="New project"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
              {projects.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-1">No projects — click + to create one</p>
              ) : (
                projects.map(renderProjectNode)
              )}
            </section>

            {/* Uncategorized */}
            {uncategorizedDocs.length > 0 && (
              <section
                className={`rounded-md ${dropTargetId === 'uncategorized' ? 'ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                onDragOver={(e) => handleDropZoneDragOver(e, 'uncategorized')}
                onDragLeave={(e) => handleDropZoneDragLeave(e, 'uncategorized')}
                onDrop={(e) => handleDropOnTarget(e, 'uncategorized')}
              >
                {renderSectionHeader(
                  <FileText className="w-3.5 h-3.5" />,
                  'Uncategorized',
                  uncategorizedDocs.length,
                  true,
                  () => {}
                )}
                {uncategorizedDocs.map((doc) => renderDocItem(doc, true))}
              </section>
            )}
            {uncategorizedDocs.length === 0 && draggingDocId && (
              <section
                className={`rounded-md p-2 mb-2 border border-dashed ${
                  dropTargetId === 'uncategorized'
                    ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onDragOver={(e) => handleDropZoneDragOver(e, 'uncategorized')}
                onDragLeave={(e) => handleDropZoneDragLeave(e, 'uncategorized')}
                onDrop={(e) => handleDropOnTarget(e, 'uncategorized')}
              >
                <p className="text-xs text-gray-500 text-center py-2">Drop here for Uncategorized</p>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500">
        {documents.length} doc{documents.length !== 1 ? 's' : ''} · {projects.length} project{projects.length !== 1 ? 's' : ''}
        {isSearching && <span> · {filteredDocuments.length} matched</span>}
      </div>
    </div>
  );
};

export default OFileManager;
