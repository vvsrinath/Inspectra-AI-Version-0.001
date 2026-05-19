import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, GitCompare, LayoutDashboard, Upload, Sparkles } from "lucide-react";

export default function WorkspaceHome() {
  return (
    <div className="flex flex-col min-h-full">
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20 max-w-3xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Classical computer vision · Private workspace
        </div>

        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight mb-3">
          What would you like to analyze today?
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-10 max-w-lg">
          Upload fabric samples for lab-grade metrics, multi-sample comparison, and PDF reports—like a
          modern web app, running entirely in your browser workspace.
        </p>

        <div className="grid w-full gap-3 sm:grid-cols-3 mb-8">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <Upload className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Single sample</p>
                <p className="text-xs text-muted-foreground mt-1">One image → full lab report</p>
              </div>
              <Button asChild className="w-full rounded-full touch-target">
                <Link href="/analyze">
                  Analyze
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <GitCompare className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Compare batch</p>
                <p className="text-xs text-muted-foreground mt-1">2–10 samples · comparison PDF</p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-full touch-target">
                <Link href="/compare">Compare</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Your history</p>
                <p className="text-xs text-muted-foreground mt-1">Reports saved in this device</p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-full touch-target">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground safe-bottom">
        © 2026 Inspectra AI · In-memory processing · No training data stored on server
      </footer>
    </div>
  );
}
