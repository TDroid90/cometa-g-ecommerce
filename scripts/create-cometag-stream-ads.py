from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(r"C:\Users\TD\Documents\Codex\2026-06-03\COMETAG")
BACKGROUND = Path(r"C:\Users\TD\.codex\generated_images\019e8f59-9f90-7dc2-9f26-84ae458191f8\exec-c1229e92-1d35-4113-8e7b-7ef6666b0882.png")
LOGO = ROOT / "public" / "cometa-g-logo-cuadrado.png"
OUTPUT = ROOT / "CREATIVOS" / "anuncios-preventa"

WHITE = "#FFFFFF"
MUTED = "#D9CCD8"
PINK = "#ED168C"
RED = "#F20A25"
VIOLET = "#6419CB"
GREEN = "#27D17F"


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(Path(r"C:\Windows\Fonts") / name, size=size)


def cover(source, size, focus=(0.60, 0.5)):
    target_w, target_h = size
    scale = max(target_w / source.width, target_h / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, min(resized.width - target_w, round((resized.width - target_w) * focus[0])))
    top = max(0, min(resized.height - target_h, round((resized.height - target_h) * focus[1])))
    return resized.crop((left, top, left + target_w, top + target_h))


def darken(image, opacity=125):
    overlay = Image.new("RGBA", image.size, (5, 4, 10, opacity))
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def gradient_overlay(image, left_alpha=210, right_alpha=35):
    overlay = Image.new("RGBA", image.size)
    pixels = overlay.load()
    for x in range(image.width):
        alpha = int(left_alpha + (right_alpha - left_alpha) * x / max(1, image.width - 1))
        for y in range(image.height):
            pixels[x, y] = (4, 4, 10, alpha)
    return Image.alpha_composite(image, overlay)


def paste_logo(canvas, x, y, width):
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((width, width), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 120)).filter(ImageFilter.GaussianBlur(12))
    canvas.alpha_composite(shadow, (x + 7, y + 9))
    canvas.alpha_composite(logo, (x, y))


def rounded_box(draw, xy, fill, outline=None, radius=18, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def whatsapp_line(draw, x, y, size, text):
    radius = size // 2
    draw.ellipse((x, y, x + size, y + size), fill=GREEN)
    draw.ellipse((x + 5, y + 5, x + size - 5, y + size - 5), outline=WHITE, width=max(2, size // 10))
    draw.text((x + size + size // 3, y - size // 6), text, fill=WHITE, font=font(size, True))


def fit_text(draw, text, max_width, start_size, min_size=16):
    for size in range(start_size, min_size - 1, -1):
        candidate = font(size, True)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= max_width:
            return candidate
    return font(min_size, True)


def save(canvas, name):
    path = OUTPUT / name
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print(f"{path} {canvas.size}")


def top_horizontal(background):
    size = (1200, 120)
    canvas = gradient_overlay(darken(cover(background, size, (0.62, 0.48)), 40), 210, 20)
    draw = ImageDraw.Draw(canvas)
    paste_logo(canvas, 20, 20, 80)
    draw.text((122, 22), "PREVENTA", fill=WHITE, font=font(28, True))
    draw.text((122, 65), "Tu consulta no molesta", fill=MUTED, font=font(18, False))
    whatsapp_line(draw, 545, 45, 28, "WhatsApp: NUMERO")
    draw.text((1015, 51), "cometag.store", fill=WHITE, font=font(17, True))
    save(canvas, "COMETA_G_stream_top_horizontal_1200x120.png")


def left_stack(background):
    size = (600, 1080)
    canvas = cover(background, size, (0.68, 0.5)).convert("RGBA")
    canvas = gradient_overlay(darken(canvas, 55), 220, 50)
    draw = ImageDraw.Draw(canvas)
    paste_logo(canvas, 42, 42, 165)
    draw.text((42, 237), "PREVENTA", fill=PINK, font=font(62, True))
    title = "Tecnología para tu mundo"
    draw.multiline_text((42, 320), title, fill=WHITE, font=font(43, True), spacing=2)
    draw.text((42, 432), "Componentes, PCs y periféricos", fill=MUTED, font=font(22, False))
    rounded_box(draw, (42, 785, 558, 865), (17, 10, 25, 230), outline=PINK, radius=20, width=2)
    draw.text((70, 806), "Tu consulta no molesta", fill=WHITE, font=font(27, True))
    whatsapp_line(draw, 46, 903, 43, "WhatsApp: NUMERO")
    draw.text((46, 968), "Redes: REDES", fill=WHITE, font=font(24, True))
    draw.text((46, 1010), "www.cometag.store", fill=MUTED, font=font(21, False))
    save(canvas, "COMETA_G_stream_left_stack_600x1080.png")


def main_banner(background):
    size = (1600, 900)
    canvas = gradient_overlay(darken(cover(background, size, (0.61, 0.5)), 35), 225, 8)
    draw = ImageDraw.Draw(canvas)
    paste_logo(canvas, 70, 65, 185)
    draw.text((70, 296), "PREVENTA", fill=PINK, font=font(70, True))
    draw.multiline_text((70, 385), "Tecnología para\ntu mundo", fill=WHITE, font=font(70, True), spacing=0)
    draw.text((70, 570), "Componentes, PCs y periféricos", fill=MUTED, font=font(30, False))
    rounded_box(draw, (70, 665, 600, 750), (17, 10, 25, 235), outline=PINK, radius=22, width=3)
    draw.text((104, 690), "Tu consulta no molesta", fill=WHITE, font=font(29, True))
    whatsapp_line(draw, 73, 794, 32, "WhatsApp: NUMERO")
    draw.text((620, 801), "Redes: REDES", fill=WHITE, font=font(22, True))
    draw.text((925, 801), "www.cometag.store", fill=WHITE, font=font(22, True))
    save(canvas, "COMETA_G_main_banner_stream_1600x900.png")


def banner_grid(background):
    size = (800, 900)
    canvas = cover(background, size, (0.67, 0.50)).convert("RGBA")
    canvas = gradient_overlay(darken(canvas, 45), 215, 60)
    draw = ImageDraw.Draw(canvas)
    paste_logo(canvas, 42, 42, 145)
    draw.text((42, 230), "PREVENTA", fill=PINK, font=font(64, True))
    draw.multiline_text((42, 310), "Tu tecnología\nestá acá", fill=WHITE, font=font(60, True), spacing=0)
    rounded_box(draw, (42, 680, 595, 756), (17, 10, 25, 230), outline=PINK, radius=20, width=2)
    draw.text((70, 702), "Tu consulta no molesta", fill=WHITE, font=font(27, True))
    whatsapp_line(draw, 46, 793, 40, "WhatsApp: NUMERO")
    draw.text((46, 850), "www.cometag.store", fill=WHITE, font=font(23, True))
    save(canvas, "COMETA_G_banner_grid_800x900.png")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    background = Image.open(BACKGROUND).convert("RGBA")
    top_horizontal(background)
    left_stack(background)
    main_banner(background)
    banner_grid(background)


if __name__ == "__main__":
    main()
