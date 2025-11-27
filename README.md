# Sistema Sinergy - ERP

Sistema de Gestão Empresarial (ERP) desenvolvido para a ATRON.

## 📋 Descrição

Sistema completo de gestão empresarial com módulos de:
- 📦 Gestão de Estoque (Bobinas e Produtos)
- 🏭 Controle de Produção
- 💰 Financeiro (Contas a Pagar/Receber, Tesouraria)
- 🛒 Comercial (Orçamentos e Pedidos)
- 🌍 Comércio Exterior (COMEX)
- 👥 Recursos Humanos
- 🔧 Manutenções
- 📊 Relatórios e Dashboards

## 🏗️ Estrutura do Projeto

```
sinergy/
├── .env.example              # Exemplo de variáveis de ambiente
├── .gitignore               # Arquivos ignorados pelo Git
├── README.md                # Documentação do projeto
│
├── api/                     # Ponto de entrada da API REST
│   ├── index.php           # Router principal da API
│   └── .htaccess           # Configurações Apache para API
│
├── config/                  # Configurações do sistema
│   ├── config.php          # Configurações gerais
│   ├── database.php        # Conexão com banco de dados
│   └── cors.php            # Configurações CORS
│
├── src/                     # Código-fonte backend
│   ├── autoload.php        # Autoloader de classes
│   ├── legacy_functions.php # Funções legadas (handlers)
│   │
│   ├── Controllers/        # Controllers MVC
│   │   └── BaseController.php
│   │
│   └── Utils/              # Classes utilitárias
│       ├── Response.php    # Gerenciamento de respostas JSON
│       ├── Security.php    # Funções de segurança
│       ├── Validation.php  # Validações
│       └── helpers.php     # Funções auxiliares
│
├── public/                  # Pasta pública (root do servidor web)
│   ├── index.html          # Página principal
│   │
│   ├── assets/             # Assets estáticos
│   │   ├── css/           # Arquivos CSS
│   │   ├── js/            # Arquivos JavaScript
│   │   └── images/        # Imagens
│   │
│   └── pages/              # Páginas HTML do sistema
│
├── logs/                    # Logs do sistema (não versionado)
└── backups/                 # Backups (não versionado)
```

## 🚀 Configuração e Instalação

### Pré-requisitos

- PHP 7.4+ ou superior
- MySQL 5.7+ ou MariaDB 10.3+
- Servidor web (Apache/Nginx)
- Extensões PHP: mysqli, json, mbstring

### Instalação Local (Desenvolvimento)

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/sinergy.git
   cd sinergy
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` com suas configurações de banco de dados.

3. **Configure o servidor web:**
   - Aponte o document root para a pasta `public/`
   - Certifique-se de que mod_rewrite está habilitado (Apache)

4. **Importe o banco de dados:**
   - Crie um banco de dados MySQL
   - Importe o schema SQL (se disponível)

5. **Ajuste permissões:**
   ```bash
   chmod 755 public/
   chmod 755 api/
   mkdir -p logs
   chmod 777 logs/
   ```

### Instalação na Hostgator

1. **Faça upload dos arquivos via FTP/cPanel:**
   - Upload de todos os arquivos para `public_html/sinergy/`

2. **Configure o .env:**
   - Crie o arquivo `.env` na raiz com as credenciais do banco
   - **IMPORTANTE**: Nunca versione o arquivo `.env` com credenciais reais

3. **Configurações do Apache:**
   - Os arquivos `.htaccess` já estão configurados
   - Verifique se mod_rewrite está habilitado

4. **Permissões:**
   - Garanta que a pasta `logs/` tenha permissão de escrita (755 ou 777)

## 🔒 Segurança

### Boas Práticas Implementadas:

1. **Credenciais protegidas:**
   - Uso de variáveis de ambiente (.env)
   - Arquivo .env não versionado
   - config/database.php no .gitignore

2. **Validação e sanitização:**
   - Todas as entradas são validadas e sanitizadas
   - Proteção contra SQL Injection via prepared statements
   - Proteção contra XSS

3. **Autenticação:**
   - Senhas com hash seguro (password_hash)
   - Sistema de recuperação de senha com tokens
   - Controle de permissões por módulo

4. **API REST:**
   - Cabeçalhos CORS configurados
   - Validação de métodos HTTP
   - Respostas JSON padronizadas

## 📚 API Documentation

### Base URL
```
https://seu-dominio.com/api
```

### Endpoints Principais

#### Autenticação
- `POST /login` - Fazer login
- `POST /register` - Registrar usuário
- `POST /recover-password` - Recuperar senha
- `POST /reset-password` - Redefinir senha

#### Usuários
- `GET /users/{username}` - Obter perfil
- `PUT /users/{username}` - Atualizar perfil

#### Bobinas
- `GET /bobinas` - Listar todas
- `POST /bobinas` - Adicionar nova
- `GET /bobinas/{id}` - Obter por ID
- `PUT /bobinas/{id}` - Atualizar
- `DELETE /bobinas/{id}` - Deletar

#### Produções
- `GET /producoes` - Listar todas
- `POST /producoes` - Adicionar nova
- `PUT /producoes/{id}` - Atualizar
- `DELETE /producoes/{id}` - Deletar

(Veja documentação completa da API para todos os endpoints)

## 🛠️ Desenvolvimento

### Tecnologias Utilizadas

**Backend:**
- PHP (Procedural + OOP)
- MySQL/MariaDB
- Apache

**Frontend:**
- HTML5
- CSS3 (Custom CSS, sem frameworks)
- JavaScript (Vanilla JS)
- Chart.js (gráficos)
- Font Awesome (ícones)

### Padrões de Código

- **Backend:** PSR-4 (autoloading), classes namespaced
- **Frontend:** Modular, um arquivo JS por página
- **CSS:** Um arquivo por módulo/página
- **Nomenclatura:** camelCase (JS), snake_case (PHP), kebab-case (CSS)

## 📝 Alterações na Reestruturação

### O que mudou:

1. ✅ **Estrutura de diretórios profissional** - Separação clara entre backend (src/) e frontend (public/)
2. ✅ **Configuração centralizada** - Arquivo config.php único com suporte a .env
3. ✅ **Segurança aprimorada** - Credenciais não ficam mais hardcoded
4. ✅ **API modularizada** - Router limpo e organizado
5. ✅ **Assets organizados** - CSS, JS e Images em public/assets/
6. ✅ **Autoloading** - Classes PHP com namespace e autoload
7. ✅ **Utilities classes** - Response, Security, Validation
8. ✅ **.gitignore adequado** - Proteção de arquivos sensíveis
9. ✅ **Documentação** - README completo

### Compatibilidade:

- ✅ Todas as funcionalidades existentes mantidas
- ✅ API endpoints inalterados
- ✅ Frontend funciona sem alterações na lógica
- ✅ Banco de dados não precisa de mudanças

## 🧪 Testing

Para testar localmente:

1. Inicie um servidor PHP local:
   ```bash
   cd public
   php -S localhost:8000
   ```

2. Acesse no navegador:
   ```
   http://localhost:8000
   ```

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
2. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
3. Push para a branch (`git push origin feature/MinhaFeature`)
4. Abra um Pull Request

## 📄 Licença

Uso interno - ATRON

## 👥 Autor

Sistema desenvolvido para ATRON

---

**Versão:** 2.0.0 (Reestruturada)
**Última atualização:** Novembro 2025
