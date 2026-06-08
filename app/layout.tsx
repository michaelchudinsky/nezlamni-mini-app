import type { Metadata } from "next";
import Script from "next/script";
import "react-easy-crop/react-easy-crop.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEZLAMNI",
  description: "NEZLAMNI Mini App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
