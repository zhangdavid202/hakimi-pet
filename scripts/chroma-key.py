"""Chroma-key & bottom-align generated catgirl sprites into transparent PNGs and meme stickers."""

import glob
import os
import sys
from PIL import Image

ARTIFACT_DIR = r"C:\Users\NJ\.gemini\antigravity\brain\fee00b47-5095-45cc-8027-a691f5dbef8b"
PROJECT_DIR = r"e:\反重力\hakimi-pet"
SPRITE_OUT = os.path.join(PROJECT_DIR, "assets", "sprites")
ACTION_OUT = os.path.join(SPRITE_OUT, "actions")
MEME_OUT = os.path.join(PROJECT_DIR, "assets", "memes")

MOOD_TO_MEME = {
    "idle": "可爱",
    "happy": "开心跃动",
    "shy": "害羞",
    "angry": "傲娇生气",
    "sleep": "深度睡眠",
    "eat": "吃白饭",
}

ACTION_KEY_TO_NAME = {
    "turn": "东张西望",
    "drag": "被鼠标拖拽悬空反馈",
    "wave": "点击回应-元气挥手",
    "run": "轻快奔跑",
    "code": "写代码",
    "curtsy": "猫娘屈膝礼仪",
}


def is_green_bg(r: int, g: int, b: int) -> bool:
    """Detect chroma-key green background pixels reliably (safe: character has no green)."""
    return g > 110 and (g - max(r, b)) > 28


def chroma_key_image(img: Image.Image) -> Image.Image:
    """Remove all chroma-key green regions (including enclosed loops) and despill edges."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            if is_green_bg(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)

    for _ in range(2):
        to_update: list[tuple[int, int, tuple[int, int, int, int]]] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                touches_bg = any(
                    0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] == 0
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                )
                if touches_bg and g > max(r, b):
                    excess = g - max(r, b)
                    if excess > 18:
                        to_update.append((x, y, (0, 0, 0, 0)))
                    else:
                        new_g = max(r, b)
                        new_a = max(60, a - excess * 3)
                        to_update.append((x, y, (r, new_g, b, new_a)))
        for x, y, val in to_update:
            pixels[x, y] = val

    return rgba


def crop_and_resize_sprite(rgba: Image.Image, target_h: int = 512) -> Image.Image:
    """Crop tightly to non-transparent bounding box and normalize height with feet aligned."""
    bbox = rgba.getbbox()
    if not bbox:
        raise ValueError("Empty image after chroma key")
    cropped = rgba.crop(bbox)
    cw, ch = cropped.size
    scale = target_h / ch
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (nw + 24, nh + 16), (0, 0, 0, 0))
    canvas.paste(resized, (12, 12), resized)
    return canvas


def make_meme_sticker(sprite: Image.Image, size: int = 256) -> Image.Image:
    """Create a square upper-body sticker from the transparent sprite."""
    w, h = sprite.size
    crop_h = min(h, int(w * 1.05))
    upper = sprite.crop((0, 0, w, crop_h))
    side = max(upper.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(upper, ((side - upper.size[0]) // 2, (side - upper.size[1]) // 2), upper)
    return square.resize((size, size), Image.Resampling.LANCZOS)


def main() -> int:
    os.makedirs(SPRITE_OUT, exist_ok=True)
    os.makedirs(ACTION_OUT, exist_ok=True)
    os.makedirs(MEME_OUT, exist_ok=True)

    for mood, meme_name in MOOD_TO_MEME.items():
        candidates = sorted(glob.glob(os.path.join(ARTIFACT_DIR, f"raw_{mood}_*.*")))
        if not candidates:
            continue
        with Image.open(candidates[-1]) as img:
            sprite = crop_and_resize_sprite(chroma_key_image(img))
            sprite_path = os.path.join(SPRITE_OUT, f"{mood}.png")
            sprite.save(sprite_path, "PNG")
            sticker = make_meme_sticker(sprite)
            sticker.save(os.path.join(MEME_OUT, f"{meme_name}.png"), "PNG")
            print(f"OK mood={mood} -> {sprite_path} ({sprite.size})")

    missing = []
    for key, action_name in ACTION_KEY_TO_NAME.items():
        candidates = sorted(glob.glob(os.path.join(ARTIFACT_DIR, f"raw_act_{key}_*.*")))
        if not candidates:
            missing.append(f"{key} ({action_name})")
            continue
        with Image.open(candidates[-1]) as img:
            sprite = crop_and_resize_sprite(chroma_key_image(img))
            out_path = os.path.join(ACTION_OUT, f"{action_name}.png")
            sprite.save(out_path, "PNG")
            print(f"OK action={action_name} -> {out_path} ({sprite.size})")

    if missing:
        print(f"MISSING raw action images: {missing}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
