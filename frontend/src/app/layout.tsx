import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MandatoryPasswordChangeModal } from "@/components/MandatoryPasswordChangeModal";

export const metadata: Metadata = {
  title: "ByteVipers Coding Arena | Think. Code. Conquer.",
  description: "The premier Python-only coding practice and automated assessment platform.",
  icons: {
    icon: "/ByteVipers.png",
    shortcut: "/ByteVipers.png",
    apple: "/ByteVipers.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-[#050608] text-[#F5F7FA] selection:bg-[#168BFF]/30 selection:text-[#36C5FF]">
        <AuthProvider>
          <Navbar />
          <MandatoryPasswordChangeModal />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
