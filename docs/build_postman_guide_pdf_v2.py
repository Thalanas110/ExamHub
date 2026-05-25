from pathlib import Path
import textwrap

SRC = Path('docs/postman-required-endpoints-guide.txt')
DST = Path('docs/postman-required-endpoints-guide-v2.pdf')

PAGE_WIDTH = 595.28   # A4 width in points
PAGE_HEIGHT = 841.89  # A4 height in points
MARGIN_LEFT = 40.0
MARGIN_TOP = 40.0
FONT_SIZE = 9.0
LINE_HEIGHT = 12.0

MAX_TEXT_WIDTH = PAGE_WIDTH - (MARGIN_LEFT * 2)
# Courier width is 600 units in 1000 em => ~0.6 * font size
CHARS_PER_LINE = max(40, int(MAX_TEXT_WIDTH / (FONT_SIZE * 0.6)))
LINES_PER_PAGE = max(20, int((PAGE_HEIGHT - (MARGIN_TOP * 2)) / LINE_HEIGHT))


def wrap_line(line: str) -> list[str]:
    if line == '':
        return ['']

    leading = len(line) - len(line.lstrip(' '))
    indent = ' ' * leading
    content = line[leading:]

    width = max(20, CHARS_PER_LINE - leading)

    wrapped = textwrap.wrap(
        content,
        width=width,
        expand_tabs=False,
        replace_whitespace=False,
        drop_whitespace=False,
        break_long_words=True,
        break_on_hyphens=False,
    )

    if not wrapped:
        return [indent]

    return [indent + part for part in wrapped]


def chunk(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def pdf_escape(text: str) -> str:
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def make_content_stream(lines: list[str]) -> bytes:
    commands = [
        'BT',
        f'/F1 {FONT_SIZE:.2f} Tf',
        f'{MARGIN_LEFT:.2f} {PAGE_HEIGHT - MARGIN_TOP:.2f} Td',
        f'{LINE_HEIGHT:.2f} TL',
    ]

    for line in lines:
        safe = pdf_escape(line)
        commands.append(f'({safe}) Tj')
        commands.append('T*')

    commands.append('ET')
    return ('\n'.join(commands) + '\n').encode('latin-1', errors='replace')


def build_pdf(page_streams: list[bytes]) -> bytes:
    objects: list[bytes] = []

    # 1: Catalog
    objects.append(b'<< /Type /Catalog /Pages 2 0 R >>')

    # 2: Pages tree
    page_kids = []
    for i in range(len(page_streams)):
        page_obj = 4 + (i * 2)
        page_kids.append(f'{page_obj} 0 R')
    pages_dict = f"<< /Type /Pages /Kids [{' '.join(page_kids)}] /Count {len(page_streams)} >>".encode('ascii')
    objects.append(pages_dict)

    # 3: Font
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>')

    # Page and content objects
    for i, stream in enumerate(page_streams):
        page_obj = 4 + (i * 2)
        content_obj = page_obj + 1

        page_dict = (
            f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH:.2f} {PAGE_HEIGHT:.2f}] '
            f'/Resources << /Font << /F1 3 0 R >> >> /Contents {content_obj} 0 R >>'
        ).encode('ascii')
        objects.append(page_dict)

        content_stream = (
            b'<< /Length ' + str(len(stream)).encode('ascii') + b' >>\nstream\n' +
            stream +
            b'endstream'
        )
        objects.append(content_stream)

    out = bytearray()
    out.extend(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')

    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f'{idx} 0 obj\n'.encode('ascii'))
        out.extend(obj)
        out.extend(b'\nendobj\n')

    xref_offset = len(out)
    total_entries = len(objects) + 1

    out.extend(f'xref\n0 {total_entries}\n'.encode('ascii'))
    out.extend(b'0000000000 65535 f \n')
    for off in offsets[1:]:
        out.extend(f'{off:010d} 00000 n \n'.encode('ascii'))

    out.extend(
        f'trailer\n<< /Size {total_entries} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n'.encode('ascii')
    )

    return bytes(out)


def main():
    text = SRC.read_text(encoding='utf-8')

    all_lines: list[str] = []
    for raw_line in text.splitlines():
        all_lines.extend(wrap_line(raw_line.rstrip('\n\r')))

    if not all_lines:
        all_lines = ['(empty)']

    pages = list(chunk(all_lines, LINES_PER_PAGE))
    streams = [make_content_stream(page_lines) for page_lines in pages]
    pdf_bytes = build_pdf(streams)

    DST.write_bytes(pdf_bytes)
    print(DST)


if __name__ == '__main__':
    main()

