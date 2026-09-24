import os

backend_dir = r"d:\Ninja Startup\swiss2\backend\app"

for root, _, files in os.walk(backend_dir):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                
            if 'datetime.utcnow()' in content and 'from datetime import datetime' in content:
                # Add timezone to import if missing
                if 'from datetime import datetime, timezone' not in content:
                    content = content.replace('from datetime import datetime', 'from datetime import datetime, timezone')
                
                # Replace the calls
                content = content.replace('datetime.utcnow()', 'datetime.now(timezone.utc)')
                
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f"Updated {path}")
