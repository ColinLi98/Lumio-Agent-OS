#!/usr/bin/env python3
"""Add .js extensions to relative imports in TypeScript files for ESM compatibility."""
import os
import re

# Pattern matches: from './somefile' or from '../somefile' but NOT already ending in .js, .json, .css
IMPORT_PATTERN = re.compile(r"""(from\s+['"])(\.\.?\/[^'"]+?)((?<!\.js)(?<!\.json)(?<!\.css))(['"];?)""")

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    def replacer(m):
        prefix = m.group(1)
        path = m.group(2) + m.group(3)
        suffix = m.group(4)
        # Don't add .js if already has extension .js, .json, .css
        if path.endswith('.js') or path.endswith('.json') or path.endswith('.css'):
            return m.group(0)
        return f"{prefix}{path}.js{suffix}"
    
    new_content = IMPORT_PATTERN.sub(replacer, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

count = 0
for root, dirs, files in os.walk('services'):
    for fname in files:
        if fname.endswith('.ts'):
            fpath = os.path.join(root, fname)
            if fix_file(fpath):
                count += 1
                print(f"Fixed: {fpath}")

print(f"\nDone. Fixed {count} files.")
