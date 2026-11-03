import os
import re

src_dir = 'src'

# Let's inspect all files, finding all JSX tags and their children
# We want to find any `{...}` that is rendered as a child of a JSX element

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            fpath = os.path.join(root, file)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Find all {...} that are between > and <
            # Using regex: >([^<]*\{[^<]+?\}[^<]*)<
            matches = re.finditer(r'>([^<]*\{[^<]+?\}[^<]*)<', content)
            for m in matches:
                inner = m.group(1).strip()
                # find all {expr} in inner
                exprs = re.findall(r'\{([^}]+)\}', inner)
                for expr in exprs:
                    expr_clean = expr.strip()
                    # Filter out obvious safe expressions:
                    # - string literals or numbers
                    # - method calls with format/toFixed/toLowerCase/toString
                    # - boolean conditions before ? or && (if it's not the rendered value)
                    # Let's check for keywords related to inspection, arrival, mr, po, master, voucher, table, etc.
                    keywords = ['arrival', 'insp', 'voucher', 'mr', 'po', 'record', 'row', 'item', 'data', 'master', 'settle']
                    for kw in keywords:
                        if kw in expr_clean.lower():
                            # get line number
                            line_no = content[:m.start()].count('\n') + 1
                            # print if it looks suspicious (e.g. no property access, or fallback to object)
                            print(f"{fpath}:{line_no} [{kw}] -> {expr_clean}")
