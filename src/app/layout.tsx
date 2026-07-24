import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSOMA · ETINAR",
  description: "Matriz de Hallazgos y Evidencias — Sistema SSOMA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }`,
          }}
        />
      </body>
    </html>
  );
}
