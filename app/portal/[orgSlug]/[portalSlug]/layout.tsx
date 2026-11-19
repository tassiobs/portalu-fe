import { CitizenNav } from "@/components/citizen/citizen-nav";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <CitizenNav />
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
