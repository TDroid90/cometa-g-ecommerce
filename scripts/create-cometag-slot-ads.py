from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(r"C:\Users\TD\Documents\Codex\2026-06-03\COMETAG")
ASSETS = ROOT / "CREATIVOS" / "ads-2026" / "assets"
OUTPUT = ROOT / "CREATIVOS" / "ads-2026" / "final"
BACKGROUND = ASSETS / "cometa-g-hardware-background.png"
LOGO = ROOT / "public" / "cometa-g-logo-cuadrado.png"

WHITE = "#FFFFFF"
MUTED = "#D9CCD8"
PINK = "#ED168C"
GREEN = "#27D17F"


def font(size, bold=False):
    return ImageFont.truetype(Path(r"C:\Windows\Fonts") / ("arialbd.ttf" if bold else "arial.ttf"), size)


def cover(source, size, focus=(0.6, 0.5)):
    width, height = size
    scale = max(width / source.width, height / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, min(resized.width - width, round((resized.width - width) * focus[0])))
    top = max(0, min(resized.height - height, round((resized.height - height) * focus[1])))
    return resized.crop((left, top, left + width, top + height)).convert("RGBA")


def canvas(background, size, dark=55, left_alpha=210, right_alpha=20):
    image = cover(background, size)
    image = Image.alpha_composite(image, Image.new("RGBA", size, (4, 4, 10, dark)))
    overlay = Image.new("RGBA", size)
    pixels = overlay.load()
    for x in range(size[0]):
        alpha = int(left_alpha + (right_alpha - left_alpha) * x / max(1, size[0] - 1))
        for y in range(size[1]):
            pixels[x, y] = (4, 4, 10, alpha)
    return Image.alpha_composite(image, overlay)


def paste_logo(image, x, y, size):
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((size, size), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 130)).filter(ImageFilter.GaussianBlur(max(3, size // 12)))
    image.alpha_composite(shadow, (x + 3, y + 4))
    image.alpha_composite(logo, (x, y))


def pill(draw, xy, label, size):
    draw.rounded_rectangle(xy, radius=max(5, size // 2), fill=(17, 10, 25, 235), outline=PINK, width=max(1, size // 14))
    draw.text((xy[0] + size, xy[1] + max(1, size // 5)), label, fill=WHITE, font=font(size, True))


def whatsapp(draw, x, y, size, label):
    draw.ellipse((x, y, x + size, y + size), fill=GREEN)
    draw.ellipse((x + max(2, size // 8), y + max(2, size // 8), x + size - max(2, size // 8), y + size - max(2, size // 8)), outline=WHITE, width=max(1, size // 11))
    draw.text((x + size + size // 3, y - max(1, size // 8)), label, fill=WHITE, font=font(size, True))


def save(image, name):
    path = OUTPUT / name
    image.convert("RGB").save(path, "PNG", optimize=True)
    print(f"{path.name}: {image.size}")


def stream_left(background):
    image = canvas(background, (260, 410), 75, 220, 60)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 18, 16, 68)
    draw.text((18, 104), "PREVENTA", fill=PINK, font=font(29, True))
    draw.multiline_text((18, 145), "Tecnología\npara tu mundo", fill=WHITE, font=font(26, True), spacing=0)
    pill(draw, (18, 276, 239, 320), "Tu consulta no molesta", 13)
    whatsapp(draw, 18, 340, 19, "WhatsApp: NUMERO")
    draw.text((18, 383), "cometag.store", fill=MUTED, font=font(13, True))
    save(image, "COMETA_G_stream_left_stack_260x410.png")


def stream_top(background):
    image = canvas(background, (630, 70), 45, 210, 15)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 10, 12, 46)
    draw.text((68, 13), "PREVENTA", fill=WHITE, font=font(18, True))
    draw.text((68, 40), "Tu consulta no molesta", fill=MUTED, font=font(12, False))
    whatsapp(draw, 322, 25, 17, "WhatsApp: NUMERO")
    draw.text((540, 31), "cometag.store", fill=WHITE, font=font(11, True))
    save(image, "COMETA_G_stream_top_horizontal_630x70.png")


def stream_main(background):
    image = canvas(background, (1270, 830), 40, 225, 10)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 55, 48, 168)
    draw.text((55, 268), "PREVENTA", fill=PINK, font=font(63, True))
    draw.multiline_text((55, 347), "Tecnología para\ntu mundo", fill=WHITE, font=font(63, True), spacing=0)
    draw.text((55, 515), "Componentes, PCs y periféricos", fill=MUTED, font=font(27, False))
    pill(draw, (55, 608, 487, 679), "Tu consulta no molesta", 25)
    whatsapp(draw, 58, 724, 31, "WhatsApp: NUMERO")
    draw.text((500, 733), "Redes: REDES", fill=WHITE, font=font(20, True))
    draw.text((748, 733), "www.cometag.store", fill=WHITE, font=font(20, True))
    save(image, "COMETA_G_main_banner_stream_1270x830.png")


def home_grid(background):
    image = canvas(background, (295, 325), 75, 220, 50)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 18, 16, 64)
    draw.text((18, 98), "PREVENTA", fill=PINK, font=font(29, True))
    draw.multiline_text((18, 137), "Tu tecnología\nestá acá", fill=WHITE, font=font(27, True), spacing=0)
    pill(draw, (18, 238, 273, 277), "Tu consulta no molesta", 13)
    draw.text((18, 293), "WhatsApp: NUMERO · cometag.store", fill=WHITE, font=font(11, True))
    save(image, "COMETA_G_banner_grid_home_295x325.png")


def home_header(background):
    image = canvas(background, (730, 30), 35, 185, 15)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 5, 4, 22)
    draw.text((34, 5), "COMETA G · PREVENTA", fill=WHITE, font=font(12, True))
    draw.text((526, 8), "cometag.store", fill=WHITE, font=font(10, True))
    save(image, "COMETA_G_banner_header_home_730x30.png")


def feed_large(background):
    image = canvas(background, (320, 270), 75, 220, 45)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 18, 16, 56)
    draw.text((18, 88), "PREVENTA", fill=PINK, font=font(29, True))
    draw.multiline_text((18, 127), "Tecnología\npara tu mundo", fill=WHITE, font=font(27, True), spacing=0)
    draw.text((18, 221), "Tu consulta no molesta", fill=WHITE, font=font(16, True))
    draw.text((18, 245), "cometag.store", fill=MUTED, font=font(13, True))
    save(image, "COMETA_G_feed_lateral_large_320x270.png")


def feed_small(background):
    image = canvas(background, (350, 45), 40, 210, 15)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 7, 7, 31)
    draw.text((47, 8), "COMETA G · PREVENTA", fill=WHITE, font=font(16, True))
    draw.text((245, 14), "cometag.store", fill=MUTED, font=font(11, True))
    save(image, "COMETA_G_feed_lateral_small_350x45.png")


def ultimas_noticias(background):
    image = canvas(background, (500, 700), 78, 120, 78)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 156, 42, 188)
    draw.text((250, 256), "ARMÁ TU", fill=WHITE, font=font(54, True), anchor="ma")
    draw.text((250, 315), "PC GAMER", fill=PINK, font=font(54, True), anchor="ma")
    draw.multiline_text(
        (250, 389),
        "Componentes, periféricos\ny notebooks.",
        fill=MUTED,
        font=font(23, False),
        spacing=4,
        anchor="ma",
        align="center",
    )
    draw.rounded_rectangle((67, 494, 433, 560), radius=18, fill=(232, 22, 140, 255))
    draw.text((250, 511), "Tu consulta no molesta  →", fill=WHITE, font=font(21, True), anchor="ma")
    draw.text((250, 614), "www.cometag.store", fill=WHITE, font=font(21, True), anchor="ma")
    save(image, "COMETA_G_ultimas_noticias_500x700.png")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    background = Image.open(BACKGROUND).convert("RGBA")
    stream_left(background)
    stream_top(background)
    stream_main(background)
    home_grid(background)
    home_header(background)
    feed_large(background)
    feed_small(background)
    ultimas_noticias(background)


if __name__ == "__main__":
    main()
