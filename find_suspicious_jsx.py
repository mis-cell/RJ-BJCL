import os
import re

src_dir = 'src'

# Look for patterns where a variable name that represents an item/record/row/object is placed as JSX child
# e.g. >{item}<, >{row}<, >{r}<, >{rec}<, >{insp}<, >{record}<, >{v}<, >{voucher}<, >{data}<
suspicious_names = {
    'item', 'row', 'r', 'rec', 'record', 'insp', 'inspection', 'voucher', 'v', 
    'data', 'master', 'masterData', 'obj', 'entry', 'm', 'val', 'res', 'doc',
    'selected', 'current', 'active', 'matched', 'amad', 'po', 'sauda'
}

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            fpath = os.path.join(root, file)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find all JSX expressions {...}
            # We can use regex to find { ... } between > and <, or multi-line
            # Let's find matches of >\s*\{([^}]+)\}\s*<
            matches = re.finditer(r'>\s*\{([^}]+)\}\s*<', content)
            for m in matches:
                expr = m.group(1).strip()
                tokens = re.split(r'[\s|&?:+*\/%!()]+', expr)
                for t in tokens:
                    if t in suspicious_names:
                        # find line number
                        line_no = content[:m.start()].count('\n') + 1
                        print(f"SUSPICIOUS in {fpath}:{line_no} -> expr: '{expr}'")

