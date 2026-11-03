import re

with open("src/pages/MaterialInspection.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Match standard JSX expressions {var} or {var_name} (with no dots, brackets, or functions)
matches = re.finditer(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', content)

output_lines = []
for match in matches:
    pos = match.start()
    line_no = content[:pos].count("\n") + 1
    var_name = match.group(1)
    
    line_content = content.split("\n")[line_no - 1]
    # Simple check to see if it looks like a JSX child
    # e.g., if there's a tag <... or ...> around it on the same line, or tags on adjacent lines.
    output_lines.append(f"Line {line_no}: {line_content.strip()} (variable: {var_name})")

with open("scripts/vars_output.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(output_lines))

print("Done! Matches written to scripts/vars_output.txt")
