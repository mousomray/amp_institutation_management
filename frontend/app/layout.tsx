import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/components/admin/StoreProvider";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import 'primeicons/primeicons.css';
import { PrimeReactProvider } from "primereact/api";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AMP Technology - Institution Management System",
    template: "%s | AMP Technology",
  },
  description:
    "AMP Technology Institution Management System helps schools and institutions manage students, fees, attendance, payments, and administration efficiently.",

  keywords: [
    "AMP Technology",
    "Institution Management System",
    "School Management Software",
    "Student Management",
    "Fee Management System",
    "Education ERP",
  ],

  authors: [{ name: "AMP Technology" }],
  creator: "AMP Technology",
  publisher: "AMP Technology",

  openGraph: {
    title: "AMP Technology - Institution Management System",
    description:
      "Complete Institution Management System for managing students, fees, attendance and administration.",
    //url: "https://yourdomain.com", 
    siteName: "AMP Technology",
    locale: "en_IN",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <PrimeReactProvider
          value={{
            hideOverlaysOnDocumentScrolling: true,
          }}
        >
          {children}
        </PrimeReactProvider>
        </StoreProvider>
        
      </body>
    </html>
  );
}
