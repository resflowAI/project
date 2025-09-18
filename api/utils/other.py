from collections import defaultdict
import numpy as np


def sentiment_to_color(x: float) -> str:
    """
    convert sentiment to color (red to green)
    """
    x = max(0.0, min(1.0, x))

    if x <= 0.5:
        r = 255
        g = int(2 * 255 * x)
    else:
        r = int(510 - 510 * x)
        g = 255

    b = 0
    hex_color = f"#{r:02X}{g:02X}{b:02X}"
    return hex_color


def ratings_to_hex(values, vmin=None, vmax=None):
    values = np.array(values, dtype=float)

    if vmin is None:
        vmin = float(values.min())
    if vmax is None:
        vmax = float(values.max())

    colors = {
        vmin: np.array([255, 136, 136]),
        (vmin + vmax) / 2: np.array([170, 170, 170]),
        vmax: np.array([136, 136, 255])
    }

    result = []
    for value in values:
        value = max(vmin, min(vmax, value))

        if value <= (vmin + vmax) / 2:
            x0, c0 = vmin, colors[vmin]
            x1, c1 = (vmin + vmax) / 2, colors[(vmin + vmax) / 2]
        else:
            x0, c0 = (vmin + vmax) / 2, colors[(vmin + vmax) / 2]
            x1, c1 = vmax, colors[vmax]

        t = (value - x0) / (x1 - x0)
        color = (c0 + (c1 - c0) * t).astype(int)

        result.append("#{:02X}{:02X}{:02X}".format(*color))

    return result


def group_by(data, key_index, sort_index=None, reverse=False):
    grouped = defaultdict(list)
    for item in data:
        grouped[item[key_index]].append(item)

    if sort_index is not None:
        for key in grouped:
            grouped[key] = sorted(grouped[key], key=lambda x: x[sort_index], reverse=reverse)

    return dict(grouped)
