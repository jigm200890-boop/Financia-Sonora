import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  ChevronRight,
  Download,
  File as FileIcon,
  FileText,
  FolderClosed,
  FolderPlus,
  Grid2X2,
  Globe2,
  History,
  Layers,
  List,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  getSignedUrl,
  useCreateFolder,
  useDeleteFolder,
  useDeleteItem,
  useFolders,
  useKnowledgeItems,
  useKnowledgeVersions,
  useRenameFolder,
  useRestoreVersion,
  useSaveDocument,
  useUploadKnowledgeFile,
  useWorlds,
} from "@/hooks/use-portal-data";
import { PageHeader } from "@/components/portal/layout-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, formatDateTime } from "@/lib/portal-ui";
import type { FolderRow, KnowledgeItemRow } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

const ALL = "all";
const ROOT = "root";

function buildPath(folders: FolderRow[], folderId: string): FolderRow[] {
  const path: FolderRow[] = [];
  let current = folders.find((folder) => folder.id === folderId);
  let guard = 0;
  while (current && guard < 20) {
    path.unshift(current);
    current = current.parent_id
      ? folders.find((folder) => folder.id === current?.parent_id)
      : undefined;
    guard += 1;
  }
  return path;
}

export default function Conocimiento() {
  const { canEdit } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: worlds } = useWorlds();
  const { data: folders, isLoading: foldersLoading } = useFolders();
  const { data: items, isLoading: itemsLoading } = useKnowledgeItems();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const saveDocument = useSaveDocument();
  const deleteItem = useDeleteItem();
  const uploadFile = useUploadKnowledgeFile();
  const fileInput = useRef<HTMLInputElement>(null);

  const [selectedWorld, setSelectedWorld] = useState<string>(
    searchParams.get("world") ?? ALL,
  );
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [folderDialog, setFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItemRow | null>(null);
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docTags, setDocTags] = useState("");
  const [preview, setPreview] = useState<KnowledgeItemRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<KnowledgeItemRow | null>(null);
  const { data: versions } = useKnowledgeVersions(historyItem?.id);
  const restoreVersion = useRestoreVersion();

  const currentWorld = useMemo(
    () => (worlds ?? []).find((world) => world.id === selectedWorld) ?? null,
    [worlds, selectedWorld],
  );

  const scopedFolders = useMemo(
    () =>
      (folders ?? []).filter((folder) =>
        selectedWorld === ALL ? true : folder.world_id === selectedWorld,
      ),
    [folders, selectedWorld],
  );

  useEffect(() => {
    setSelectedFolder(ALL);
  }, [selectedWorld]);

  const currentFolder = useMemo(
    () => (folders ?? []).find((folder) => folder.id === selectedFolder) ?? null,
    [folders, selectedFolder],
  );

  const worldForNewContent = useMemo(
    () =>
      currentFolder?.world_id ??
      (selectedWorld === ALL ? null : selectedWorld),
    [currentFolder, selectedWorld],
  );

  const path = useMemo(() => {
    if (selectedFolder === ALL || selectedFolder === ROOT) return [];
    return buildPath(folders ?? [], selectedFolder);
  }, [folders, selectedFolder]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      const inWorld = selectedWorld === ALL ? true : item.world_id === selectedWorld;
      const inFolder =
        selectedFolder === ALL
          ? true
          : selectedFolder === ROOT
            ? item.folder_id === null
            : item.folder_id === selectedFolder;
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.content ?? "").toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term));
      return inWorld && inFolder && matchesTerm;
    });
  }, [items, search, selectedFolder, selectedWorld]);

  const worldName = (id: string | null) =>
    (worlds ?? []).find((world) => world.id === id)?.name ?? "Sin mundo";

  function countFor(folderId: string) {
    return (items ?? []).filter((item) => item.folder_id === folderId).length;
  }

  function openNewDocument() {
    setEditingItem(null);
    setDocName("");
    setDocContent("");
    setDocTags("");
    setEditorOpen(true);
  }

  function openDocument(item: KnowledgeItemRow) {
    if (item.kind === "file") {
      void openPreview(item);
      return;
    }
    setEditingItem(item);
    setDocName(item.name);
    setDocContent(item.content ?? "");
    setDocTags(item.tags.join(", "));
    setEditorOpen(true);
  }

  async function openPreview(item: KnowledgeItemRow) {
    setPreview(item);
    setPreviewUrl(null);
    if (item.kind === "file" && item.storage_path) {
      try {
        const url = await getSignedUrl(item.storage_path);
        setPreviewUrl(url);
      } catch {
        toast.error("No se pudo abrir el archivo.");
      }
    }
  }

  async function handleSaveDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!docName.trim()) return;
    try {
      await saveDocument.mutateAsync({
        id: editingItem?.id,
        name: docName.trim(),
        content: docContent,
        folderId:
          selectedFolder === ALL || selectedFolder === ROOT
            ? null
            : selectedFolder,
        worldId: editingItem?.world_id ?? worldForNewContent,
        tags: docTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      toast.success(editingItem ? "Documento actualizado" : "Documento creado");
      setEditorOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el documento.");
    }
  }

  async function handleCreateFolder(event: React.FormEvent) {
    event.preventDefault();
    if (!folderName.trim()) return;
    if (!worldForNewContent) {
      toast.warning("Elige un mundo antes de crear una carpeta.");
      return;
    }
    try {
      const id = await createFolder.mutateAsync({
        name: folderName.trim(),
        parentId: selectedFolder === ALL || selectedFolder === ROOT ? null : selectedFolder,
        worldId: worldForNewContent,
      });
      setFolderName("");
      setFolderDialog(false);
      setSelectedFolder(id);
      toast.success("Carpeta creada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la carpeta.");
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const folderId = selectedFolder === ALL || selectedFolder === ROOT ? null : selectedFolder;
    if (!worldForNewContent) {
      toast.warning("Elige un mundo antes de subir archivos.");
      return;
    }
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} supera los 20 MB permitidos.`);
          continue;
        }
        await uploadFile.mutateAsync({ file, folderId, worldId: worldForNewContent });
      }
      toast.success("Archivo subido al conocimiento");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const breadcrumbLabel =
    selectedFolder === ALL
      ? currentWorld
        ? "Todo el mundo"
        : "Todos los mundos"
      : selectedFolder === ROOT
        ? "Sin familia"
        : null;

  return (
    <div>
      <PageHeader
        title="Conocimiento"
        description="Mundos independientes, con sus familias, escenarios y expedientes. El mundo personal no se mezcla con los empresariales."
      >
        {canEdit ? (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files)}
            />
            <Button
              variant="outlineMuted"
              onClick={() => fileInput.current?.click()}
              disabled={uploadFile.isPending || !worldForNewContent}
              title={worldForNewContent ? undefined : "Elige un mundo primero"}
            >
              {uploadFile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Subir archivo
            </Button>
            <Button
              variant="outlineMuted"
              onClick={() => setFolderDialog(true)}
              disabled={!worldForNewContent}
              title={worldForNewContent ? undefined : "Elige un mundo primero"}
            >
              <FolderPlus className="h-4 w-4" />
              Nueva carpeta
            </Button>
            <Button
              onClick={openNewDocument}
              disabled={!worldForNewContent}
              title={worldForNewContent ? undefined : "Elige un mundo primero"}
            >
              <Plus className="h-4 w-4" />
              Nuevo documento
            </Button>
          </>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="panel h-fit p-2">
          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Mundos
          </p>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedWorld(ALL)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                selectedWorld === ALL
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Todos los mundos
              <span className="ml-auto text-[10px]">{(items ?? []).length}</span>
            </button>
            {(worlds ?? []).map((world) => {
              const active = selectedWorld === world.id;
              const count = (items ?? []).filter((item) => item.world_id === world.id).length;
              return (
                <button
                  key={world.id}
                  onClick={() => setSelectedWorld(world.id)}
                  title={world.description ?? undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {world.visibility === "owner" ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Globe2 className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate">{world.name}</span>
                  <span className="ml-auto shrink-0 text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-border/60 pt-2">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Familias y carpetas
            </p>

            {selectedWorld === ALL ? (
              <p className="px-2 py-3 text-[11px] leading-relaxed text-muted-foreground">
                Elige un mundo para ver sus familias, escenarios y expedientes.
              </p>
            ) : (
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedFolder(ALL)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    selectedFolder === ALL
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Todo el mundo
                  <span className="ml-auto text-[10px]">
                    {(items ?? []).filter((item) => item.world_id === selectedWorld).length}
                  </span>
                </button>
                <button
                  onClick={() => setSelectedFolder(ROOT)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    selectedFolder === ROOT
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <FolderClosed className="h-3.5 w-3.5" />
                  Sin familia
                  <span className="ml-auto text-[10px]">
                    {(items ?? []).filter(
                      (item) => !item.folder_id && item.world_id === selectedWorld,
                    ).length}
                  </span>
                </button>

                {foldersLoading ? (
                  <div className="space-y-1 px-1 py-1">
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                  </div>
                ) : null}

                <FolderTree
                  folders={scopedFolders}
                  parentId={null}
                  depth={0}
                  selectedId={selectedFolder}
                  onSelect={setSelectedFolder}
                  countFor={countFor}
                  canEdit={canEdit}
                  onRename={(folder) => {
                    const next = window.prompt("Nuevo nombre de la carpeta", folder.name);
                    if (next && next.trim()) {
                      void renameFolder
                        .mutateAsync({ id: folder.id, name: next.trim() })
                        .then(() => toast.success("Carpeta renombrada"))
                        .catch((error: unknown) =>
                          toast.error(
                            error instanceof Error ? error.message : "No se pudo renombrar.",
                          ),
                        );
                    }
                  }}
                  onDelete={(folder) => {
                    if (
                      window.confirm(
                        `¿Eliminar la carpeta "${folder.name}" con su contenido? Esta acción no se puede deshacer.`,
                      )
                    ) {
                      void deleteFolder
                        .mutateAsync(folder.id)
                        .then(() => {
                          setSelectedFolder(ALL);
                          toast.success("Carpeta eliminada");
                        })
                        .catch((error: unknown) =>
                          toast.error(
                            error instanceof Error ? error.message : "No se pudo eliminar.",
                          ),
                        );
                    }
                  }}
                />
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="panel mb-4 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-1 text-xs text-muted-foreground scrollbar-thin">
              <button
                onClick={() => {
                  setSelectedWorld(ALL);
                  setSelectedFolder(ALL);
                }}
                className="shrink-0 rounded px-1.5 py-0.5 hover:bg-muted/60 hover:text-foreground"
              >
                Conocimiento
              </button>
              {currentWorld ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  <span className="px-1.5 text-foreground">{currentWorld.name}</span>
                </span>
              ) : null}
              {path.map((folder) => (
                <span key={folder.id} className="flex shrink-0 items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className="rounded px-1.5 py-0.5 hover:bg-muted/60 hover:text-foreground"
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
              {breadcrumbLabel ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  <span className="px-1.5 text-foreground">{breadcrumbLabel}</span>
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar"
                  className="h-9 w-full pl-8 sm:w-[200px]"
                />
              </div>
              <div className="flex rounded-md border border-border p-0.5">
                <Button
                  variant={view === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView("grid")}
                  aria-label="Vista de cuadrícula"
                >
                  <Grid2X2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView("list")}
                  aria-label="Vista de lista"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {itemsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-[120px] rounded-lg" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-muted/50 text-muted-foreground">
                <FolderClosed className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-foreground">Esta carpeta está vacía</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Crea un documento, sube un archivo o guarda una respuesta desde la matriz de IA.
              </p>
              {canEdit ? (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outlineMuted" onClick={() => setFolderDialog(true)}>
                    <FolderPlus className="h-4 w-4" />
                    Nueva carpeta
                  </Button>
                  <Button size="sm" onClick={openNewDocument}>
                    <Plus className="h-4 w-4" />
                    Nuevo documento
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={cn(
                view === "grid"
                  ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  : "panel divide-y divide-border/60",
              )}
            >
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    view === "grid"
                      ? "panel group flex h-full flex-col p-4 transition-colors hover:border-primary/40"
                      : "flex items-center gap-3 px-4 py-3",
                  )}
                >
                  <button
                    onClick={() => void openDocument(item)}
                    className={cn(
                      "flex min-w-0 flex-1 items-start gap-3 text-left",
                      view === "list" && "items-center",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-md border",
                        item.kind === "document"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {item.kind === "document" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <FileIcon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {formatDateTime(item.updated_at)}
                        {item.size_bytes ? ` · ${formatBytes(item.size_bytes)}` : ""}
                        {item.tags.length > 0 ? ` · ${item.tags.join(", ")}` : ""}
                        {selectedWorld === ALL && item.world_id
                          ? ` · ${worldName(item.world_id)}`
                          : ""}
                      </span>
                      {view === "grid" && item.content ? (
                        <span className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/80">
                          {item.content.replace(/[#*`]/g, "").slice(0, 160)}
                        </span>
                      ) : null}
                    </span>
                  </button>

                  <div className={cn("flex items-center gap-1", view === "grid" && "mt-3 justify-end")}>
                    {item.kind === "file" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => void openPreview(item)}
                        aria-label="Abrir archivo"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => void openDocument(item)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            {item.kind === "document" ? "Abrir" : "Ver archivo"}
                          </DropdownMenuItem>
                          {item.kind === "document" ? (
                            <DropdownMenuItem onClick={() => setHistoryItem(item)}>
                              <History className="mr-2 h-3.5 w-3.5" />
                              Historial
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar "${item.name}"?`)) {
                                void deleteItem
                                  .mutateAsync({ id: item.id, storage_path: item.storage_path })
                                  .then(() => toast.success("Elemento eliminado"))
                                  .catch((error: unknown) =>
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : "No se pudo eliminar.",
                                    ),
                                  );
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
            <DialogDescription>
              {selectedFolder === ALL || selectedFolder === ROOT
                ? "Se creará en la raíz del conocimiento."
                : `Se creará dentro de "${currentFolder?.name ?? "la familia seleccionada"}".`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">Nombre</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Procedimientos"
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFolderDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Crear carpeta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar documento" : "Nuevo documento"}</DialogTitle>
            <DialogDescription>
              Texto con formato sencillo: usa # para títulos, - para listas y ** para negritas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDocument} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-name">Título</Label>
              <Input
                id="doc-name"
                value={docName}
                onChange={(event) => setDocName(event.target.value)}
                placeholder="Procedimiento de alta de cliente"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-content">Contenido</Label>
              <Textarea
                id="doc-content"
                value={docContent}
                onChange={(event) => setDocContent(event.target.value)}
                rows={12}
                className="font-mono text-[13px] leading-relaxed"
                placeholder="# Título&#10;&#10;Escribe aquí el procedimiento…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-tags">Etiquetas</Label>
              <Input
                id="doc-tags"
                value={docTags}
                onChange={(event) => setDocTags(event.target.value)}
                placeholder="crédito, operación"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveDocument.isPending}>
                {saveDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar documento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyItem} onOpenChange={(open) => !open && setHistoryItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">Historial de versiones</DialogTitle>
            <DialogDescription>
              {historyItem?.name} · se guarda una versión cada vez que cambia el contenido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(versions ?? []).map((version) => (
              <details
                key={version.id}
                className="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
              >
                <summary className="cursor-pointer text-xs font-medium text-foreground">
                  {formatDateTime(version.saved_at)}
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                    {version.name}
                  </span>
                </summary>
                <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground scrollbar-thin">
                  {version.content || "Documento vacío."}
                </pre>
                {canEdit ? (
                  <Button
                    size="xs"
                    variant="outlineMuted"
                    className="mt-2"
                    disabled={restoreVersion.isPending}
                    onClick={() =>
                      void restoreVersion
                        .mutateAsync({
                          item_id: version.item_id,
                          name: version.name,
                          content: version.content,
                          tags: version.tags,
                        })
                        .then(() => {
                          toast.success("Versión restaurada");
                          setHistoryItem(null);
                        })
                        .catch((error: unknown) =>
                          toast.error(
                            error instanceof Error ? error.message : "No se pudo restaurar.",
                          ),
                        )
                    }
                  >
                    Restaurar esta versión
                  </Button>
                ) : null}
              </details>
            ))}
            {(versions ?? []).length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                Todavía no hay versiones anteriores de este documento.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
            <DialogDescription>
              {preview?.size_bytes ? formatBytes(preview.size_bytes) : "Documento del portal"}
            </DialogDescription>
          </DialogHeader>
          {preview?.kind === "file" ? (
            <div className="space-y-3">
              {previewUrl ? (
                <Button asChild variant="success" size="sm">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    Abrir archivo
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Preparando el enlace seguro…</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                El enlace es temporal y solo funciona con tu sesión del portal.
              </p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-[13px] leading-relaxed text-foreground">
              {preview?.content || "Documento vacío."}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderTree({
  folders,
  parentId,
  depth,
  selectedId,
  onSelect,
  countFor,
  canEdit,
  onRename,
  onDelete,
}: {
  folders: FolderRow[];
  parentId: string | null;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
  countFor: (id: string) => number;
  canEdit: boolean;
  onRename: (folder: FolderRow) => void;
  onDelete: (folder: FolderRow) => void;
}) {
  const children = folders.filter((folder) => folder.parent_id === parentId);
  if (children.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {children.map((folder) => (
        <div key={folder.id}>
          <div
            className={cn(
              "group flex items-center gap-1 rounded-md pr-1 transition-colors",
              selectedId === folder.id ? "bg-primary/10" : "hover:bg-muted/60",
            )}
            style={{ paddingLeft: 4 + depth * 10 }}
          >
            <button
              onClick={() => onSelect(folder.id)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-xs",
                selectedId === folder.id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <FolderClosed className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{folder.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
                {countFor(folder.id)}
              </span>
            </button>
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">Acciones de carpeta</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onRename(folder)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Renombrar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(folder)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <FolderTree
            folders={folders}
            parentId={folder.id}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            countFor={countFor}
            canEdit={canEdit}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
