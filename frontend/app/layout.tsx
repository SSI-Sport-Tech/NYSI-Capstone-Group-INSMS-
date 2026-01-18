import type { Metadata } from "next";
// @ts-expect-error: allow side-effect CSS import without type declarations
import "./globals.css";

export const metadata: Metadata = {
  title: "NYSI - Supplement Management System",
  description: "Integrated Nutrition Supplement Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
