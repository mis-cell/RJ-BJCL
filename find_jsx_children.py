import re

files_to_check = [
    'src/pages/MaterialInspection.tsx',
    'src/pages/Inspection.tsx',
    'src/pages/MrSettlement.tsx',
    'src/pages/Dashboard.tsx',
    'src/pages/PurchaseOrder.tsx',
    'src/pages/TemporaryArrival.tsx',
    'src/pages/AmadRegister.tsx',
    'src/App.tsx'
]

# We want to find any JSX child {expr} between tags >{expr}< or alone on a line
for fpath in files_to_check:
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        # find anything like >{...}<
        matches = re.findall(r'>\s*\{([^}]+)\}\s*<', line)
        for m in matches:
            expr = m.strip()
            # print suspicious expressions
            # if expr is a single identifier or property access that could be an object
            # or if expr is something unusual
            # Let's filter out primitives
            if any(k in expr for k in ['record', 'item', 'row', 'insp', 'vouch', 'v.', 'rec', 'masterData', 'selected']):
                print(f"{fpath}:{idx+1}: {expr} in line: {line.strip()[:120]}")
