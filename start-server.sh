#!/bin/bash
# Script para iniciar servidor de desenvolvimento local
# Sistema Sinergy

echo "🚀 Iniciando Servidor de Desenvolvimento..."
echo ""
echo "📁 Diretório: $(pwd)/public"
echo "🌐 URL: http://localhost:8000"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - A API estará disponível em: http://localhost:8000/../api/"
echo "   - Use Ctrl+C para parar o servidor"
echo ""
echo "✅ Servidor iniciado!"
echo "-----------------------------------"
echo ""

# Inicia servidor PHP na pasta public
cd public && php -S localhost:8000
