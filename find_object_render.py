import os
import re

src_dir = 'src'
pattern = re.compile(r'>\s*\{([^}?:&|<>()]+)\}\s*<')

results = []

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            fpath = os.path.join(root, file)
            with open(fpath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            for line_no, line in enumerate(lines, 1):
                # find all occurrences of >{identifier}<
                matches = pattern.findall(line)
                for m in matches:
                    var = m.strip()
                    # ignore common primitives like idx, count, etc.
                    if not var.isdigit() and not var in ['true', 'false', 'null', 'undefined']:
                        results.append((fpath, line_no, var, line.strip()))

print(f"Total occurrences found: {len(results)}")
for fpath, line_no, var, line in results[:100]:
    print(f"{fpath}:{line_no} [{var}] -> {line[:100]}")
