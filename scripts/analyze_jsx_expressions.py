import re

with open("src/pages/MaterialInspection.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find all curly braces contents.
expressions = []
n = len(content)
i = 0
while i < n:
    if content[i] == '{':
        start = i
        brace_count = 1
        i += 1
        while i < n and brace_count > 0:
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
            i += 1
        expr = content[start:i]
        expressions.append((start, expr))
    else:
        i += 1

suspicious = []
for start, expr in expressions:
    inner = expr[1:-1].strip()
    
    # Exclude common non-JSX curly uses
    before = content[max(0, start-40):start]
    
    # If the expression is preceded by a variable/function definition or is an interface, skip it.
    if any(k in before for k in ["interface ", "type ", "const ", "let ", "function ", "import ", "class "]):
        continue
    if any(k in inner for k in ["interface ", "type ", "const ", "let ", "function ", "import ", "class "]):
        continue
        
    # If it's a prop assignment
    if re.search(r'=\s*$', before):
        continue
        
    # If it is a comment
    if inner.startswith("/*") and inner.endswith("*/"):
        continue
        
    # Only look for actual JSX children containing row/item/v/insp
    if any(w in inner for w in ["row", "item", "v", "insp"]):
        # Make sure it's not a multiline complex block unless it's a map/filter expression
        if "\n" in inner and not (".map" in inner or ".filter" in inner or "=>" in inner):
            continue
            
        line_no = content[:start].count("\n") + 1
        suspicious.append((line_no, inner.replace("\n", " ")))

with open("scripts/jsx_expressions_analysis_clean.txt", "w", encoding="utf-8") as out:
    for line_no, expr in suspicious:
        out.write(f"Line {line_no}: {expr}\n")

print(f"Done! Found {len(suspicious)} clean suspicious expressions.")
