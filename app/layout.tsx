import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuralLog AI — Enterprise RAG Platform",
  description: "Production-grade Retrievable AI Assistant with pgvector & Groq Llama 3.3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
        <ClerkProvider>
          <main className="flex-1 flex overflow-hidden">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}