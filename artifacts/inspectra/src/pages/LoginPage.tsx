import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hexagon } from "lucide-react";
import { Link } from "wouter";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-xl bg-background/50 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Hexagon className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to Inspectra AI to analyze materials
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button className="w-full h-12 rounded-xl text-base" variant="outline" asChild>
              <Link href="/dashboard">
                <Hexagon className="mr-2 h-5 w-5" />
                Enter Dashboard
              </Link>
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-4">
              By continuing, you agree to Inspectra's Terms of Service and Privacy Policy. No data is stored on our servers.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
