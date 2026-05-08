import zipfile, re, html

with zipfile.ZipFile('Solviva Calc v.B.2.4.xlsm', 'r') as z:
    with z.open('xl/worksheets/sheet2.xml') as f:
        calc = f.read().decode()
    with z.open('xl/worksheets/sheet1.xml') as f:
        admin = f.read().decode()

pat_c = re.compile(r'<c r="([A-Z]+[0-9]+)"[^>]*>(.*?)</c>', re.DOTALL)
pat_f = re.compile(r'<f[^>]*>(.*?)</f>', re.DOTALL)
pat_v = re.compile(r'<v>(.*?)</v>')

print("=== CALCULATOR sheet - Q/R/Z cols, rows 1-40 ===")
for m in pat_c.finditer(calc):
    ref = m.group(1)
    content = m.group(2)
    col = re.sub(r'[0-9]', '', ref)
    row = int(re.sub(r'[A-Z]', '', ref))
    if col in ('Q', 'R', 'Z') and 1 <= row <= 40:
        fm = pat_f.search(content)
        vm = pat_v.search(content)
        formula = html.unescape(fm.group(1)) if fm else ''
        value = vm.group(1) if vm else ''
        print(f'  {ref}: formula={formula!r}  value={value!r}')

print("\n=== ADMIN sheet - B/C cols, rows 78-95 ===")
for m in pat_c.finditer(admin):
    ref = m.group(1)
    content = m.group(2)
    col = re.sub(r'[0-9]', '', ref)
    row = int(re.sub(r'[A-Z]', '', ref))
    if col in ('B', 'C') and 78 <= row <= 95:
        fm = pat_f.search(content)
        vm = pat_v.search(content)
        formula = html.unescape(fm.group(1)) if fm else ''
        value = vm.group(1) if vm else ''
        print(f'  {ref}: formula={formula!r}  value={value!r}')
