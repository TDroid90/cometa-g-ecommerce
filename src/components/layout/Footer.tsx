import Image from "next/image";
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

function PaymentLogo({ type }: { type: "visa" | "master" | "cabal" | "amex" | "mipyme" | "cripto" }) {
  if (type === "visa") {
    return <span className="text-[15px] font-black italic tracking-tight text-[#2147a8]">VISA</span>;
  }

  if (type === "master") {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-block h-5 w-8">
          <span className="absolute left-0 top-0 h-5 w-5 rounded-full bg-[#eb001b]" />
          <span className="absolute right-0 top-0 h-5 w-5 rounded-full bg-[#f79e1b] mix-blend-screen" />
        </span>
        <span className="text-[11px] font-black text-zinc-900">Mastercard</span>
      </span>
    );
  }

  if (type === "cabal") {
    return <span className="text-[13px] font-black tracking-tight text-[#165aa7]">CABAL</span>;
  }

  if (type === "amex") {
    return <span className="rounded-sm bg-[#2e77bb] px-1.5 py-0.5 text-[10px] font-black text-white">AMEX</span>;
  }

  if (type === "mipyme") {
    return (
      <span className="inline-flex flex-col leading-none">
        <span className="text-[11px] font-medium text-[#6aa5f2]">cuotas</span>
        <span className="text-[18px] font-black text-[#6aa5f2]">MiPyME</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 leading-none">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f7931a] text-[13px] font-black text-white">B</span>
      <span className="text-[11px] font-black text-zinc-900">CRIPTO</span>
    </span>
  );
}

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

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_.8fr_1.6fr_.75fr] lg:px-8">
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
            {(["cabal", "visa", "master", "mipyme", "cripto", "amex"] as const).map((method) => (
              <span
                key={method}
                className="inline-flex h-10 min-w-[74px] items-center justify-center rounded-md border border-comet-border bg-white px-3"
              >
                <PaymentLogo type={method} />
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-500">
            {contactSection?.text || "Ventas online, reservas, stock actualizado y asesoramiento gamer."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-white">Data Fiscal</h3>
          <a
            href="https://www.afip.gob.ar/landing/default.asp"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-md border border-comet-border bg-[#242424] p-3 transition hover:border-comet-fuchsia"
          >
            <Image
              src="/data-fiscal-arca.svg"
              alt="Data Fiscal ARCA"
              width={74}
              height={98}
              className="h-auto w-[74px]"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
