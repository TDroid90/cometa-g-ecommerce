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
  { label: "Catalogo", href: "/productos" },
  { label: "Preventa", href: "/productos?disponibilidad=preventa" },
  { label: "Mi cuenta", href: "/perfil" }
];

type PaymentLogoType = "visa" | "master" | "cabal" | "amex" | "mipyme" | "cripto" | "naranja" | "qr";

function PaymentLogo({ type }: { type: PaymentLogoType }) {
  if (type === "visa") return <span className="text-[15px] font-black italic tracking-tight text-[#2147a8]">VISA</span>;
  if (type === "cabal") return <span className="text-[13px] font-black tracking-tight text-[#165aa7]">CABAL</span>;
  if (type === "amex") return <span className="rounded-sm bg-[#2e77bb] px-1.5 py-0.5 text-[10px] font-black text-white">AMEX</span>;
  if (type === "mipyme") {
    return (
      <span className="inline-flex flex-col leading-none">
        <span className="text-[10px] font-medium text-[#6aa5f2]">cuotas</span>
        <span className="text-[16px] font-black text-[#6aa5f2]">MiPyME</span>
      </span>
    );
  }
  if (type === "cripto") {
    return (
      <span className="inline-flex items-center gap-1 leading-none">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f7931a] text-[13px] font-black text-white">B</span>
        <span className="text-[10px] font-black text-zinc-900">CRIPTO</span>
      </span>
    );
  }
  if (type === "naranja") {
    return (
      <span className="inline-flex items-center gap-1 leading-none">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ff6a00] text-[12px] font-black text-white">N</span>
        <span className="text-[10px] font-black text-zinc-900">Naranja X</span>
      </span>
    );
  }
  if (type === "master") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="relative inline-block h-5 w-8">
          <span className="absolute left-0 top-0 h-5 w-5 rounded-full bg-[#eb001b]" />
          <span className="absolute right-0 top-0 h-5 w-5 rounded-full bg-[#f79e1b] mix-blend-screen" />
        </span>
        <span className="text-[10px] font-black text-zinc-900">Master</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 leading-none">
      <span className="grid h-5 w-5 grid-cols-2 gap-[2px] rounded-sm border border-zinc-900 p-[3px]">
        <span className="bg-zinc-900" />
        <span className="bg-zinc-900" />
        <span className="bg-zinc-900" />
        <span className="bg-zinc-900" />
      </span>
      <span className="text-[10px] font-black text-zinc-900">QR</span>
    </span>
  );
}

export function Footer({ sections }: { sections: LayoutSection[] }) {
  const linksSection = sections.find((section) => section.section_type === "footer_links");
  const contactSection = sections.find((section) => section.section_type === "footer_contact");
  const newsletterSection = sections.find((section) => section.layout_variant === "footer_newsletter" && section.visible);
  const socialSection = sections.find((section) => section.layout_variant === "footer_social" && section.visible);
  const paymentsSection = sections.find((section) => section.layout_variant === "footer_payments" && section.visible);
  const usefulLinks = (parseLinks(linksSection?.text).length ? parseLinks(linksSection?.text).slice(0, 3) : defaultUsefulLinks);
  const socialLinks = parseLinks(socialSection?.text);
  const paymentMethods = (paymentsSection?.text || "cabal,visa,master,naranja,mipyme,qr,cripto,amex")
    .split(",")
    .map((method) => method.trim().toLowerCase())
    .filter(Boolean) as PaymentLogoType[];

  return (
    <footer className="border-t border-comet-border bg-comet-black text-zinc-300">
      <div className="border-b border-comet-border bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 text-center sm:px-6 md:flex-row md:items-center md:text-left lg:px-8">
          <div className="flex flex-1 items-center justify-center gap-3 text-white md:justify-start">
            <Send size={22} />
            <div>
              <p className="text-lg font-black">{newsletterSection?.title || "Suscribite al newsletter"}</p>
              <p className="text-sm text-white/80">{newsletterSection?.text || "Ofertas, preventas y novedades gamer sin ruido."}</p>
            </div>
          </div>
          <form className="flex w-full overflow-hidden rounded-md border border-white/20 bg-white/10 md:max-w-xl">
            <input
              type="email"
              placeholder="Ingresa tu email"
              className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-500"
            />
            <button className="bg-comet-panel px-5 text-sm font-black text-white transition hover:bg-comet-black">
              {newsletterSection?.button_text || "Enviar"}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-center sm:px-6 md:grid-cols-3 lg:grid-cols-[1.15fr_.75fr_1.35fr] lg:px-8 lg:text-left">
        <div className="flex flex-col items-center lg:items-start">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-md comet-gradient text-lg font-black text-white">G</span>
            <span>
              <span className="block text-2xl font-black leading-none text-white">
                {linksSection?.title || "COMETA G"}<span className="text-comet-fuchsia">.</span>
              </span>
              <span className="text-xs font-semibold text-zinc-400">{contactSection?.title || "Computacion Gamer"}</span>
            </span>
          </Link>

          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href="https://wa.me/5491100000000?text=Hola%20COMETA%20G,%20quiero%20hacer%20una%20consulta" className="grid h-10 w-10 place-items-center rounded-full border border-comet-border text-emerald-400 hover:border-emerald-400" aria-label="WhatsApp solo mensajes" title="WhatsApp solo mensajes">
              <MessageCircle size={18} />
            </a>
            <a href={socialLinks[0]?.href || "#"} className="grid h-10 w-10 place-items-center rounded-full border border-comet-border hover:border-comet-fuchsia" aria-label="Facebook" title="Facebook">
              <span className="text-sm font-black">FB</span>
            </a>
            <a href={socialLinks[1]?.href || "#"} className="grid h-10 w-10 place-items-center rounded-full border border-comet-border text-sm font-black hover:border-comet-fuchsia" aria-label="TikTok" title="TikTok">TK</a>
            <a href={socialLinks[2]?.href || "#"} className="grid h-10 w-10 place-items-center rounded-full border border-comet-border hover:border-comet-fuchsia" aria-label="Instagram" title="Instagram">
              <Instagram size={18} />
            </a>
            <a href="http://qr.afip.gob.ar/?qr=HDul37GPIEuVUXh0EOKQ0g,," target="_F960AFIPInfo" rel="noreferrer" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-comet-border bg-[#242424] hover:border-comet-fuchsia" aria-label="Data Fiscal" title="Data Fiscal">
              <img src="http://www.afip.gob.ar/images/f960/DATAWEB.jpg" alt="Data Fiscal" width={28} height={28} className="h-7 w-7 object-contain" />
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center lg:items-start">
          <h3 className="text-sm font-black uppercase tracking-wide text-white">Links utiles</h3>
          <div className="mt-4 grid gap-3">
            {usefulLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-zinc-400 hover:text-white">{link.label}</Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center lg:items-start">
          <h3 className="text-sm font-black uppercase tracking-wide text-white">Todos los medios de pago</h3>
          <div className="mt-4 grid w-full max-w-[420px] grid-cols-4 gap-2">
            {paymentMethods.slice(0, 8).map((method) => (
              <span key={method} className="inline-flex h-10 min-w-0 items-center justify-center rounded-md border border-comet-border bg-white px-2">
                <PaymentLogo type={method} />
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-500">
            {contactSection?.text || "Credito, debito, QR, cripto y cuotas MiPyME para compras seleccionadas."}
          </p>
        </div>
      </div>
    </footer>
  );
}
