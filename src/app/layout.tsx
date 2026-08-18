import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Public_Sans,
  Source_Serif_4,
} from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Bizcon RSVP — Event Intelligence for professional summits.",
  description: "Event Intelligence for professional summits.",
  applicationName: "Bizcon RSVP",
  openGraph: {
    title: "Bizcon RSVP",
    description: "Event Intelligence for professional summits.",
    siteName: "Bizcon RSVP",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${publicSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
