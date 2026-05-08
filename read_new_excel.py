import zipfile, re, html

fname = 'v1.3_Solviva Proposal Generator 2026.xlsx'
with zipfile.ZipFile(fname, 'r') as z:
    shared = []
    try:
        with z.open('xl/sharedStrings.xml') as f:
            ss = f.read().decode()
        shared = re.findall(r'<t[^>]*>(.*?)</t>', ss, re.DOTALL)
        shared = [html.unescape(s) for s in shared]
    except:
        pass

    with z.open('xl/workbook.xml') as f:
        wb = f.read().decode()
    names = re.findall(r'name="([^"]+)"', wb)
    print('Sheet names:', names[:10])

    kWp_values = {5, 6, 8, 10, 13, 15, 20,
                  5.04, 6.3, 6.93, 8.19, 10.08, 11.97, 13.23, 15.75, 16.38, 19.53}

    for i in range(1, 9):
        try:
            with z.open(f'xl/worksheets/sheet{i}.xml') as f:
                content = f.read().decode()
            pat = re.compile(r'<c r="([A-Z]+[0-9]+)"([^>]*)>(.*?)</c>', re.DOTALL)
            pat_v = re.compile(r'<v>(.*?)</v>')
            hits = []
            for m in pat.finditer(content):
                ref = m.group(1)
                attrs = m.group(2)
                cell = m.group(3)
                vm = pat_v.search(cell)
                if not vm:
                    continue
                val = vm.group(1)
                if 't="s"' in attrs:
                    idx = int(val)
                    txt = shared[idx] if idx < len(shared) else val
                    if any(kw in txt.lower() for kw in ['kwp', 'kw ', 'system', 'panel', 'size']):
                        hits.append(f'  {ref}: {txt!r}')
                else:
                    try:
                        fval = float(val)
                        if fval in kWp_values:
                            hits.append(f'  {ref}: {fval}')
                    except:
                        pass
            if hits:
                sname = names[i-1] if i-1 < len(names) else f'sheet{i}'
                print(f'\nSheet {i} ({sname}):')
                for h in hits[:40]:
                    print(h)
        except Exception as e:
            print(f'Sheet {i} error: {e}')
