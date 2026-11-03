import os
import re

src_dir = 'src'

# We want to find cases where JSX contains { ... } and the expression:
# 1. calls .find(...) but does NOT access a property on it, like {list.find(...)}
# 2. calls .filter(...) and does NOT call .map, .length, .reduce, .forEach, .some, .every
# 3. is a variable containing a list or record that is rendered directly

def check_file(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Let's find all JSX blocks: e.g. between > and <
    # Or more reliably, let's scan for JSX tags
    # A JSX expression { expr } that is rendered as a child is preceded by > (with optional whitespace)
    # or is after another } (with optional whitespace) inside a tag
    
    # Let's parse tokens or use regex for >\s*\{
    pos = 0
    while True:
        m = re.search(r'>\s*\{', content[pos:])
        if not m:
            break
        start_brace = pos + m.end() - 1
        # find matching }
        depth = 1
        j = start_brace + 1
        while j < len(content) and depth > 0:
            if content[j] == '{':
                depth += 1
            elif content[j] == '}':
                depth -= 1
            j += 1
        
        expr = content[start_brace + 1 : j - 1].strip()
        line_no = content[:start_brace].count('\n') + 1

        # Now let's analyze expr!
        # Check if expr has .find(
        if '.find(' in expr:
            # check if after .find(...), there is NO property access or optional chaining
            # e.g. list.find(...) without .prop or ?
            # Let's see all occurrences
            print(f"FIND in {fpath}:{line_no} -> {expr[:150]}")

        # Check if expr has .filter( without .map or .length or .reduce or .some
        if '.filter(' in expr:
            if not any(k in expr for k in ['.map(', '.length', '.reduce(', '.some(', '.every(', '.forEach(']):
                print(f"FILTER_NO_MAP in {fpath}:{line_no} -> {expr[:150]}")

        pos = j

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            fpath = os.path.join(root, file)
            check_file(fpath)
