import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Heading2, List, Plus, Save, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  fetchNotes,
  makeId,
  type BlockKind,
  type NoteBlock,
  type NotePage,
} from "@/lib/nexo-queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/anotacoes")({
  head: () => ({
    meta: [
      { title: "Anotações — Nexo" },
      { name: "description", content: "Suas páginas de anotações em blocos no Nexo." },
      { property: "og:title", content: "Anotações — Nexo" },
      { property: "og:description", content: "Crie e edite páginas de anotações sincronizadas na nuvem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({ queryKey: ["notes"], queryFn: fetchNotes });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<NoteBlock[]>([]);
  const [dirty, setDirty] = useState(false);

  const activeNote: NotePage | undefined =
    notes.find((n) => n.id === selectedId) ?? notes[0];

  useEffect(() => {
    if (!activeNote) {
      setSelectedId(null);
      setDraftTitle("");
      setDraftBlocks([]);
      setDirty(false);
      return;
    }
    if (activeNote.id !== selectedId) {
      setSelectedId(activeNote.id);
    }
    setDraftTitle(activeNote.title);
    setDraftBlocks(activeNote.blocks);
    setDirty(false);
  }, [activeNote?.id, activeNote?.updatedAt]);

  const createNote = useMutation({
    mutationFn: async () => {
      const initialBlocks: NoteBlock[] = [{ id: makeId("b"), kind: "text", text: "" }];
      const { data, error } = await supabase
        .from("notes")
        .insert({ title: "Nova anotação", blocks: initialBlocks as unknown as Json })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (newId) => {
      setSelectedId(newId);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Página criada.");
    },
    onError: () => toast.error("Não foi possível criar a anotação."),
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!activeNote) return;
      const cleanTitle = draftTitle.trim() || "Sem título";
      const { error } = await supabase
        .from("notes")
        .update({ title: cleanTitle, blocks: draftBlocks as unknown as Json })
        .eq("id", activeNote.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Anotação salva.");
    },
    onError: () => toast.error("Erro ao salvar anotação."),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Anotação excluída.");
    },
    onError: () => toast.error("Erro ao excluir anotação."),
  });

  const addBlock = (kind: BlockKind) => {
    const next: NoteBlock =
      kind === "todo"
        ? { id: makeId("b"), kind, text: "", checked: false }
        : { id: makeId("b"), kind, text: "" };
    setDraftBlocks((prev) => [...prev, next]);
    setDirty(true);
  };

  const updateBlock = (id: string, patch: Partial<NoteBlock>) => {
    setDraftBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setDirty(true);
  };

  const removeBlock = (id: string) => {
    setDraftBlocks((prev) => prev.filter((b) => b.id !== id));
    setDirty(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="page-title text-3xl font-medium">Anotações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize ideias, listas e checklists em páginas sincronizadas na nuvem.
          </p>
        </div>
        <Button type="button" onClick={() => createNote.mutate()} disabled={createNote.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova página
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Carregando anotações...</p>
      ) : notes.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Você ainda não criou nenhuma anotação.</p>
          <Button type="button" className="mt-4" onClick={() => createNote.mutate()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Criar primeira página
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="space-y-1">
            {notes.map((note) => {
              const selected = activeNote?.id === note.id;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate">{note.title}</span>
                  <span className="metric-num ml-2 shrink-0 text-[11px] opacity-70">
                    {note.updatedAt.slice(5)}
                  </span>
                </button>
              );
            })}
          </div>

          {activeNote && (
            <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <Input
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setDirty(true);
                  }}
                  aria-label="Título da página"
                  placeholder="Título da página"
                  className="page-title h-auto border-0 bg-transparent px-0 text-2xl font-medium shadow-none focus-visible:ring-0 sm:text-3xl"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveNote.mutate()}
                    disabled={saveNote.isPending || !dirty}
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    {saveNote.isPending ? "Salvando..." : dirty ? "Salvar" : "Salvo"}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir página"
                    onClick={() => deleteNote.mutate(activeNote.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {draftBlocks.map((block) => (
                  <div key={block.id} className="group flex items-start gap-2">
                    {block.kind === "todo" && (
                      <Checkbox
                        checked={Boolean(block.checked)}
                        onCheckedChange={(v) => updateBlock(block.id, { checked: Boolean(v) })}
                        className="mt-2.5"
                        aria-label="Marcar tarefa"
                      />
                    )}
                    {block.kind === "bullet" && (
                      <span className="mt-2 select-none text-muted-foreground">•</span>
                    )}
                    <Input
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      placeholder={
                        block.kind === "heading"
                          ? "Subtítulo..."
                          : block.kind === "todo"
                            ? "Tarefa..."
                            : "Escreva aqui..."
                      }
                      className={cn(
                        "h-auto flex-1 border-0 bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-1",
                        block.kind === "heading" && "page-title text-xl font-medium",
                        block.kind === "todo" && block.checked && "line-through text-muted-foreground",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      aria-label="Remover bloco"
                      className="mt-1.5 rounded p-1 text-muted-foreground opacity-60 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">Adicionar bloco:</span>
                <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("heading")}>
                  <Heading2 className="mr-1.5 h-3.5 w-3.5" />
                  Título
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("text")}>
                  <Type className="mr-1.5 h-3.5 w-3.5" />
                  Texto
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("todo")}>
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                  Checklist
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("bullet")}>
                  <List className="mr-1.5 h-3.5 w-3.5" />
                  Lista
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}