import Link from "next/link";
import { ShieldCheck, Timer, KeyRound, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";

const features = [
  { icon: Timer, title: "Time-based links", desc: "Set an expiry date and the link simply stops working after it." },
  { icon: ShieldCheck, title: "One-time links", desc: "The first person to open it wins — then the link self-destructs." },
  { icon: KeyRound, title: "Password protected", desc: "Auto-generated dynamic access keys, hashed and never stored in plain text." },
];

export default async function Home() {
  const session = await getSession();
  return (
    <div className="flex flex-col items-center text-center animate-fade-up">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 mb-6">
        <Sparkles className="h-3.5 w-3.5" /> Secure by design
      </span>
      <h1 className="max-w-2xl text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
        Share notes with <span className="text-gradient">links that expire</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground text-lg">
        Create a note, get an unguessable share link, and control exactly who sees it and for how long.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href={session ? "/notes/new" : "/register"}>
          <Button size="default" className="h-12 px-6 text-base">
            {session ? "Create a note" : "Get started free"} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        {!session && (
          <Link href="/login"><Button variant="outline" className="h-12 px-6 text-base">Login</Button></Link>
        )}
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3 w-full max-w-4xl">
        {features.map((f, i) => (
          <Card key={f.title} className="text-left transition-all hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 duration-200 animate-fade-up" >
            <CardContent className="pt-6" >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md shadow-indigo-500/25 mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
