# Guia de Migração - Sistema Sinergy v2.0

## 📋 Visão Geral

Este documento descreve as alterações realizadas na reestruturação do projeto Sinergy e fornece um guia para implantação no servidor Hostgator.

## 🔄 Mudanças Realizadas

### 1. Estrutura de Diretórios

**ANTES:**
```
sinergy/
├── index.html
├── api/
│   └── index.php (2809 linhas!)
├── js/ (26 arquivos)
├── styles/ (29 arquivos)
├── images/
└── pages/
```

**DEPOIS:**
```
sinergy/
├── .env                    # Variáveis de ambiente (NÃO VERSIONAR)
├── .env.example           # Exemplo de configuração
├── .gitignore             # Arquivos ignorados
├── README.md              # Documentação
├── .htaccess              # Configuração Apache raiz
│
├── api/
│   ├── index.php         # Router limpo (~400 linhas)
│   └── .htaccess         # Config Apache da API
│
├── config/
│   ├── config.php        # Configurações centralizadas
│   ├── database.php      # Conexão DB
│   └── cors.php          # CORS
│
├── src/
│   ├── autoload.php      # Autoloader PSR-4
│   ├── legacy_functions.php  # Handlers da API
│   ├── Controllers/
│   │   └── BaseController.php
│   └── Utils/
│       ├── Response.php
│       ├── Security.php
│       ├── Validation.php
│       └── helpers.php
│
├── public/               # RAIZ PÚBLICA
│   ├── index.html
│   ├── .htaccess
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── pages/
│
├── logs/                 # Logs (não versionado)
└── backups/             # Backups (não versionado)
```

### 2. Melhorias de Segurança

#### ✅ Credenciais Protegidas
- **ANTES:** Senha do DB hardcoded em `api/dbconnection.php`
- **DEPOIS:** Credenciais em arquivo `.env` (não versionado)

#### ✅ Classes de Segurança
- `Security::hashPassword()` - Hash seguro de senhas
- `Security::generateToken()` - Tokens criptograficamente seguros
- `Security::sanitizeFilename()` - Proteção contra directory traversal
- `Validation::sanitize()` - Sanitização de inputs
- `Validation::isValidCPF/CNPJ()` - Validações brasileiras

#### ✅ Proteção de Arquivos
- `.htaccess` protege pastas `config/`, `src/`, `logs/`
- Arquivos `.env`, `.log`, `.sql` bloqueados
- Headers de segurança (XSS, MIME sniffing, Clickjacking)

### 3. Melhorias de Performance

#### ✅ Cache de Assets
- Imagens: 1 ano de cache
- CSS/JS: 1 mês de cache
- Compressão GZIP ativada

#### ✅ Organização de Código
- API modularizada (de 2809 para ~400 linhas no router)
- Autoloading de classes (sem múltiplos `require`)
- Funções separadas por responsabilidade

### 4. Melhorias de Manutenibilidade

#### ✅ Padrão MVC
- Controllers organizados
- Utilities reutilizáveis
- Separação de concerns

#### ✅ Documentação
- README.md completo
- Comentários em todos os arquivos
- Guia de migração

#### ✅ Versionamento
- `.gitignore` adequado
- Arquivos sensíveis protegidos
- Estrutura limpa

## 🚀 Como Implantar na Hostgator

### Passo 1: Backup
```bash
# Faça backup completo do site atual via cPanel
```

### Passo 2: Upload dos Arquivos

1. **Via FTP/cPanel File Manager:**
   - Faça upload de TODA a pasta `sinergy/` para `public_html/`

2. **Estrutura esperada no servidor:**
   ```
   public_html/
   └── sinergy/
       ├── .env (CRIAR MANUALMENTE)
       ├── .htaccess
       ├── api/
       ├── config/
       ├── src/
       ├── public/
       ├── logs/
       └── README.md
   ```

### Passo 3: Configurar .env

1. **Crie o arquivo `.env` na raiz:**
   ```bash
   # Via cPanel File Manager ou FTP
   # Copie o conteúdo de .env.example
   ```

2. **Configure as credenciais:**
   ```env
   DB_HOST=localhost
   DB_NAME=atriu019_sinergy
   DB_USER=atriu019_paulo
   DB_PASSWORD=jauyo8Y091Z@58JABSDavas%%

   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://virtualcriacoes.com

   API_BASE_PATH=/api
   ```

### Passo 4: Ajustar Permissões

**Via cPanel File Manager:**
- `/logs/` → 755 ou 777 (permissão de escrita)
- `/config/` → 755
- `/api/` → 755
- `/public/` → 755

**Via SSH (se disponível):**
```bash
cd public_html/sinergy
chmod 755 logs/
chmod 755 config/
chmod 755 api/
chmod 755 public/
```

### Passo 5: Configurar Document Root (Opcional)

**Opção A - Subdiretório (Recomendado para testes):**
- URL: `https://virtualcriacoes.com/sinergy/public/`
- Nenhuma configuração adicional necessária

**Opção B - Domínio/Subdomínio dedicado:**
1. Via cPanel → Domains → Create Subdomain
2. Apontar document root para: `public_html/sinergy/public/`
3. URL: `https://sinergy.virtualcriacoes.com/`

### Passo 6: Testar a Aplicação

1. **Teste a API:**
   ```
   https://virtualcriacoes.com/sinergy/api/status
   ```
   Deve retornar: `{"status":"success","message":"API funcionando corretamente"}`

2. **Teste o Frontend:**
   ```
   https://virtualcriacoes.com/sinergy/public/
   ```
   Deve carregar a página de login

3. **Teste Login:**
   - Acesse a página de login
   - Tente fazer login com credenciais válidas

## ⚠️ Problemas Comuns e Soluções

### Erro 500 (Internal Server Error)

**Causa:** Permissões incorretas ou mod_rewrite desabilitado

**Solução:**
1. Verifique permissões das pastas (755)
2. Verifique se `.htaccess` está presente
3. Contate Hostgator para habilitar mod_rewrite

### API retorna 404

**Causa:** RewriteEngine não está funcionando

**Solução:**
1. Verifique se arquivo `api/.htaccess` existe
2. Teste URL direta: `https://virtualcriacoes.com/sinergy/api/index.php?path=status`
3. Se funcionar, problema é no mod_rewrite

### Assets (CSS/JS/Images) não carregam

**Causa:** Paths incorretos

**Solução:**
1. Verifique se pasta `public/assets/` existe
2. Inspecione HTML e veja paths dos arquivos
3. Ajuste paths se necessário (relativo vs absoluto)

### Erro de conexão com banco de dados

**Causa:** Credenciais incorretas no `.env`

**Solução:**
1. Verifique arquivo `.env`
2. Confirme credenciais no cPanel → MySQL Databases
3. Teste conexão manualmente

## 📊 Comparativo de Performance

### Antes vs Depois:

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Linhas no Router** | 2809 | ~400 | 85% redução |
| **Arquivos no root** | 5 | 0 (tudo em public/) | 100% organizado |
| **Segurança de Credenciais** | Expostas | Protegidas (.env) | ✅ Crítico |
| **Cache de Assets** | Não configurado | Configurado | ⚡ Mais rápido |
| **Compressão GZIP** | Não | Sim | ⚡ Menos dados |
| **Headers de Segurança** | Não | Sim | 🔒 Mais seguro |
| **Documentação** | Não | Completa | 📚 Mantível |

## ✅ Checklist de Implantação

- [ ] Backup completo realizado
- [ ] Arquivos uploadados para servidor
- [ ] Arquivo `.env` criado com credenciais corretas
- [ ] Permissões de pastas ajustadas
- [ ] API testada (`/api/status`)
- [ ] Frontend testado (página inicial)
- [ ] Login testado
- [ ] Funcionalidades principais testadas
- [ ] Logs verificados (sem erros)

## 🔄 Rollback (Se Necessário)

Se algo der errado:

1. **Restaurar backup:**
   ```bash
   # Via cPanel → Backup → Restore
   ```

2. **Ou manter versão antiga em paralelo:**
   ```
   public_html/
   ├── sinergy/          # Nova versão
   └── sinergy_old/      # Backup da antiga
   ```

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs em `logs/php_errors.log`
2. Verifique error_log do Apache (cPanel → Errors)
3. Consulte a documentação no README.md
4. Contate o administrador do sistema

---

**Versão do Guia:** 1.0
**Data:** Novembro 2025
**Responsável:** Equipe de Desenvolvimento
