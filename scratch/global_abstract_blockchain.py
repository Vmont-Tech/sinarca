import os

# List of directories to process
dirs = [
    r"d:\Users\vinicius\quantum-cert\CUsersviniciusquantum-cert-sinarca-home\src",
    r"d:\Users\vinicius\quantum-cert\CUsersviniciusquantum-cert-sinarca-home\docs\bible",
    r"d:\Users\vinicius\quantum-cert\CUsersviniciusquantum-cert-sinarca-home\docs\branding"
]

for base_dir in dirs:
    if not os.path.exists(base_dir):
        continue
    for root, _, files in os.walk(base_dir):
        for filename in files:
            if filename.endswith((".md", ".tsx", ".ts", ".css", ".html")):
                path = os.path.join(root, filename)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    original_content = content
                    content = content.replace("Stellar Blockchain", "Infraestrutura Blockchain")
                    content = content.replace("Stellar Network", "Rede Blockchain")
                    content = content.replace("blockchain Stellar", "Ledger Distribuído")
                    content = content.replace("Stellar SDK", "Blockchain SDK")
                    content = content.replace("Stellar", "Blockchain")
                    content = content.replace("Soroban", "Smart Contracts")
                    content = content.replace("Blockchain Blockchain", "Blockchain")
                    
                    if content != original_content:
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(content)
                        print(f"Processed: {path}")
                except Exception as e:
                    pass
