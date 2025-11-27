# 🚀 Deploy Rápido na Hostgator

## ✅ **Sim, funciona! Mas siga estes passos:**

---

## 📋 **Checklist Rápido**

### **Passo 1: Baixar do GitHub** ⬇️

1. Acesse: https://github.com/gurgelt/sinergy
2. Clique no botão **Code** (verde)
3. Selecione **Download ZIP**
4. Extraia o ZIP em seu computador

---

### **Passo 2: Upload para Hostgator** 📤

**Opção A - Via cPanel File Manager (Mais Fácil):**

1. Acesse o **cPanel** da Hostgator
2. Abra **File Manager** (Gerenciador de Arquivos)
3. Navegue até `public_html/`
4. Clique em **Upload**
5. Faça upload da pasta `sinergy` completa
6. Aguarde o upload terminar

**Opção B - Via FTP (Filezilla):**

1. Baixe o **FileZilla** (se não tiver)
2. Conecte no FTP da Hostgator
   - Host: seu-dominio.com
   - Usuário: (fornecido pela Hostgator)
   - Senha: (fornecida pela Hostgator)
   - Porta: 21
3. Arraste a pasta `sinergy` para `public_html/`

**Estrutura esperada no servidor:**
```
public_html/
└── sinergy/
    ├── .env.example
    ├── .gitignore
    ├── README.md
    ├── api/
    ├── config/
    ├── src/
    ├── public/
    └── logs/
```

---

### **Passo 3: ⚠️ CRIAR ARQUIVO .env (CRÍTICO!)** 🔑

Este é o **passo mais importante!** O arquivo `.env` não está no GitHub por segurança.

**Via cPanel File Manager:**

1. No cPanel, abra **File Manager**
2. Navegue até `public_html/sinergy/`
3. Clique em **+ File** (Novo Arquivo)
4. Nome do arquivo: `.env` (com o ponto na frente!)
5. Clique em **Create New File**
6. Clique com botão direito no arquivo → **Edit**
7. Cole este conteúdo:

```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_NAME=atriu019_sinergy
DB_USER=atriu019_paulo
DB_PASSWORD=jauyo8Y091Z@58JABSDavas%%

# Configurações da Aplicação
APP_ENV=production
APP_DEBUG=false
APP_URL=https://virtualcriacoes.com

# Configurações de Segurança
SESSION_LIFETIME=7200
CORS_ALLOWED_ORIGINS=*

# API Settings
API_BASE_PATH=/api
```

8. **IMPORTANTE:** Substitua as credenciais do banco:
   - `DB_NAME` → Nome do seu banco na Hostgator
   - `DB_USER` → Usuário do MySQL na Hostgator
   - `DB_PASSWORD` → Senha do MySQL na Hostgator

9. Clique em **Save Changes**

---

### **Passo 4: Ajustar Permissões** 🔐

**Via cPanel File Manager:**

1. Navegue até `public_html/sinergy/logs/`
2. Clique com botão direito na pasta `logs`
3. Selecione **Change Permissions** (Alterar Permissões)
4. Marque: **Read, Write, Execute** para Owner, Group e Others
5. Ou digite: `777`
6. Clique em **Change Permissions**

**Permissões corretas:**
```
public_html/sinergy/
├── api/          → 755
├── config/       → 755
├── public/       → 755
├── logs/         → 777 (precisa escrita!)
└── .env          → 644
```

---

### **Passo 5: Testar** 🧪

Abra o navegador e teste:

**1. Teste a API:**
```
https://virtualcriacoes.com/sinergy/api/status
```

**Deve retornar:**
```json
{
    "status": "success",
    "message": "API funcionando corretamente"
}
```

**2. Teste o Frontend:**
```
https://virtualcriacoes.com/sinergy/public/
```

**3. Interface de Testes (opcional):**
```
https://virtualcriacoes.com/sinergy/test-api.html
```

---

## ✅ **Se tudo funcionar:**

Pronto! Seu sistema está no ar! 🎉

---

## ⚠️ **Problemas Comuns e Soluções:**

### **Erro 500 (Internal Server Error)**

**Causa:** Permissões incorretas ou .env com erro

**Solução:**
1. Verifique permissões da pasta `logs/` (deve ser 777)
2. Verifique se o arquivo `.env` foi criado
3. Verifique se as credenciais do banco estão corretas

**Como verificar erros:**
1. No cPanel, vá em **Errors** (Erros)
2. Veja os últimos erros do Apache
3. Ou leia: `public_html/sinergy/logs/php_errors.log`

---

### **API retorna HTML ao invés de JSON**

**Causa:** mod_rewrite não está funcionando

**Solução:**
1. Verifique se o arquivo `api/.htaccess` existe
2. Teste a URL direta:
   ```
   https://virtualcriacoes.com/sinergy/api/index.php
   ```
3. Se funcionar, contate Hostgator para habilitar mod_rewrite

---

### **Erro de conexão com banco de dados**

**Causa:** Credenciais incorretas no `.env`

**Solução:**
1. No cPanel, vá em **MySQL Databases**
2. Verifique o nome do banco, usuário e senha
3. Atualize o arquivo `.env`
4. **IMPORTANTE:** Na Hostgator, o nome do banco geralmente é:
   - Formato: `usuario_nomedoBanco`
   - Exemplo: `atriu019_sinergy`

---

### **CSS/JS/Imagens não carregam (404)**

**Causa:** Paths incorretos

**Solução:**
1. Verifique se a pasta `public/assets/` existe
2. Verifique permissões (deve ser 755)
3. Teste URL direta de um CSS:
   ```
   https://virtualcriacoes.com/sinergy/public/assets/css/base.css
   ```

---

## 🔄 **Opção: Usar Subdomínio (Recomendado)**

Para ter uma URL mais limpa como `sinergy.virtualcriacoes.com`:

### **Passo 1: Criar Subdomínio no cPanel**

1. No cPanel, clique em **Subdomains**
2. Em **Subdomain**, digite: `sinergy`
3. Em **Document Root**, digite: `public_html/sinergy/public`
4. Clique em **Create**

### **Passo 2: Aguardar Propagação**

- Pode levar de 5 minutos a 24 horas

### **Passo 3: Acessar**

Agora você pode acessar:
- Frontend: `https://sinergy.virtualcriacoes.com`
- API: `https://sinergy.virtualcriacoes.com/../api/status`

### **Passo 4: Atualizar .env**

Edite o `.env` e mude:
```env
APP_URL=https://sinergy.virtualcriacoes.com
```

---

## 📊 **Estrutura no Servidor (Visual)**

```
Hostgator cPanel
└── public_html/
    └── sinergy/                    ← Pasta do projeto
        ├── .env                    ← ⚠️ CRIAR MANUALMENTE!
        ├── .env.example           ← Modelo (copie daqui)
        ├── .htaccess              ✅ Do GitHub
        ├── README.md              ✅ Do GitHub
        │
        ├── api/                   ✅ Do GitHub
        │   ├── index.php
        │   └── .htaccess
        │
        ├── config/                ✅ Do GitHub
        │   ├── config.php
        │   ├── database.php
        │   └── cors.php
        │
        ├── src/                   ✅ Do GitHub
        │   └── ...
        │
        ├── public/                ✅ Do GitHub
        │   ├── index.html
        │   ├── assets/
        │   └── pages/
        │
        └── logs/                  ✅ Do GitHub (ajustar permissão!)
            └── php_errors.log
```

---

## 🎯 **Resumo Super Rápido:**

1. ⬇️ Baixe do GitHub
2. 📤 Upload para `public_html/sinergy/`
3. 🔑 **CRIE `.env`** com credenciais do banco
4. 🔐 Permissão 777 na pasta `logs/`
5. 🧪 Teste: `https://virtualcriacoes.com/sinergy/api/status`

---

## ✅ **Checklist Final:**

- [ ] Pasta `sinergy` enviada para servidor
- [ ] Arquivo `.env` criado e configurado
- [ ] Credenciais do banco corretas no `.env`
- [ ] Permissão 777 na pasta `logs/`
- [ ] API testada e funcionando
- [ ] Frontend testado e funcionando

---

## 📞 **Suporte:**

Se algo não funcionar:

1. Leia os logs: `logs/php_errors.log`
2. Consulte: `MIGRATION_GUIDE.md` (guia completo)
3. Consulte: `README.md` (documentação)

---

**Boa sorte com o deploy! 🚀**
