import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MenuPulse AI",
  description: "Demostración académica de menús digitales adaptativos con aprendizaje contextual (datos simulados).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
