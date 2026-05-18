#!/usr/bin/env python3
"""
Validates viewboost.html Babel/JSX script for common errors before push.
Run: python3 .claude/scripts/validate-html.py
"""
import re, sys

with open('viewboost.html', 'r') as f:
    html = f.read()

m = re.search(r'<script type="text/babel">([\s\S]*?)</script>', html)
if not m:
    print('❌ No Babel script found'); sys.exit(1)
script = m.group(1)
lines  = script.split('\n')
errors = []

# 1. Duplicate const/let in same scope (simple heuristic)
decls = {}
func_depth = 0
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if re.match(r'function \w+', stripped) or ('=> {' in stripped and stripped.endswith('{')):
        func_depth += 1
        decls[func_depth] = {}
    if stripped in ('}', '};', '})'): 
        decls.pop(func_depth, None)
        func_depth = max(0, func_depth - 1)
    dm = re.match(r'(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]{2,})', stripped)  # skip 1-2 char vars
    if dm:
        name = dm.group(1)
        if name in decls.get(func_depth, {}):
            errors.append(f'Line {i}: Duplicate "{name}" in same scope')
        else:
            decls.setdefault(func_depth, {})[name] = i

# 2. Unmatched JSX tags (rough)
ot = len(re.findall(r'<(?!\/|!|\?)[A-Za-z]', script))
ct = len(re.findall(r'<\/[A-Za-z]', script))
sc = len(re.findall(r'\/\s*>', script))
if abs(ot - ct - sc) > 25:
    errors.append(f'Possible unmatched JSX (open:{ot} close:{ct} self:{sc})')

# 3. Odd backtick count
bt = script.count('`')
if bt % 2 != 0:
    errors.append(f'Odd number of backticks ({bt}) — unclosed template literal')

# 4. English apostrophes INSIDE single-quoted string body
# Only catches patterns like: 'word's' or 'don't' (apostrophe followed by a letter)
# Ignores object notation like {color:'#fff', display:'flex'}
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'): continue
    # Find: '...word's...' — apostrophe-letter sequence inside a string value
    # Only flag if the single-quoted content looks like a sentence (has spaces)
    for m2 in re.finditer(r"'([^'\\\n]{10,})'", line):
        val = m2.group(1)
        if re.search(r"[a-z]'[a-z]", val):  # apostrophe between letters
            errors.append(f'Line {i}: Apostrophe in single-quoted string: {val[:50]}')
            break

if errors:
    print('\n❌ VALIDATION FAILED:\n')
    for e in errors: print(f'  • {e}')
    print()
    sys.exit(1)
else:
    print(f'✅ Validation passed ({len(lines)} lines, no obvious errors)')
