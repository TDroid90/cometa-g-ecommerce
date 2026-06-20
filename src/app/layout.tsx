import type { Metadata } from "next";
import { getCategoryMenu, getLayoutSections } from "@/lib/data";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "COMETA G - Computación Gamer",
  description: "Tienda online gamer administrable desde Google Sheets."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sections, categoryMenu] = await Promise.all([getLayoutSections(), getCategoryMenu()]);
  const headerSections = sections.filter((section) => section.area === "header");
  const footerSections = sections.filter((section) => section.area === "footer");

  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <CartProvider>
            <WishlistProvider>
              <div className="flex min-h-screen flex-col">
                <Header sections={headerSections} categoryMenu={categoryMenu} />
                <main className="flex-1">{children}</main>
                <Footer sections={footerSections} />
              </div>
            </WishlistProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
