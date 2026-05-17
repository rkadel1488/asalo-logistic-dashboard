#!/usr/bin/env python3
"""
Validates viewboost.html Babel/JSX script for common errors before push.
Run: python3 .claude/scripts/validate-html.py
"""
import re, sys

with open('viewboost.html', 'r') as f:
    html = f.read()

# Extract the Babel script content
m = re.search(r'<script type="text/babel">([\s\S]*?)</script>', html)
if not m:
    print('❌ No Babel script found'); sys.exit(1)
script = m.group(1)
lines  = script.split('\n')

errors = []

# 1. Check for duplicate const/let declarations in the same function scope
#    Simple heuristic: track declarations per function level
decls = {}
func_depth = 0
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if stripped.startswith('function ') or ('=>' in stripped and '{' in stripped and stripped.endswith('{')):
        func_depth += 1
        decls[func_depth] = {}
    if stripped in ('}', '};', '})'):
        if func_depth > 0:
            decls.pop(func_depth, None)
            func_depth -= 1
    # Check const/let/var declarations
    dm = re.match(r'(?:const|let|var)\s+(\w+)', stripped)
    if dm:
        name = dm.group(1)
        key  = (func_depth, name)
        if key in decls.get(func_depth, {}):
            errors.append(f'Line {i}: Duplicate declaration of "{name}" in same scope (depth {func_depth})')
        else:
            decls.setdefault(func_depth, {})[name] = i

# 2. Check for unmatched JSX tags (simple count)
open_tags  = len(re.findall(r'<(?!\/|!|\?)[A-Za-z]', script))
close_tags = len(re.findall(r'<\/[A-Za-z]',          script))
self_close = len(re.findall(r'\/\s*>',                script))
# Rough balance check
balance = open_tags - close_tags - self_close
if abs(balance) > 20:
    errors.append(f'Possible unmatched JSX tags (open:{open_tags} close:{close_tags} self:{self_close}, balance:{balance})')

# 3. Check for backtick template literals left open
bt = script.count('`')
if bt % 2 != 0:
    errors.append(f'Odd number of backticks ({bt}) — possible unclosed template literal')

if errors:
    print('\n❌ VALIDATION FAILED — fix these before pushing:\n')
    for e in errors: print(f'  • {e}')
    print()
    sys.exit(1)
else:
    print(f'✅ Validation passed ({len(lines)} lines, no obvious errors)')
