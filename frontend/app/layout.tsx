import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
    title: "ELjuri | Voice Intelligence Console",
    description: "Advanced AI Voice Agent Simulation & Profitability Terminal",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="light" suppressHydrationWarning>
            <body className={`${GeistSans.className} bg-white text-zinc-900 antialiased`} suppressHydrationWarning>
                {children}
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
