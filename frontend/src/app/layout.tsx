import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manuscript Platform",
  description: "AI-assisted scientific manuscript submission platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#faf9f5] text-[#141413]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
