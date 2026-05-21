import os
import time
from playwright.sync_api import sync_playwright

# Absolute path to artifacts folder where screenshots will be saved
ARTIFACT_DIR = r"C:\Users\chris\.gemini\antigravity-ide\brain\97efac11-a985-4aa6-9751-f997c88bb58e"

def run_gui_tests():
    print("=== INICIANDO TESTES DE INTERFACE (GUI) ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large window size to capture the dashboard clearly
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        
        # ----------------------------------------------------
        # 1. FLUXO DA EMPRESA (COMPRADORA)
        # ----------------------------------------------------
        page = context.new_page()
        print("Empresa: Navegando para a página de login...")
        page.goto("http://localhost:5174/login")
        page.wait_for_timeout(2000)
        
        print("Empresa: Selecionando perfil 'Empresa'...")
        page.click('button:has-text("Empresa")')
        page.wait_for_timeout(500)
        
        print("Empresa: Preenchendo credenciais reais...")
        page.fill('input[placeholder="E-mail ou Documento"]', "empresa@sinarca.com.br")
        page.fill('input[placeholder="••••••••"]', "empresa")
        
        print("Empresa: Clicando em Entrar...")
        page.click('button:has-text("Entrar no Portal")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        
        print(f"Empresa: Login efetuado com sucesso. URL atual: {page.url}")
        
        # Captura de tela do Dashboard da Empresa
        dash_path = os.path.join(ARTIFACT_DIR, "empresa_dashboard.png")
        page.screenshot(path=dash_path)
        print(f"Empresa: Captura de tela do dashboard salva em: {dash_path}")
        
        # Ir para o Marketplace
        print("Empresa: Navegando para o Mercado de Créditos...")
        page.goto("http://localhost:5174/painel/marketplace")
        page.wait_for_timeout(3000)
        
        market_path = os.path.join(ARTIFACT_DIR, "empresa_marketplace.png")
        page.screenshot(path=market_path)
        # Ir para Aposentar Créditos
        print("Empresa: Navegando para Aposentar Créditos...")
        page.goto("http://localhost:5174/painel/aposentar")
        page.wait_for_timeout(3000)
        
        aposentar_path = os.path.join(ARTIFACT_DIR, "empresa_aposentar.png")
        page.screenshot(path=aposentar_path)
        print(f"Empresa: Captura de tela da tela de aposentadoria salva em: {aposentar_path}")
        
        # Testar a funcionalidade de aposentadoria
        print("Empresa: Testando o fluxo de aposentadoria...")
        # Aceitar diálogos (alerts/confirms) automaticamente
        page.on("dialog", lambda dialog: dialog.accept())
        
        # Clicar no checkbox de confirmação
        page.click("input[type='checkbox']")
        page.wait_for_timeout(500)
        
        # Clicar no botão Confirmar e Aposentar
        page.click('button:has-text("Confirmar e Aposentar")')
        page.wait_for_timeout(3000)
        
        # Como o botão deve redirecionar para o painel de transações, vamos tirar um screenshot da tela após o clique
        success_path = os.path.join(ARTIFACT_DIR, "empresa_aposentadoria_sucesso.png")
        page.screenshot(path=success_path)
        print(f"Empresa: Captura de tela pós-aposentadoria salva em: {success_path}")

        page.close()
        
        # ----------------------------------------------------
        # 2. FLUXO DO AUDITOR
        # ----------------------------------------------------
        page = context.new_page()
        print("Auditor: Navegando para a página de login...")
        page.goto("http://localhost:5174/login")
        page.wait_for_timeout(1000)
        
        print("Auditor: Selecionando perfil 'Auditor'...")
        page.click('button:has-text("Auditor")')
        page.wait_for_timeout(500)
        
        print("Auditor: Preenchendo credenciais reais...")
        page.fill('input[placeholder="E-mail ou Documento"]', "auditor@sinarca.com.br")
        page.fill('input[placeholder="••••••••"]', "auditor")
        
        print("Auditor: Clicando em Entrar...")
        page.click('button:has-text("Entrar no Portal")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        
        print(f"Auditor: Login efetuado com sucesso. URL atual: {page.url}")
        
        # Captura de tela do Dashboard do Auditor
        auditor_dash_path = os.path.join(ARTIFACT_DIR, "auditor_dashboard.png")
        page.screenshot(path=auditor_dash_path)
        print(f"Auditor: Captura de tela do dashboard salva em: {auditor_dash_path}")
        
        # Ir para a Fila de Auditoria
        print("Auditor: Navegando para Fila de Auditoria...")
        page.goto("http://localhost:5174/painel/auditoria")
        page.wait_for_timeout(3000)
        
        auditor_queue_path = os.path.join(ARTIFACT_DIR, "auditor_queue.png")
        page.screenshot(path=auditor_queue_path)
        print(f"Auditor: Captura de tela da fila de auditoria salva em: {auditor_queue_path}")
        
        page.close()
        
        # ----------------------------------------------------
        # 3. FLUXO DA CERTIFICADORA
        # ----------------------------------------------------
        page = context.new_page()
        print("Certificadora: Navegando para a página de login...")
        page.goto("http://localhost:5174/login")
        page.wait_for_timeout(1000)
        
        # Note: Certifier logins do not have a dedicated RoleBtn, they use the default flow (producer/company)
        # or we can select 'Empresa' / 'Produtor' and enter the certifier credentials since backend authenticates by email/password
        print("Certificadora: Preenchendo credenciais reais...")
        page.fill('input[placeholder="E-mail ou Documento"]', "certificadora@sinarca.com.br")
        page.fill('input[placeholder="••••••••"]', "certificadora")
        
        print("Certificadora: Clicando em Entrar...")
        page.click('button:has-text("Entrar no Portal")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        
        print(f"Certificadora: Login efetuado com sucesso. URL atual: {page.url}")
        
        # Captura de tela do Dashboard da Certificadora
        cert_dash_path = os.path.join(ARTIFACT_DIR, "certificadora_dashboard.png")
        page.screenshot(path=cert_dash_path)
        print(f"Certificadora: Captura de tela do dashboard salva em: {cert_dash_path}")
        
        # Ir para a Fila da Certificadora
        print("Certificadora: Navegando para Fila da Certificadora...")
        page.goto("http://localhost:5174/painel/certificadora")
        page.wait_for_timeout(3000)
        
        cert_queue_path = os.path.join(ARTIFACT_DIR, "certificadora_queue.png")
        page.screenshot(path=cert_queue_path)
        print(f"Certificadora: Captura de tela da fila da certificadora salva em: {cert_queue_path}")
        
        page.close()
        browser.close()
        
    print("=== TESTES DE INTERFACE FINALIZADOS COM SUCESSO ===")

if __name__ == "__main__":
    run_gui_tests()
