import os
import re


def process_file(file_path: str) -> None:
    """Append `.js` to import paths that lack an extension.

    Handles two import syntaxes:
        * `import * as $ from './path';`
        * `import { Foo } from './path';`
    """
    print(f"Processing: {file_path}")

    # Read original file content
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex that matches either star‑import or named‑import (curly‑brace) forms.
    # Capture group 2 is the module path so we can check/modify it.
    import_pattern = (
        r"(import\s+(?:\*\s+as\s+\$\s+|\{[^}]+\}\s+)from\s+['\"]([^'\"]+)['\"];?)"
    )

    def add_js_extension(match: re.Match) -> str:
        module_path: str = match.group(2)
        # If the path already ends with .js, keep it untouched
        if module_path.endswith(".js"):
            return match.group(0)

        new_path = f"{module_path}.js"
        original_line = match.group(0)
        modified_line = original_line.replace(module_path, new_path)
        print(f"Found match: {original_line} -> Replacing with: {modified_line}")
        return modified_line

    # Apply transformation
    new_content = re.sub(import_pattern, add_js_extension, content)

    # Write back if any change occurred
    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Modified: {file_path}")
    else:
        print(f"No changes needed: {file_path}")


def process_directory(directory: str) -> None:
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith((".ts", ".js")):
                process_file(os.path.join(root, file))


if __name__ == "__main__":
    # Assuming the script lives one level above the `dist` folder
    dist_folder = os.path.join(os.path.dirname(__file__), "dist")

    if os.path.exists(dist_folder):
        process_directory(dist_folder)
        print("Processing complete.")
    else:
        print(f"Error: 'dist' folder not found at {dist_folder}")
