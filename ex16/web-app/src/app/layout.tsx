import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WildLife Directory",
  description: "Explore the planet's incredible biodiversity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-full flex flex-col bg-gradient-to-br from-[#F8FAF8] via-[#EAF4EF] to-[#DDEFE7] bg-fixed text-[#1A1A1A]">
        <div className="flex-1">{children}</div>
        <footer className="bg-[#1A1A1A] text-[#D1D5DB] py-16 mt-20 border-t border-[#1A1A1A]">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-[24px] font-black mb-4 text-[#FFFFFF]">WildLife Directory</h3>
              <p className="opacity-70 leading-relaxed max-w-sm text-[16px]">A production-grade knowledge platform continuously updated by our data pipeline. Explore millions of structured records about our planet's biodiversity.</p>
            </div>
            <div>
              <h4 className="text-[18px] font-bold mb-4 text-[#FFFFFF]">Resources</h4>
              <ul className="space-y-2 opacity-80 text-[14px]">
                <li><a href="#" className="hover:text-[#FFFFFF] hover:underline transition-all">API Documentation</a></li>
                <li><a href="#" className="hover:text-[#FFFFFF] hover:underline transition-all">Data Provenance</a></li>
                <li><a href="#" className="hover:text-[#FFFFFF] hover:underline transition-all">System Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[18px] font-bold mb-4 text-[#FFFFFF]">Legal</h4>
              <ul className="space-y-2 opacity-80 text-[14px]">
                <li><a href="#" className="hover:text-[#FFFFFF] hover:underline transition-all">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[#FFFFFF] hover:underline transition-all">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#FFFFFF] hover:underline transition-all">Data Usage Guidelines</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/10 text-[14px] opacity-60 flex justify-center items-center">
            <p>© {new Date().getFullYear()} WildLife Pipeline. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
