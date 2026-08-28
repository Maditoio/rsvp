import {
  Inter,
  Manrope,
  DM_Sans,
  Plus_Jakarta_Sans,
  Space_Grotesk,
  Playfair_Display,
  Merriweather,
} from "next/font/google";

const inter = Inter({
  variable: "--site-font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--site-font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--site-font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--site-font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--site-font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--site-font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const merriweather = Merriweather({
  variable: "--site-font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const fontVars = [
  inter.variable,
  manrope.variable,
  dmSans.variable,
  plusJakarta.variable,
  spaceGrotesk.variable,
  playfair.variable,
  merriweather.variable,
].join(" ");

export const dynamic = "force-dynamic";

export default function PublicEventSiteLayout({
  children,
}: LayoutProps<"/e/[orgSlug]/[eventSlug]">) {
  return (
    <div className={`min-h-screen bg-white ${fontVars}`}>{children}</div>
  );
}
