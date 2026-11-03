import os
import re

src_dir = 'src'

# Check all .tsx files for .find( or .filter( inside JSX expressions { ... }
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            fpath = os.path.join(root, file)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find all {...} in the file
            # Let's find matches of { [^}]* \.find\( [^}]* }
            # But braces can be nested, so let's parse braces properly
            i = 0
            n = len(content)
            while i < n:
                if content[i] == '{':
                    # find matching closing brace
                    depth = 1
                    j = i + 1
                    while j < n and depth > 0:
                        if content[j] == '{':
                            depth += 1
                        elif content[j] == '}':
                            depth -= 1
                        j += 1
                    expr = content[i+1:j-1].strip()
                    # Check if expr contains .find( or .filter(
                    if '.find(' in expr or '.filter(' in expr:
                        line_no = content[:i].count('\n') + 1
                        # If .filter( is in expr, does it NOT have .map or .length or .reduce or some or every?
                        # If .find( is in expr, what is after .find(...)? Does it NOT have .something?
                        print(f"{fpath}:{line_no} EXPR: {expr[:120]}")
                    i = j
                else:
                    i += 1
