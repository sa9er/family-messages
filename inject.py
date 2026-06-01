import os
import json

print("\n" + "="*50)
print("PROJECT CONTEXT INJECTION")
print("="*50)

print("\n📁 PROJECT STRUCTURE:")
os.system("find . -maxdepth 2 -type d | grep -v node_modules | head -20")

if os.path.exists("frontend/package.json"):
    print("\n⚛️ FRONTEND:")
    with open("frontend/package.json") as f:
        data = json.load(f)
        print(f"  Dependencies: {list(data.get('dependencies', {}).keys())[:5]}")

if os.path.exists("backend/package.json"):
    print("\n🗄️ BACKEND:")
    with open("backend/package.json") as f:
        data = json.load(f)
        print(f"  Scripts: {list(data.get('scripts', {}).keys())}")

for file in ["backend/src/index.js", "backend/server.js", "frontend/src/App.jsx", "frontend/src/App.js"]:
    if os.path.exists(file):
        print(f"\n📄 {file} (first 25 lines):")
        os.system(f"head -25 {file}")

print("\n" + "="*50)
