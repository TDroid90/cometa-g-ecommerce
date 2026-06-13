import Link from "next/link";
import { LayoutSection } from "@/lib/types";

function parseLinks(text?: string): Array<{ label: string; href: string }> {
  return (text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, href] = item.split("|").map((part) => part.trim());
      return { label, href: href || "#" };
    });
}

export function Footer({ sections }: { sections: LayoutSection[] }) {
  const linksSection = sections.find((section) => section.section_type === "footer_links");
  const contactSection = sections.find((section) => section.section_type === "footer_contact");
  const links = parseLinks(linksSection?.text);

  return (
    <footer className="border-t border-comet-border bg-comet-black">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div>
          <p className="text-sm font-black tracking-wide text-white">
            {linksSection?.title || "COMETA G"}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            {contactSection?.text ||
              "Tienda online gamer preparada para crecer desde Google Sheets hacia una administracion completa."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-zinc-300 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
