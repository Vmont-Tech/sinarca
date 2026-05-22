# Sinarca - Plataforma de Créditos de Carbono

Sistema de gerenciamento de créditos de carbono baseado em blockchain Stellar com integração de marketplace, inventário corporativo e auditoria.

## 🛠️ Tecnologia e Arquitetura

- **Frontend**: React + TypeScript + Vite
- **Roteamento**: TanStack Router
- **State Management**: TanStack React Query
- **Design System**: Vanilla CSS (Flat & Institutional)
- **Blockchain**: Integração com rede Stellar (Consensus Protocol)

## 📄 Documentação Técnica

Para guiar o desenvolvimento e integração, consulte os guias em `.planning/docs`:
- [Guia de Integração Backend](./.planning/docs/BACKEND_INTEGRATION_SPEC.md): Endpoints, Roles e Modelos de Dados.
- [Estrutura de Ativos (MRCA)](./src/data/mrca_db.ts): Definição estática dos ativos.

## 🚀 Fluxo de Trabalho (Workflows)

1. **Marketplace → Detalhes**: Consulta pública de ativos com prova on-chain.
2. **Inventário → Compensação**: Declaração de emissões corporativas e liquidação de créditos.
3. **Certificação → Auditoria**: Ciclo de vida completo do crédito, desde a emissão até a aposentadoria.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── routes/           # Roteamento com TanStack Router
├── components/       # Componentes React reutilizáveis
├── styles/          # Estilos CSS globais
├── data/            # Dados estáticos e configurações
└── types/           # Definições de tipos TypeScript
```

## ESLint & Type Checking

Para ambiente de produção, atualize a configuração de ESLint para incluir type-aware lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

## 📦 Dependências Principais

- `@tanstack/react-router`: Roteamento moderno
- `@tanstack/react-query`: Data fetching e caching
- `typescript`: Type safety
- `vite`: Build tool de alta performance

## 🔗 Recursos Úteis

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack React Query Docs](https://tanstack.com/query)
- [Stellar Developer Docs](https://developers.stellar.org)

---

**Desenvolvido com ❤️ por Vmont-Tech**
