from pathlib import Path
import html

src = Path('docs/postman-required-endpoints-guide.txt')
dst = Path('docs/postman-required-endpoints-guide.html')
text = src.read_text(encoding='utf-8')
body = html.escape(text)

html_doc = """<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\">
  <title>Group 8 Postman Required Endpoints Guide</title>
  <style>
    body { font-family: Consolas, \"Courier New\", monospace; background: #f5f7fb; color: #111; line-height: 1.35; margin: 0; padding: 32px; }
    .page { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #d8dce6; border-radius: 10px; box-shadow: 0 3px 10px rgba(0,0,0,.05); padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 14px 0; font-family: Segoe UI, Arial, sans-serif; }
    .meta { font: 14px Segoe UI, Arial, sans-serif; color: #555; margin-bottom: 20px; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 12.5px; margin: 0; }
    @page { size: A4; margin: 18mm; }
  </style>
</head>
<body>
  <div class=\"page\">
    <h1>Group 8 Postman Required Endpoints Guide</h1>
    <div class=\"meta\">Generated for group sharing</div>
    <pre>""" + body + """</pre>
  </div>
</body>
</html>
"""

dst.write_text(html_doc, encoding='utf-8')
print(dst)
