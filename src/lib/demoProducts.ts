import { Product } from "@/lib/types";

type DemoCatalogItem = {
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  image: string;
  attrs: Record<string, string>;
};

const images = {
  gpu: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80",
  cpu: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=80",
  storage: "https://images.unsplash.com/photo-1597138804456-e7dca7f59e21?auto=format&fit=crop&w=900&q=80",
  monitor: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80",
  keyboard: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80",
  pc: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80",
  notebook: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
  printer: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=900&q=80",
  audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
  network: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
  chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80",
  generic: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"
};

const catalog: DemoCatalogItem[] = [
  { name: "Disco Externo 2TB USB 3.2", category: "Almacenamiento", subcategory: "Discos Externos", brand: "Seagate", price: 129999, image: images.storage, attrs: { Capacidad: "2TB", Interfaz: "USB 3.2", Formato: "2.5 pulgadas" } },
  { name: "SSD Externo 1TB Portable", category: "Almacenamiento", subcategory: "Discos Externos SSD", brand: "Kingston", price: 149999, image: images.storage, attrs: { Capacidad: "1TB", Lectura: "1050MB/s", Interfaz: "USB-C" } },
  { name: "Disco Interno 4TB 5400RPM", category: "Almacenamiento", subcategory: "Discos Internos", brand: "Western Digital", price: 169999, image: images.storage, attrs: { Capacidad: "4TB", RPM: "5400", Cache: "256MB" } },
  { name: "SSD SATA 960GB 2.5", category: "Almacenamiento", subcategory: "Discos Internos SSD", brand: "Crucial", price: 89999, image: images.storage, attrs: { Capacidad: "960GB", Interfaz: "SATA", Formato: "2.5 pulgadas" } },
  { name: "Memoria Flash microSD 256GB", category: "Almacenamiento", subcategory: "Memorias Flash", brand: "SanDisk", price: 34999, image: images.storage, attrs: { Capacidad: "256GB", Clase: "A2", Velocidad: "160MB/s" } },
  { name: "NAS 2 Bahias Personal Cloud", category: "Almacenamiento", subcategory: "Nas", brand: "Synology", price: 529999, image: images.network, attrs: { Bahias: "2", Red: "Gigabit", Uso: "Backup" } },
  { name: "Pen Drive USB-C 128GB", category: "Almacenamiento", subcategory: "Pen Drives", brand: "Kingston", price: 24999, image: images.storage, attrs: { Capacidad: "128GB", Conexion: "USB-C", Material: "Metal" } },
  { name: "Cooler CPU Torre ARGB 120mm", category: "Hardware", subcategory: "Coolers", brand: "Cooler Master", price: 74999, image: images.cpu, attrs: { TDP: "180W", Ventilador: "120mm", Iluminacion: "ARGB" } },
  { name: "Fuente 650W 80 Plus Bronze", category: "Hardware", subcategory: "Fuentes", brand: "Corsair", price: 99999, image: images.pc, attrs: { Potencia: "650W", Certificacion: "80 Plus Bronze", Modular: "No" } },
  { name: "Gabinete ATX Mesh 4 Fans", category: "Hardware", subcategory: "Gabinetes", brand: "DeepCool", price: 119999, image: images.pc, attrs: { Formato: "ATX", Ventiladores: "4", Frente: "Mesh" } },
  { name: "Motherboard B650M WiFi AM5", category: "Hardware", subcategory: "Motherboards", brand: "ASUS", price: 219999, image: images.cpu, attrs: { Socket: "AM5", Chipset: "B650", RAM: "DDR5" } },
  { name: "GeForce RTX 4060 8GB OC", category: "Hardware", subcategory: "Placas de Video", brand: "NVIDIA", price: 449999, image: images.gpu, attrs: { Memoria: "8GB GDDR6", Uso: "1080p", Consumo: "115W" } },
  { name: "Radeon RX 7600 XT 16GB", category: "Hardware", subcategory: "Placas de Video", brand: "AMD", price: 499999, image: images.gpu, attrs: { Memoria: "16GB GDDR6", Uso: "1080p Ultra", Consumo: "165W" } },
  { name: "Intel Core i5 14400F", category: "Hardware", subcategory: "Procesadores", brand: "Intel", price: 289999, image: images.cpu, attrs: { Nucleos: "10", Socket: "LGA1700", Graficos: "No" } },
  { name: "AMD Ryzen 5 7600", category: "Hardware", subcategory: "Procesadores", brand: "AMD", price: 319999, image: images.cpu, attrs: { Nucleos: "6", Socket: "AM5", Frecuencia: "5.1GHz" } },
  { name: "Memoria Notebook DDR4 16GB 3200", category: "Memorias", subcategory: "Memorias Notebook", brand: "Crucial", price: 59999, image: images.storage, attrs: { Capacidad: "16GB", Tipo: "DDR4", Frecuencia: "3200MHz" } },
  { name: "Memoria PC DDR5 32GB 6000 RGB", category: "Memorias", subcategory: "Memorias PC", brand: "Kingston", price: 159999, image: images.pc, attrs: { Capacidad: "32GB", Tipo: "DDR5", Frecuencia: "6000MHz" } },
  { name: "Mini PC Ryzen 7 32GB 1TB", category: "Computadoras", subcategory: "Mini PC", brand: "Beelink", price: 699999, image: images.pc, attrs: { CPU: "Ryzen 7", RAM: "32GB", SSD: "1TB" } },
  { name: "Notebook Consumo 15 Ryzen 5", category: "Computadoras", subcategory: "Notebooks Consumo", brand: "Lenovo", price: 799999, image: images.notebook, attrs: { Pantalla: "15.6 FHD", RAM: "16GB", SSD: "512GB" } },
  { name: "Notebook Corporativa i7 14", category: "Computadoras", subcategory: "Notebooks Corporativo", brand: "Dell", price: 1199999, image: images.notebook, attrs: { Pantalla: "14 FHD", RAM: "16GB", Seguridad: "TPM" } },
  { name: "PC Escritorio Gamer Ryzen 5 RTX", category: "Computadoras", subcategory: "PC de Escritorio", brand: "Cometa G", price: 1399999, image: images.pc, attrs: { CPU: "Ryzen 5", GPU: "RTX 4060", RAM: "32GB" } },
  { name: "Monitor 24 IPS 100Hz", category: "Imagen", subcategory: "Monitores", brand: "LG", price: 189999, image: images.monitor, attrs: { Pulgadas: "24", Panel: "IPS", Frecuencia: "100Hz" } },
  { name: "Monitor Gamer 32 Curvo 165Hz", category: "Imagen", subcategory: "Monitores", brand: "Samsung", price: 549999, image: images.monitor, attrs: { Pulgadas: "32", Panel: "VA", Frecuencia: "165Hz" } },
  { name: "Proyector Full HD 4500 Lumens", category: "Imagen", subcategory: "Proyectores", brand: "Epson", price: 699999, image: images.generic, attrs: { Resolucion: "Full HD", Lumens: "4500", HDMI: "Si" } },
  { name: "Escaner Documental Doble Faz", category: "Imagen", subcategory: "Escaner", brand: "Brother", price: 429999, image: images.printer, attrs: { Velocidad: "35ppm", Duplex: "Si", Conexion: "USB" } },
  { name: "Impresora Sistema Continuo WiFi", category: "Impresoras", subcategory: "Impresoras de Sistema Continuo", brand: "Epson", price: 319999, image: images.printer, attrs: { Tipo: "Tinta continua", WiFi: "Si", Color: "Si" } },
  { name: "Impresora Inkjet Multifuncion", category: "Impresoras", subcategory: "Impresoras Inkjet", brand: "HP", price: 159999, image: images.printer, attrs: { Tipo: "Inkjet", Scanner: "Si", WiFi: "Si" } },
  { name: "Impresora Laser Monocromo", category: "Impresoras", subcategory: "Impresoras Laser", brand: "Brother", price: 249999, image: images.printer, attrs: { Tipo: "Laser", Color: "No", Velocidad: "30ppm" } },
  { name: "Plotter A1 CAD WiFi", category: "Impresoras", subcategory: "Plotters", brand: "HP", price: 2499999, image: images.printer, attrs: { Ancho: "A1", Uso: "CAD", WiFi: "Si" } },
  { name: "Botella Tinta Negra 70ml", category: "Insumos", subcategory: "Botellas de Tinta", brand: "Epson", price: 15999, image: images.printer, attrs: { Color: "Negro", Volumen: "70ml", Compatibilidad: "EcoTank" } },
  { name: "Cartucho Tinta Color XL", category: "Insumos", subcategory: "Cartuchos de Tinta", brand: "HP", price: 28999, image: images.printer, attrs: { Color: "Tricolor", Rendimiento: "XL", Original: "Si" } },
  { name: "Toner Laser Negro 2500 Paginas", category: "Insumos", subcategory: "Toners", brand: "Brother", price: 79999, image: images.printer, attrs: { Color: "Negro", Rendimiento: "2500 paginas", Original: "Si" } },
  { name: "Auriculares Gamer 7.1 USB", category: "Audio", subcategory: "Auriculares", brand: "HyperX", price: 109999, image: images.audio, attrs: { Sonido: "7.1", Conexion: "USB", Microfono: "Si" } },
  { name: "Microfono Condenser USB", category: "Audio", subcategory: "Microfonos", brand: "Fifine", price: 89999, image: images.audio, attrs: { Patron: "Cardioide", Conexion: "USB", Soporte: "Incluido" } },
  { name: "Parlantes 2.1 Bluetooth", category: "Audio", subcategory: "Parlantes", brand: "Edifier", price: 149999, image: images.audio, attrs: { Canales: "2.1", Bluetooth: "Si", Potencia: "34W" } },
  { name: "Cable HDMI 2.1 2 Metros", category: "Cables", subcategory: "Cables", brand: "UGreen", price: 12999, image: images.generic, attrs: { Version: "2.1", Largo: "2m", Resolucion: "8K" } },
  { name: "Extensor WiFi Mesh AC1200", category: "Conectividad", subcategory: "Extensores", brand: "TP-Link", price: 69999, image: images.network, attrs: { WiFi: "AC1200", Bandas: "Dual", Puertos: "1" } },
  { name: "Hub USB-C 7 en 1 HDMI", category: "Conectividad", subcategory: "Hubs", brand: "Anker", price: 89999, image: images.generic, attrs: { Puertos: "7", HDMI: "4K", PD: "100W" } },
  { name: "Placa de Red PCIe WiFi 6", category: "Conectividad", subcategory: "Placas de Red", brand: "TP-Link", price: 74999, image: images.network, attrs: { WiFi: "AX1800", Bluetooth: "5.2", Interfaz: "PCIe" } },
  { name: "Router WiFi 6 AX3000", category: "Conectividad", subcategory: "Routers", brand: "Mercusys", price: 119999, image: images.network, attrs: { WiFi: "AX3000", Puertos: "Gigabit", Antenas: "4" } },
  { name: "Switch 8 Puertos Gigabit", category: "Conectividad", subcategory: "Switches", brand: "TP-Link", price: 49999, image: images.network, attrs: { Puertos: "8", Velocidad: "Gigabit", Carcasa: "Metal" } },
  { name: "Silla Gamer Ergonomica Negra", category: "Muebles", subcategory: "Sillas", brand: "Corsair", price: 329999, image: images.chair, attrs: { Material: "PU", Reclinable: "Si", Soporte: "Lumbar" } },
  { name: "Mouse Pad XL Speed", category: "Perifericos", subcategory: "Mouse Pads", brand: "Logitech", price: 24999, image: images.keyboard, attrs: { Tamano: "XL", Superficie: "Speed", Base: "Goma" } },
  { name: "Mouse Gamer 26000 DPI", category: "Perifericos", subcategory: "Mouses", brand: "Logitech", price: 89999, image: images.keyboard, attrs: { Sensor: "26000 DPI", Botones: "6", Conexion: "USB" } },
  { name: "Teclado Mecanico 75 Wireless", category: "Perifericos", subcategory: "Teclados", brand: "Keychron", price: 189999, image: images.keyboard, attrs: { Formato: "75%", Conexion: "Wireless", Switches: "Brown" } },
  { name: "Joystick Wireless PC", category: "Perifericos", subcategory: "Joysticks", brand: "Microsoft", price: 159999, image: images.generic, attrs: { Conexion: "Bluetooth", Bateria: "AA", Compatibilidad: "PC/Xbox" } },
  { name: "Camara Web Full HD", category: "Perifericos", subcategory: "Camaras Web", brand: "Logitech", price: 79999, image: images.generic, attrs: { Resolucion: "1080p", FPS: "30", Microfono: "Si" } },
  { name: "Camara IP Exterior WiFi", category: "Seguridad", subcategory: "Camaras IP", brand: "TP-Link", price: 89999, image: images.generic, attrs: { Resolucion: "2K", Exterior: "Si", Vision: "Nocturna" } },
  { name: "UPS 1200VA AVR", category: "Unidad de Energia", subcategory: "Ups", brand: "APC", price: 219999, image: images.generic, attrs: { Potencia: "1200VA", AVR: "Si", Tomas: "6" } },
  { name: "Estabilizador 1000VA 6 Tomas", category: "Unidad de Energia", subcategory: "Estabilizadores", brand: "Atomlux", price: 59999, image: images.generic, attrs: { Potencia: "1000VA", Tomas: "6", Proteccion: "Si" } },
  { name: "Consola Retro HDMI 2 Controles", category: "Video Juegos", subcategory: "Consolas", brand: "Gadnic", price: 89999, image: images.generic, attrs: { Juegos: "Incluidos", HDMI: "Si", Controles: "2" } }
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateDemoProducts(existingProducts: Product[], targetTotal = 100): Product[] {
  const existingSlugs = new Set(existingProducts.map((product) => product.slug));
  const missing = Math.max(0, targetTotal - existingProducts.length);
  const products: Product[] = [];
  let index = 0;

  while (products.length < missing) {
    const item = catalog[index % catalog.length];
    const variant = Math.floor(index / catalog.length) + 1;
    const suffix = variant > 1 ? ` V${variant}` : "";
    const name = `${item.name}${suffix}`;
    const slug = slugify(`demo ${name}`);

    if (!existingSlugs.has(slug)) {
      const order = existingProducts.length + products.length + 1;
      const stock = order % 13 === 0 ? 0 : ((order * 3) % 18) + 1;
      const preventa = order % 17 === 0;
      const offer = order % 5 === 0;
      const price = Math.round((item.price * (1 + variant * 0.035)) / 1000) * 1000;

      products.push({
        id: `demo-${String(order).padStart(3, "0")}`,
        sku: `DEMO-${String(order).padStart(3, "0")}`,
        nombre: name,
        slug,
        descripcion_corta: `${item.subcategory} ${item.brand} seleccionado para catalogo Cometa G.`,
        descripcion_larga: `Producto demo de ${item.category}/${item.subcategory}, creado para completar el catalogo inicial hasta importar el CSV real. Incluye atributos tecnicos, stock y garantia para probar filtros, busqueda y paginas de producto.`,
        precio: price,
        precio_oferta: offer ? Math.round((price * 0.92) / 1000) * 1000 : undefined,
        stock,
        stock_status: preventa ? "preventa" : stock > 0 ? "disponible" : "sin_stock",
        categoria: item.category,
        subcategoria: item.subcategory,
        marca: item.brand,
        tags: [item.category, item.subcategory, item.brand, "demo"],
        imagen_principal: item.image,
        imagenes_extra: [images.generic, item.image],
        atributos: item.attrs,
        color: ["Negro", "Blanco", "Gris", "Azul"][order % 4],
        garantia: order % 3 === 0 ? "36 meses" : "12 meses",
        destacado: order % 7 === 0,
        preventa,
        fecha_lanzamiento: preventa ? "2026-08-15" : undefined,
        visible: true,
        orden: order
      });

      existingSlugs.add(slug);
    }

    index += 1;
  }

  return products;
}
