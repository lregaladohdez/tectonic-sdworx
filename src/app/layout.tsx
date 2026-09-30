import type { Metadata } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Relay · SD Worx",
  description: "Trust-verified client handovers for payroll consultants",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${archivoBlack.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-pattern-dots">{children}</body>
    </html>
  );
}
