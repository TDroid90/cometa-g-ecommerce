import Link from "next/link";
import { Instagram, MessageCircle, Send } from "lucide-react";
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

const defaultUsefulLinks = [
  { label: "Catálogo", href: "/productos" },
  { label: "Preventa", href: "/productos?disponibilidad=preventa" },
  { label: "Mi cuenta", href: "/perfil" }
];

const paymentMethods = ["Visa", "Master Card", "Maestro", "Cabal", "American Express", "MIPYME 3", "MIPYME 6"];

export function Footer({ sections }: { sections: LayoutSection[] }) {
  const linksSection = sections.find((section) => section.section_type === "footer_links");
  const contactSection = sections.find((section) => section.section_type === "footer_contact");
  const links = parseLinks(linksSection?.text);
  const usefulLinks = links.length ? links.slice(0, 3) : defaultUsefulLinks;

  return (
    <footer className="border-t border-comet-border bg-comet-black text-zinc-300">
      <div className="border-b border-comet-border bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex flex-1 items-center gap-3 text-white">
            <Send size={24} />
            <div>
              <p className="text-lg font-black">Suscribite al newsletter</p>
              <p className="text-sm text-white/80">Ofertas, preventas y novedades gamer sin ruido.</p>
            </div>
          </div>
          <form className="flex w-full overflow-hidden rounded-md border border-white/20 bg-white/10 md:max-w-xl">
            <input
              type="email"
              placeholder="Ingresá tu email"
              className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-500"
            />
            <button className="bg-comet-panel px-5 text-sm font-black text-white transition hover:bg-comet-black">
              Enviar
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[30%_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-md comet-gradient text-lg font-black text-white">
              G
            </span>
            <span>
              <span className="block text-2xl font-black leading-none text-white">
                {linksSection?.title || "COMETA G"}<span className="text-comet-fuchsia">.</span>
              </span>
              <span className="text-xs font-semibold text-zinc-400">
                {contactSection?.title || "Computación Gamer"}
              </span>
            </span>
          </Link>

          <a
            href="https://wa.me/5491100000000?text=Hola%20COMETA%20G,%20quiero%20hacer%20una%20consulta"
            className="mt-6 inline-flex items-center gap-3 rounded-md border border-comet-border bg-comet-panel px-4 py-3 text-sm font-bold text-white transition hover:border-emerald-400"
          >
            <MessageCircle size={19} className="text-emerald-400" />
            WhatsApp solo mensajes
          </a>

          <div className="mt-6 flex gap-3">
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full border border-comet-border hover:border-comet-fuchsia" aria-label="Facebook" title="Facebook">
              <span className="text-sm font-black">FB</span>
            </a>
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full border border-comet-border text-sm font-black hover:border-comet-fuchsia" aria-label="TikTok" title="TikTok">
              TK
            </a>
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full border border-comet-border hover:border-comet-fuchsia" aria-label="Instagram" title="Instagram">
              <Instagram size={18} />
            </a>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-white">Links útiles</h3>
            <div className="mt-4 grid gap-3">
              {usefulLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-zinc-400 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-white">Métodos de pago</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <span
                  key={method}
                  className="rounded-md border border-comet-border bg-comet-panel px-3 py-2 text-xs font-black text-zinc-100"
                >
                  {method}
                </span>
              ))}
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-500">
              {contactSection?.text || "Ventas online, reservas, stock actualizado y asesoramiento gamer."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
