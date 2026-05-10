import os

base_dir = r"d:\Users\vinicius\quantum-cert\CUsersviniciusquantum-cert-sinarca-home\docs\bible"

for filename in os.listdir(base_dir):
    if filename.endswith(".md"):
        path = os.path.join(base_dir, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            content = content.replace("Stellar", "Blockchain")
            content = content.replace("Soroban", "Smart Contracts")
            content = content.replace("Blockchain Blockchain", "Blockchain")
            content = content.replace("blockchain Blockchain", "Ledger Distribuído")
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"Error processing {filename}: {e}")
