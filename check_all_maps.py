import os
import re

src_dir = 'src'

# Match any JSX expression inside JSX tags
# e.g. <Tag>{expr}</Tag> or <Tag ...>{expr}</Tag>
# or {expr} between tags
tag_content_pattern = re.compile(r'>\s*\{([^<>{}]*(?:\{[^{}]*\}[^<>{}]*)*)\}\s*<', re.DOTALL)

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            fpath = os.path.join(root, file)
            with open(fpath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_idx, line in enumerate(lines, 1):
                # match single line >{...}<
                for m in re.finditer(r'>\s*\{([^}]+)\}\s*<', line):
                    expr = m.group(1).strip()
                    # We want to catch expressions that are just a variable name or something that could evaluate to an object
                    # Especially if it has no . or [ or string quotes or numbers or operators
                    if re.match(r'^[a-zA-Z0-9_$]+$', expr):
                        if expr not in ['children', 'title', 'subtitle', 'count', 'idx', 'index', 'i', 'total', 'label', 'value', 'text', 'name', 'msg', 'message', 'err', 'error', 'key', 'q']:
                            print(f"{fpath}:{line_idx} Single var: '{expr}' -> {line.strip()[:100]}")
