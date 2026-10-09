import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  Inter,
  Playfair_Display,
  DM_Serif_Display,
  Space_Mono,
  Outfit,
} from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const brandSerif = localFont({
  src: [
    {
      path: "../../assets/fonts/invite-hero/SourceSerif4-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/SourceSerif4-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/SourceSerif4-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/SourceSerif4-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-brand-serif",
  display: "swap",
});

const brandModern = localFont({
  src: [
    {
      path: "../../assets/fonts/invite-hero/DMSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/DMSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/DMSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/DMSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-brand-modern",
  display: "swap",
});

const brandManrope = localFont({
  src: [
    {
      path: "../../assets/fonts/invite-hero/Manrope-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/Manrope-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/Manrope-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/Manrope-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-brand-manrope",
  display: "swap",
});

const brandJakarta = localFont({
  src: [
    {
      path: "../../assets/fonts/invite-hero/PlusJakartaSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/PlusJakartaSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/PlusJakartaSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/PlusJakartaSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-brand-jakarta",
  display: "swap",
});

const brandSpaceGrotesk = localFont({
  src: [
    {
      path: "../../assets/fonts/invite-hero/SpaceGrotesk-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/SpaceGrotesk-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/SpaceGrotesk-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/invite-hero/SpaceGrotesk-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-brand-space-grotesk",
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bizcon RSVP — Event Intelligence for professional summits.",
  description: "Event Intelligence for professional summits.",
  applicationName: "Bizcon RSVP",
  icons: {
    icon: [
      { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Bizcon RSVP",
    description: "Event Intelligence for professional summits.",
    siteName: "Bizcon RSVP",
    images: [{ url: "/brand/logo-512.png", width: 512, height: 512, alt: "Bizcon RSVP" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${brandSerif.variable} ${brandModern.variable} ${brandManrope.variable} ${brandJakarta.variable} ${brandSpaceGrotesk.variable} ${playfair.variable} ${dmSerif.variable} ${spaceMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
