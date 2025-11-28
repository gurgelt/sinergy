<?php
require_once __DIR__ . '/../config/config.php';

header('Content-Type: application/json');

echo json_encode([
    'REQUEST_URI' => $_SERVER['REQUEST_URI'],
    'API_BASE_PATH' => API_BASE_PATH,
    'PATH_INFO' => $_SERVER['PATH_INFO'] ?? 'NOT SET',
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'],
    'PHP_SELF' => $_SERVER['PHP_SELF'],
    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? '',
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD']
], JSON_PRETTY_PRINT);
?>
