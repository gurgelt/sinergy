<?php
/**
 * Router para servidor PHP embutido
 * Sistema Sinergy
 *
 * Este arquivo permite que o servidor PHP embutido roteie corretamente
 * as requisições para a API.
 *
 * Uso: php -S localhost:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Se a requisição for para a API
if (strpos($uri, '/api') === 0) {
    // Remove /api do início
    $_SERVER['REQUEST_URI'] = $uri;
    require_once __DIR__ . '/api/index.php';
    exit;
}

// Se for um arquivo real, serve diretamente
if ($uri !== '/' && file_exists(__DIR__ . '/public' . $uri)) {
    return false; // Serve o arquivo
}

// Caso contrário, serve do diretório public
if (file_exists(__DIR__ . '/public' . $uri)) {
    return false;
}

// Se for a raiz ou não existir, tenta servir index.html
if ($uri === '/' || !file_exists(__DIR__ . '/public' . $uri)) {
    if (file_exists(__DIR__ . '/public/index.html')) {
        require __DIR__ . '/public/index.html';
        exit;
    }
}

// 404
http_response_code(404);
echo "404 - Not Found";
