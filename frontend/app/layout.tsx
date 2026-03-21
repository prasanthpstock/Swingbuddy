import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Personal Trading App", description: "Cloud-hosted trading dashboard" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
