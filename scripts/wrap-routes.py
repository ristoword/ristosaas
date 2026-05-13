#!/usr/bin/env python3
"""
Transform all API route.ts files to use withErrorHandler wrapper.

Transforms:
  export async function GET(req: NextRequest) { ... }
to:
  export const GET = withErrorHandler(async (req) => { ... });

Also handles ctx parameter variants and adds the import.
"""

import os
import re

API_DIR = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'src', 'app', 'api')

METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

HELPERS_IMPORT_PATH = '@/lib/api/helpers'

def find_matching_brace(content, start):
    """Find the index of the closing brace matching the opening brace at `start`."""
    depth = 0
    i = start
    in_string = None
    in_template = 0
    while i < len(content):
        c = content[i]
        
        # Handle escape sequences
        if i > 0 and content[i-1] == '\\':
            i += 1
            continue
        
        # Handle strings
        if in_string:
            if c == in_string:
                in_string = None
            i += 1
            continue
        
        if c in ('"', "'", '`'):
            in_string = c
            i += 1
            continue
        
        # Handle single-line comments
        if c == '/' and i + 1 < len(content) and content[i+1] == '/':
            newline = content.find('\n', i)
            if newline == -1:
                return -1
            i = newline + 1
            continue
        
        # Handle multi-line comments
        if c == '/' and i + 1 < len(content) and content[i+1] == '*':
            end = content.find('*/', i + 2)
            if end == -1:
                return -1
            i = end + 2
            continue
        
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        
        i += 1
    return -1


def transform_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Skip if already uses withErrorHandler
    if 'withErrorHandler' in content:
        return False
    
    original = content
    
    # Find all exported async functions
    # Pattern: export async function METHOD(params) {
    pattern = re.compile(
        r'export\s+async\s+function\s+(' + '|'.join(METHODS) + r')\s*\(([^)]*)\)\s*(?::\s*[^{]+?)?\s*\{',
        re.DOTALL
    )
    
    matches = list(pattern.finditer(content))
    if not matches:
        return False
    
    # Process matches in reverse order to preserve positions
    for match in reversed(matches):
        method_name = match.group(1)
        params_str = match.group(2).strip()
        
        # Find the opening brace
        brace_start = content.rindex('{', match.start(), match.end() + 1)
        # Actually, the { is at the end of the match
        brace_start = match.end() - 1
        
        # Find matching closing brace
        close_brace = find_matching_brace(content, brace_start)
        if close_brace == -1:
            print(f"  WARNING: Could not find matching brace in {filepath} for {method_name}")
            continue
        
        # Extract function body (between braces)
        func_body = content[brace_start + 1:close_brace]
        
        # Transform params - strip type annotations for the arrow function
        arrow_params = transform_params(params_str)
        
        # Build the new export
        new_export = f'export const {method_name} = withErrorHandler(async ({arrow_params}) => {{{func_body}}});'
        
        # Replace in content
        content = content[:match.start()] + new_export + content[close_brace + 1:]
    
    # Add withErrorHandler to imports
    content = add_import(content)
    
    # Remove now-unnecessary type Ctx definitions if they exist and are only used
    # by the transformed functions (keep them if still referenced elsewhere)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False


def transform_params(params_str):
    """Transform function params to arrow function params (strip types)."""
    if not params_str:
        return ''
    
    parts = []
    for param in split_params(params_str):
        param = param.strip()
        if not param:
            continue
        # Extract just the name (before : or =)
        name = re.match(r'(\w+)', param)
        if name:
            parts.append(name.group(1))
    
    return ', '.join(parts)


def split_params(params_str):
    """Split parameter string by commas, respecting nested braces/generics."""
    parts = []
    depth = 0
    current = ''
    for c in params_str:
        if c in ('{', '<', '('):
            depth += 1
        elif c in ('}', '>', ')'):
            depth -= 1
        if c == ',' and depth == 0:
            parts.append(current)
            current = ''
        else:
            current += c
    if current.strip():
        parts.append(current)
    return parts


def add_import(content):
    """Add withErrorHandler to imports."""
    # Check if @/lib/api/helpers is already imported
    helpers_import_pattern = re.compile(
        r'import\s*\{([^}]+)\}\s*from\s*["\']@/lib/api/helpers["\'];?'
    )
    match = helpers_import_pattern.search(content)
    
    if match:
        # Add withErrorHandler to existing import
        imports = match.group(1)
        if 'withErrorHandler' not in imports:
            new_imports = imports.rstrip() + ', withErrorHandler'
            content = content[:match.start(1)] + new_imports + content[match.end(1):]
    else:
        # Check if there are any imports at all
        first_import = re.search(r'^import\s', content, re.MULTILINE)
        if first_import:
            # Add after the last import
            last_import = None
            for m in re.finditer(r'^import\s.*?;?\s*$', content, re.MULTILINE):
                last_import = m
            if last_import:
                insert_pos = last_import.end()
                content = content[:insert_pos] + f'\nimport {{ withErrorHandler }} from "{HELPERS_IMPORT_PATH}";' + content[insert_pos:]
            else:
                content = f'import {{ withErrorHandler }} from "{HELPERS_IMPORT_PATH}";\n' + content
        else:
            content = f'import {{ withErrorHandler }} from "{HELPERS_IMPORT_PATH}";\n' + content
    
    return content


def main():
    count = 0
    errors = 0
    skipped = 0
    
    for root, dirs, files in os.walk(API_DIR):
        for fname in files:
            if fname != 'route.ts':
                continue
            filepath = os.path.join(root, fname)
            relpath = os.path.relpath(filepath, API_DIR)
            try:
                if transform_file(filepath):
                    print(f"  OK: {relpath}")
                    count += 1
                else:
                    skipped += 1
            except Exception as e:
                print(f"  ERROR: {relpath}: {e}")
                errors += 1
    
    print(f"\nDone: {count} transformed, {skipped} skipped, {errors} errors")


if __name__ == '__main__':
    main()
