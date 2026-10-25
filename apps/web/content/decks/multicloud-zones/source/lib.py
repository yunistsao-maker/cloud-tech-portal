import html as _html

CLOUDS = ('aws', 'azure', 'gcp')
LH = {'tl': 18, 'tt': 24, 'tt-s': 21, 'ts': 20, 'tm': 18}

def esc(s):
    return _html.escape(str(s), quote=True)

def T(x, y, s, cls='ts', anchor='start'):
    return (f'<text x="{x:g}" y="{y:g}" class="{cls}" text-anchor="{anchor}" '
            f'dominant-baseline="central">{esc(s)}</text>')

def TC(x, y, d, cls='tm', anchor='start'):
    """Text that varies by cloud. d is a str or {aws,azure,gcp}."""
    if isinstance(d, str):
        return T(x, y, d, cls, anchor)
    return ''.join(T(x, y, d[c], f'{cls} c-{c}', anchor) for c in CLOUDS)

def R(x, y, w, h, cls='nb', rx=10):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" class="{cls}"/>'

def node(x, y, w, h, lines, z=None, cls=None, align='middle', pad=16, rx=10):
    total = sum(LH[c.split()[0]] for c, _ in lines)
    cy = y + h / 2 - total / 2
    rect_cls = cls or ('nd' if z else 'nb')
    out = [R(x, y, w, h, rect_cls, rx)]
    tx = x + w / 2 if align == 'middle' else x + pad
    anchor = 'middle' if align == 'middle' else 'start'
    for c, t in lines:
        h0 = LH[c.split()[0]]
        out.append(TC(tx, cy + h0 / 2, t, c, anchor))
        cy += h0
    g = f'<g class="{z}">' if z else '<g>'
    return g + ''.join(out) + '</g>'

def A(d, cls='', end=True, start=False):
    kind = cls.split()[0] if cls else ''
    mk = {'in': 'ah-in', 'out': 'ah-out', 'mg': 'ah-mg', 'int': 'ah-int'}.get(kind, 'ah')
    m = ''
    if end:
        m += f' marker-end="url(#{mk})"'
    if start:
        m += f' marker-start="url(#{mk})"'
    return f'<path d="{d}" class="ln {cls}"{m}/>'

def L(d, cls=''):
    return f'<path d="{d}" class="ln {cls}"/>'

def text_w(s, size=12):
    w = 0
    for ch in s:
        w += size * (1.0 if ord(ch) > 0x2E80 else 0.6)
    return w

def P(x, y, s):
    w = text_w(s, 12) + 18
    return (f'<g class="pill"><rect x="{x - w / 2:g}" y="{y - 11:g}" width="{w:g}" height="22" rx="11"/>'
            f'{T(x, y, s, "", "middle")}</g>')

def B(x, y, n):
    return (f'<g class="bdg"><circle cx="{x:g}" cy="{y:g}" r="11"/>'
            f'<text x="{x:g}" y="{y + 0.5:g}" text-anchor="middle" dominant-baseline="central">{n}</text></g>')

def X(x, y):
    return (f'<g class="xm"><circle cx="{x:g}" cy="{y:g}" r="11"/>'
            f'<path d="M{x - 4:g} {y - 4:g}L{x + 4:g} {y + 4:g}M{x + 4:g} {y - 4:g}L{x - 4:g} {y + 4:g}"/></g>')

DEFS = ('<defs>' + ''.join(
    f'<marker id="{i}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" '
    f'orient="auto-start-reverse"><path class="mk {c}" d="M1 1L9 5L1 9z"/></marker>'
    for i, c in (('ah', ''), ('ah-in', 'in'), ('ah-out', 'out'), ('ah-mg', 'mg'), ('ah-int', 'int'))) + '</defs>')

def svg(w, h, body, title):
    return (f'<svg class="dg" viewBox="0 0 {w} {h}" role="img" preserveAspectRatio="xMidYMid meet">'
            f'<title>{esc(title)}</title>{DEFS}{"".join(body)}</svg>')

ZONE_LABEL = {'ext': ('z-ext', 'External'), 'dmz': ('z-dmz', 'DMZ'), 'int': ('z-int', 'Internal'),
              'mgmt': ('z-mgmt', 'Mgmt'), 'peer': ('z-ext', 'Peer')}

def zchips(zones):
    out = []
    for z in zones:
        cls, lab = ZONE_LABEL[z]
        out.append(f'<span class="zchip {cls}"><i></i>{lab}</span>')
    return '<div class="zchips">' + ''.join(out) + '</div>'
