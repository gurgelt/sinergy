# 🧪 Guia de Teste - Sistema Sinergy

## Como Testar o Projeto Localmente

Este guia mostra como testar o sistema antes de fazer deploy na Hostgator.

---

## Opção 1: Servidor PHP Embutido (Recomendado) ⚡

### **Linux/Mac:**

```bash
# 1. Navegue até a pasta do projeto
cd /caminho/para/sinergy

# 2. Execute o script de inicialização
./start-server.sh

# OU manualmente:
cd public && php -S localhost:8000
```

### **Windows:**

```bash
# 1. Abra o CMD ou PowerShell na pasta do projeto
cd C:\caminho\para\sinergy

# 2. Execute o script
start-server.bat

# OU manualmente:
cd public
php -S localhost:8000
```

### **Acesse:**
- **Frontend:** http://localhost:8000
- **API:** http://localhost:8000/../api/status
- **Teste da API:** http://localhost:8000/../test-api.html

---

## Opção 2: XAMPP/WAMP/MAMP 🖥️

Se você usa XAMPP, WAMP ou MAMP:

### **Passo 1: Copiar Arquivos**
```bash
# Copie a pasta sinergy para:
# - XAMPP: C:\xampp\htdocs\sinergy
# - WAMP: C:\wamp64\www\sinergy
# - MAMP: /Applications/MAMP/htdocs/sinergy
```

### **Passo 2: Configurar Virtual Host (Opcional)**

**Apache (httpd-vhosts.conf):**
```apache
<VirtualHost *:80>
    ServerName sinergy.local
    DocumentRoot "C:/xampp/htdocs/sinergy/public"

    <Directory "C:/xampp/htdocs/sinergy/public">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

**Arquivo hosts (Windows: C:\Windows\System32\drivers\etc\hosts):**
```
127.0.0.1 sinergy.local
```

### **Acesse:**
- **Com Virtual Host:** http://sinergy.local
- **Sem Virtual Host:** http://localhost/sinergy/public

---

## Opção 3: Docker (Avançado) 🐳

Se você usa Docker:

### **Criar docker-compose.yml:**
```yaml
version: '3.8'
services:
  web:
    image: php:8.1-apache
    ports:
      - "8000:80"
    volumes:
      - ./public:/var/www/html
      - ./api:/var/www/api
      - ./config:/var/www/config
      - ./src:/var/www/src
    environment:
      - APACHE_DOCUMENT_ROOT=/var/www/html
```

### **Executar:**
```bash
docker-compose up -d
```

---

## 🧪 Testando a Aplicação

### **1. Teste Rápido da API**

Abra o navegador e acesse:
```
http://localhost:8000/../api/status
```

**Resposta esperada:**
```json
{
    "status": "success",
    "message": "API funcionando corretamente"
}
```

### **2. Teste Completo da API**

Abra o arquivo de teste interativo:
```
http://localhost:8000/../test-api.html
```

Clique nos botões para testar cada endpoint.

### **3. Teste do Frontend**

Acesse a página principal:
```
http://localhost:8000
```

**O que verificar:**
- ✅ Página de login carrega
- ✅ CSS está aplicado corretamente
- ✅ Logo aparece
- ✅ Não há erros no console (F12)

### **4. Teste de Login**

Na página de login, tente fazer login com credenciais válidas do banco de dados.

**Verifique:**
- ✅ Redirecionamento para a home após login
- ✅ Nome do usuário aparece no topo
- ✅ Menu lateral funciona

---

## 🐛 Verificando Erros

### **1. Console do Navegador**

Pressione `F12` e vá na aba "Console"

**Erros comuns:**
```
❌ Failed to load resource: 404
   → Assets não encontrados (verifique paths)

❌ CORS error
   → API bloqueando requisições (verifique config/cors.php)

❌ Unexpected token < in JSON
   → API retornando HTML ao invés de JSON (erro PHP)
```

### **2. Logs do PHP**

**No terminal onde rodou o servidor:**
```bash
# Erros aparecerão aqui automaticamente
```

**Ou verifique:**
```bash
# Log de erros PHP
tail -f logs/php_errors.log
```

### **3. Network Tab (Rede)**

No DevTools (F12), aba "Network":
- Veja todas as requisições
- Status codes (200, 404, 500)
- Tempo de resposta
- Dados enviados/recebidos

---

## ✅ Checklist de Testes

### **Teste de Instalação:**
- [ ] Servidor PHP inicia sem erros
- [ ] `/api/status` retorna sucesso
- [ ] Página inicial carrega
- [ ] CSS está aplicado
- [ ] JavaScript funciona (sem erros no console)

### **Teste de Assets:**
- [ ] Logo aparece
- [ ] Ícones Font Awesome carregam
- [ ] Estilos CSS aplicados corretamente
- [ ] Imagens carregam

### **Teste da API:**
- [ ] GET /api/bobinas funciona
- [ ] GET /api/producoes funciona
- [ ] GET /api/produtos funciona
- [ ] GET /api/orcamentos funciona
- [ ] GET /api/pedidos funciona

### **Teste de Autenticação:**
- [ ] Página de login carrega
- [ ] Login com credenciais válidas funciona
- [ ] Redirecionamento após login funciona
- [ ] Logout funciona

### **Teste de Funcionalidades:**
- [ ] Navegação entre páginas funciona
- [ ] Tabelas carregam dados
- [ ] Formulários funcionam
- [ ] Modais abrem/fecham

---

## 🔧 Troubleshooting

### **Problema: "Address already in use"**

**Causa:** Porta 8000 já está em uso

**Solução:**
```bash
# Use outra porta
php -S localhost:8080

# Ou descubra qual processo está usando a porta 8000
# Linux/Mac:
lsof -i :8000
kill -9 [PID]

# Windows:
netstat -ano | findstr :8000
taskkill /PID [PID] /F
```

### **Problema: "No such file or directory"**

**Causa:** Caminho errado ou arquivo não existe

**Solução:**
```bash
# Verifique se está na pasta correta
pwd  # Linux/Mac
cd   # Windows

# Liste arquivos
ls -la  # Linux/Mac
dir     # Windows
```

### **Problema: Assets não carregam (404)**

**Causa:** Paths incorretos ou servidor não está na pasta `public/`

**Solução:**
```bash
# Certifique-se de iniciar o servidor na pasta public
cd public
php -S localhost:8000

# Verifique se a estrutura está correta
ls assets/css
ls assets/js
ls assets/images
```

### **Problema: API retorna erro de banco de dados**

**Causa:** Credenciais incorretas ou banco não existe

**Solução:**
1. Verifique o arquivo `.env`
2. Confirme que as credenciais estão corretas
3. Teste a conexão com o banco manualmente

```bash
# Teste MySQL
mysql -u atriu019_paulo -p atriu019_sinergy
```

### **Problema: CORS Error**

**Causa:** API bloqueando requisições do frontend

**Solução:**

Verifique `config/cors.php`:
```php
define('CORS_ALLOWED_ORIGINS', '*');
```

---

## 📊 Teste de Performance

### **Usando Chrome DevTools:**

1. Abra DevTools (F12)
2. Vá na aba "Lighthouse"
3. Clique em "Generate report"

**Métricas importantes:**
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 80
- SEO: > 80

---

## 🚀 Próximo Passo

Depois de testar localmente e confirmar que tudo funciona:

1. ✅ Todos os testes passaram
2. ✅ Sem erros no console
3. ✅ API responde corretamente
4. ✅ Frontend funciona perfeitamente

**Está pronto para fazer deploy na Hostgator!**

📘 Consulte o `MIGRATION_GUIDE.md` para instruções de deploy.

---

## 🆘 Precisa de Ajuda?

Se encontrou algum problema:

1. Verifique os logs: `logs/php_errors.log`
2. Console do navegador (F12)
3. Teste a API com `test-api.html`
4. Consulte a documentação: `README.md`

---

**Happy Testing! 🧪**
