"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ShareInfo { id: string; viewCount: number }
interface NoteInfo { id: string; title: string; createdAt: string; shares: ShareInfo[] }

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notes").then(r => r.json()).then(d => { setNotes(d.notes ?? []); setLoading(false); });
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const totalViews = (n: NoteInfo) => n.shares.reduce((a, s) => a + (s.viewCount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
        <Link href="/notes/new"><Button><Plus className="h-4 w-4" /> New note</Button></Link>
      </div>
      {notes.length === 0 && (
        <Card className="py-16 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><FileText className="h-6 w-6" /></span>
            <p className="text-muted-foreground">No notes yet. Create your first note!</p>
            <Link href="/notes/new"><Button variant="outline">Create a note</Button></Link>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map(n => (
          <Link key={n.id} href={`/notes/${n.id}`}>
            <Card className="h-full transition-all hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-200 duration-200 cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-clamp-2">{n.title}</h3>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><FileText className="h-4 w-4" /></span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{n.shares.length} link{n.shares.length === 1 ? "" : "s"}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {totalViews(n)} views</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
