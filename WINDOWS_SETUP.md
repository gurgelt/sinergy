# 🪟 Guia de Instalação - Windows

## Problema: "php não é reconhecido"

Se você recebeu este erro ao tentar executar `php -S localhost:8000`, é porque o PHP não está instalado no seu Windows.

---

## ✅ **Solução 1: XAMPP (Recomendado - Mais Fácil)**

### **Passo 1: Baixar XAMPP**

1. Acesse: https://www.apachefriends.org/download.html
2. Baixe a versão para Windows (PHP 8.x)
3. Execute o instalador

### **Passo 2: Instalar**

1. Durante a instalação, selecione:
   - ✅ Apache
   - ✅ MySQL
   - ✅ PHP
   - ✅ phpMyAdmin

2. Instale em: `C:\xampp`

### **Passo 3: Copiar o Projeto**

1. Copie a pasta `sinergy` completa para:
   ```
   C:\xampp\htdocs\sinergy
   ```

### **Passo 4: Iniciar Serviços**

1. Abra o **XAMPP Control Panel**
2. Clique em **Start** no Apache
3. Clique em **Start** no MySQL

### **Passo 5: Acessar**

Abra o navegador e acesse:

- **Frontend:** http://localhost/sinergy/public/
- **API:** http://localhost/sinergy/api/status
- **Teste da API:** http://localhost/sinergy/test-api.html

### **Passo 6: Configurar Banco de Dados**

1. Acesse: http://localhost/phpmyadmin
2. Crie um banco de dados chamado `sinergy`
3. Importe o SQL do projeto (se houver)
4. Configure o arquivo `.env` na raiz do projeto

---

## ✅ **Solução 2: Instalar PHP Standalone**

Se você não quiser instalar o XAMPP completo:

### **Passo 1: Baixar PHP**

1. Acesse: https://windows.php.net/download/
2. Baixe: **VS16 x64 Thread Safe** (última versão)
3. Extraia para: `C:\php`

### **Passo 2: Adicionar ao PATH**

1. Aperte `Win + X` e selecione **Sistema**
2. Clique em **Configurações avançadas do sistema**
3. Clique em **Variáveis de Ambiente**
4. Em **Variáveis do sistema**, encontre `Path`
5. Clique em **Editar**
6. Clique em **Novo**
7. Adicione: `C:\php`
8. Clique em **OK** em todas as janelas

### **Passo 3: Reiniciar Terminal**

1. **Feche** todos os terminais abertos (PowerShell, CMD)
2. Abra um **novo** PowerShell
3. Teste:
   ```powershell
   php -v
   ```
   Deve mostrar a versão do PHP

### **Passo 4: Instalar MySQL Separadamente**

1. Baixe MySQL: https://dev.mysql.com/downloads/installer/
2. Instale e configure
3. Anote usuário e senha

### **Passo 5: Iniciar Servidor**

```powershell
cd C:\caminho\para\sinergy
php -S localhost:8000 router.php
```

### **Passo 6: Acessar**

- http://localhost:8000
- http://localhost:8000/test-api.html

---

## ✅ **Solução 3: Usar Docker (Avançado)**

Se você tem Docker instalado:

### **Criar docker-compose.yml na raiz do projeto:**

```yaml
version: '3.8'

services:
  web:
    image: php:8.1-apache
    container_name: sinergy_web
    ports:
      - "8000:80"
    volumes:
      - ./:/var/www/html
    environment:
      - APACHE_DOCUMENT_ROOT=/var/www/html/public

  mysql:
    image: mysql:8.0
    container_name: sinergy_db
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: sinergy
      MYSQL_USER: sinergy_user
      MYSQL_PASSWORD: sinergy_pass
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### **Iniciar:**

```bash
docker-compose up -d
```

### **Acessar:**
- http://localhost:8000

---

## 🎯 **Qual Escolher?**

| Solução | Dificuldade | Tempo | Recomendado Para |
|---------|-------------|-------|------------------|
| **XAMPP** | ⭐ Fácil | 10 min | Iniciantes |
| **PHP Standalone** | ⭐⭐ Médio | 15 min | Quem quer só PHP |
| **Docker** | ⭐⭐⭐ Difícil | 5 min | Desenvolvedores experientes |

---

## ✅ **Recomendação:**

**Use XAMPP!** É a solução mais completa e fácil para Windows.

1. ✅ Apache + PHP + MySQL já configurados
2. ✅ Interface gráfica fácil de usar
3. ✅ phpMyAdmin incluído
4. ✅ Tudo pronto em 10 minutos

---

## 📺 **Tutorial em Vídeo (Opcional)**

Se preferir assistir, busque no YouTube:
- "Como instalar XAMPP no Windows"
- "XAMPP installation tutorial"

---

## 🆘 **Problemas Comuns**

### **"Apache não inicia" no XAMPP**

**Causa:** Porta 80 ou 443 em uso (geralmente pelo Skype ou IIS)

**Solução:**

1. Abra XAMPP Control Panel
2. Clique em **Config** ao lado do Apache
3. Selecione **httpd.conf**
4. Procure por `Listen 80`
5. Mude para `Listen 8080`
6. Salve e reinicie o Apache
7. Acesse: http://localhost:8080/sinergy/public/

### **"MySQL não inicia" no XAMPP**

**Causa:** Porta 3306 em uso

**Solução:**

1. No XAMPP Control Panel, clique em **Config** ao lado do MySQL
2. Selecione **my.ini**
3. Procure por `port=3306`
4. Mude para `port=3307`
5. Salve e reinicie o MySQL
6. Atualize o `.env` com a nova porta

---

## 📞 **Precisa de Ajuda?**

Depois de instalar, se tiver problemas:

1. Verifique se Apache está **verde** no XAMPP Control Panel
2. Verifique se MySQL está **verde** no XAMPP Control Panel
3. Teste: http://localhost/
4. Teste o projeto: http://localhost/sinergy/public/

---

**Boa sorte! 🚀**
