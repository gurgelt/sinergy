# 📦 Deploy via ZIP no cPanel - Passo a Passo

## 🎯 **Guia Completo e Visual**

---

## 📋 **PASSO 1: Preparar o ZIP no seu PC**

### **1.1 - Baixar do GitHub (se ainda não baixou)**

1. Acesse: https://github.com/gurgelt/sinergy
2. Clique no botão verde **Code**
3. Selecione **Download ZIP**
4. Salve no seu computador (ex: Downloads)
5. **Extraia o ZIP** (clique com botão direito → Extrair aqui)
6. Você terá uma pasta chamada `sinergy-main` ou `sinergy`

### **1.2 - Renomear a Pasta (se necessário)**

- Se a pasta se chamar `sinergy-main`, renomeie para apenas `sinergy`
- Clique com botão direito → Renomear → Digite: `sinergy`

### **1.3 - Compactar a Pasta**

1. Localize a pasta `sinergy`
2. Clique com **botão direito** na pasta
3. Selecione **Enviar para** → **Pasta compactada (zip)**
4. Será criado: `sinergy.zip` (ao lado da pasta)

**Estrutura esperada:**
```
📁 Downloads/
  ├── 📁 sinergy/           ← Pasta original
  └── 📦 sinergy.zip        ← Este você vai enviar!
```

---

## 🌐 **PASSO 2: Acessar o cPanel da Hostgator**

### **2.1 - Fazer Login**

1. Acesse: https://virtualcriacoes.com/cpanel

   **OU**

2. Entre no portal da Hostgator
3. Clique em **cPanel** na sua conta

### **2.2 - Localizar o File Manager**

1. No cPanel, role a página até encontrar a seção **FILES** (Arquivos)
2. Clique em **File Manager** (Gerenciador de Arquivos)
3. Uma nova aba vai abrir

---

## 📤 **PASSO 3: Upload do ZIP**

### **3.1 - Navegar até public_html**

1. No File Manager, no painel esquerdo, clique em **public_html**
2. Você verá os arquivos do seu site atual

### **3.2 - Fazer Upload do ZIP**

1. No topo da página, clique no botão **Upload**
   ```
   [Upload] [+ File] [+ Folder] [Copy] [Move]...
   ```

2. Uma nova página vai abrir

3. **Opção A - Arrastar arquivo:**
   - Abra a pasta onde está o `sinergy.zip` no seu PC
   - Arraste o arquivo `sinergy.zip` para a área de upload

4. **Opção B - Selecionar arquivo:**
   - Clique em **Select File** (Selecionar arquivo)
   - Navegue até o `sinergy.zip`
   - Clique em **Abrir**

5. Aguarde a barra de progresso completar
   ```
   Uploading: sinergy.zip
   [████████████████████] 100%
   ```

6. Quando terminar, clique em **Go Back to...** (Voltar para...)

---

## 📂 **PASSO 4: Extrair o ZIP no Servidor**

### **4.1 - Localizar o arquivo ZIP**

1. De volta ao File Manager
2. Você verá o arquivo `sinergy.zip` na lista
3. Role a página se necessário

### **4.2 - Extrair**

1. Clique com **botão direito** no arquivo `sinergy.zip`
2. No menu que aparecer, selecione **Extract** (Extrair)
3. Uma janela popup vai aparecer:
   ```
   Extract Files

   Extract to: /public_html/

   [Extract Files]  [Close]
   ```
4. Clique em **Extract Files** (Extrair Arquivos)
5. Aguarde a extração (pode levar alguns segundos)
6. Quando aparecer **Extraction Results**, clique em **Close**

### **4.3 - Verificar a Pasta**

1. No File Manager, você deve ver uma pasta `sinergy`
2. Clique nela para abrir
3. Verifique se todas as pastas estão lá:
   ```
   📁 sinergy/
     ├── 📁 api/
     ├── 📁 config/
     ├── 📁 public/
     ├── 📁 src/
     ├── 📁 logs/
     ├── 📄 .env.example
     ├── 📄 .htaccess
     └── 📄 README.md
   ```

### **4.4 - Deletar o ZIP (opcional)**

1. Volte para `public_html`
2. Clique com botão direito em `sinergy.zip`
3. Selecione **Delete** (Deletar)
4. Confirme a exclusão

---

## 🔑 **PASSO 5: Criar o arquivo .env (CRÍTICO!)**

### **5.1 - Navegar até a pasta sinergy**

1. No File Manager, entre em `public_html/sinergy/`

### **5.2 - Criar novo arquivo**

1. No topo, clique em **+ File**
2. Na janela popup:
   ```
   New Filename: .env

   [Create New File]
   ```
3. Digite exatamente: `.env` (com o ponto na frente!)
4. Clique em **Create New File**

### **5.3 - Editar o arquivo**

1. Localize o arquivo `.env` que acabou de criar
2. Clique com **botão direito** nele
3. Selecione **Edit** (Editar)
4. Se aparecer uma janela de confirmação, clique em **Edit** novamente

5. **Cole este conteúdo:**

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

6. Clique em **Save Changes** (Salvar Alterações) no canto superior direito
7. Feche o editor

---

## 🔐 **PASSO 6: Ajustar Permissões**

### **6.1 - Permissão da pasta logs/**

1. No File Manager, em `public_html/sinergy/`
2. Localize a pasta **logs** (já vem do GitHub)
3. Clique com **botão direito** na pasta `logs`
4. Selecione **Change Permissions** (Alterar Permissões)
5. Na janela que abrir:
   - Marque TODAS as caixas (Read, Write, Execute)
   - OU digite `777` no campo numérico
   ```
   User:  [✓] Read  [✓] Write  [✓] Execute
   Group: [✓] Read  [✓] Write  [✓] Execute
   World: [✓] Read  [✓] Write  [✓] Execute

   Numeric value: 777
   ```
6. Clique em **Change Permissions**

**Nota:** A pasta `logs/` agora vem no download do GitHub. Se por algum motivo não aparecer, crie-a manualmente:
- Clique em **+ Folder**
- Nome: `logs`
- Depois ajuste as permissões para 777

---

## 🧪 **PASSO 7: Testar a Aplicação**

### **7.1 - Teste da API**

1. Abra uma **nova aba** no navegador
2. Acesse:
   ```
   https://virtualcriacoes.com/sinergy/api/status
   ```

**Resposta esperada:**
```json
{
    "status": "success",
    "message": "API funcionando corretamente"
}
```

✅ **Se aparecer isso = SUCESSO!**

❌ **Se der erro, veja o PASSO 8 (Troubleshooting)**

### **7.2 - Teste do Frontend**

1. Acesse:
   ```
   https://virtualcriacoes.com/sinergy/public/
   ```

**O que deve aparecer:**
- Página de login do sistema
- Logo da Sinergy
- CSS carregado (visual bonito)

### **7.3 - Teste da Interface de Testes**

1. Acesse:
   ```
   https://virtualcriacoes.com/sinergy/test-api.html
   ```

**Vai abrir uma página bonita com botões para testar cada endpoint**

---

## 🎉 **PASSO 8: Está no AR!**

Se todos os testes passaram:

✅ **Parabéns! Seu sistema está funcionando!**

**URLs importantes:**
- Sistema: `https://virtualcriacoes.com/sinergy/public/`
- API: `https://virtualcriacoes.com/sinergy/api/`
- Testes: `https://virtualcriacoes.com/sinergy/test-api.html`

---

## ⚠️ **TROUBLESHOOTING - Se algo der errado:**

### **Erro 500 (Internal Server Error)**

**Possíveis causas:**
1. Permissões incorretas
2. Arquivo `.env` com erro
3. mod_rewrite desabilitado

**Soluções:**

**A) Verificar Permissões:**
- Pasta `logs/` deve estar em 777
- Pasta `api/` deve estar em 755

**B) Verificar .env:**
- Certifique-se que o arquivo `.env` foi criado
- Verifique se não tem espaços extras
- Verifique as credenciais do banco

**C) Ver os Erros:**
1. No cPanel, vá em **Metrics** → **Errors**
2. Veja os últimos erros
3. OU leia o arquivo: `sinergy/logs/php_errors.log`

### **Erro 404 - Not Found**

**Causa:** Caminho errado

**Solução:**
- Verifique se a URL está correta
- Certifique-se que a pasta se chama `sinergy` (minúsculo)

### **API retorna HTML ao invés de JSON**

**Causa:** mod_rewrite não está funcionando

**Solução:**
1. Teste URL direta: `https://virtualcriacoes.com/sinergy/api/index.php`
2. Se funcionar, contate Hostgator para habilitar mod_rewrite

### **Erro de conexão com banco de dados**

**Causa:** Credenciais incorretas no `.env`

**Solução:**
1. No cPanel, vá em **Databases** → **MySQL Databases**
2. Verifique:
   - Nome do banco
   - Nome do usuário
   - Senha
3. Atualize o `.env` com os valores corretos

### **CSS/JS não carregam (página sem estilo)**

**Causa:** Permissões ou paths incorretos

**Solução:**
1. Verifique se a pasta `public/assets/` existe
2. Verifique permissões (755)
3. Teste URL direta: `https://virtualcriacoes.com/sinergy/public/assets/css/base.css`

---

## 📊 **Checklist Final:**

Antes de considerar concluído, verifique:

- [ ] Pasta `sinergy` está em `public_html/`
- [ ] Arquivo `.env` foi criado
- [ ] Credenciais do banco estão corretas no `.env`
- [ ] Permissão 777 na pasta `logs/`
- [ ] `/api/status` retorna JSON de sucesso
- [ ] Frontend carrega (login aparece)
- [ ] CSS está aplicado (visual bonito)
- [ ] Sem erros no console do navegador (F12)

---

## 🎯 **Resumo Visual:**

```
SEU PC                    HOSTGATOR
─────────                 ─────────────────────
📁 sinergy/
   ├── api/
   ├── config/
   ├── public/
   └── ...
        │
        ↓
📦 sinergy.zip
        │
        │ Upload
        ↓
                          📤 public_html/
                             └── sinergy.zip
                                   │
                                   │ Extract
                                   ↓
                          📁 public_html/
                             └── sinergy/
                                  ├── api/
                                  ├── config/
                                  ├── public/
                                  ├── .env ← CRIAR!
                                  └── logs/ ← 777
```

---

## ✅ **Você conseguiu!**

Se seguiu todos os passos, seu sistema está **100% funcional** na Hostgator! 🎉

**Tempo total:** 5-10 minutos

---

**Dúvidas? Consulte:**
- `MIGRATION_GUIDE.md` - Guia completo e detalhado
- `README.md` - Documentação do sistema
- `DEPLOY_HOSTGATOR.md` - Alternativas de deploy

---

**Boa sorte! 🚀**
