<?php
/**
 * API REST - Sistema Sinergy
 * Ponto de Entrada da API
 * Versão Reestruturada e Otimizada
 */

// Carrega configurações
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../src/autoload.php';
require_once __DIR__ . '/../src/Utils/helpers.php';
require_once __DIR__ . '/../src/legacy_functions.php';

// Configura CORS
setup_cors();

// Obtém método HTTP e URI
$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$base_api_path = API_BASE_PATH;

// Remove base path da URI
if (strpos($request_uri, $base_api_path) === 0) {
    $path = substr($request_uri, strlen($base_api_path));
} else {
    $path = $request_uri;
}

// Remove query string do path
$path_parts = explode('?', $path, 2);
$path = $path_parts[0];

// Normaliza path
if (empty($path) || $path === '/') {
    $path = '/status';
} elseif (substr($path, 0, 1) !== '/') {
    $path = '/' . $path;
}

// Processa input JSON para POST e PUT
$input_data = null;
if (in_array($method, ['POST', 'PUT'])) {
    $raw_input = file_get_contents('php://input');
    $input_data = json_decode($raw_input, true);
    if (json_last_error() !== JSON_ERROR_NONE && !empty($raw_input)) {
        sendJsonResponse(['error' => 'JSON inválido'], 400);
    }
}

// === ROTEAMENTO DA API ===
try {
    switch (true) {
        // Status da API
        case $path === '/status':
            handleStatus();
            break;

        // === AUTENTICAÇÃO ===
        case $path === '/register' && $method === 'POST':
            handleRegister($input_data);
            break;

        case $path === '/login' && $method === 'POST':
            handleLogin($input_data);
            break;

        case $path === '/recover-password' && $method === 'POST':
            handleRecoverPassword($input_data);
            break;

        case $path === '/reset-password' && $method === 'POST':
            handleResetPassword($input_data);
            break;

        // === USUÁRIOS ===
        case preg_match('/^\/users\/([a-zA-Z0-9_.-]+)$/', $path, $matches):
            $username = $matches[1];
            if ($method === 'GET') {
                handleGetUserProfile($username);
            } elseif ($method === 'PUT') {
                handleUpdateUserProfile($username, $input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === BOBINAS ===
        case $path === '/bobinas':
            if ($method === 'GET') {
                handleGetBobinas();
            } elseif ($method === 'POST') {
                handleAddBobina($input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        case preg_match('/^\/bobinas\/(\d+)$/', $path, $matches):
            $bobina_id = (int)$matches[1];
            if ($method === 'GET') {
                handleGetBobinaById($bobina_id);
            } elseif ($method === 'PUT') {
                handleUpdateBobina($bobina_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteBobina($bobina_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === PRODUÇÕES ===
        case $path === '/producoes':
            if ($method === 'GET') {
                handleGetProducoes();
            } elseif ($method === 'POST') {
                handleAddProducao($input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        case preg_match('/^\/producoes\/(\d+)$/', $path, $matches):
            $producao_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateProducao($producao_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteProducao($producao_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === MOVIMENTAÇÕES ===
        case $path === '/movimentacoes':
            if ($method === 'GET') {
                handleGetMovimentacoes();
            } elseif ($method === 'POST') {
                handleAddMovimentacao($input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        case preg_match('/^\/movimentacoes\/(\d+)$/', $path, $matches):
            $movimentacao_id = (int)$matches[1];
            if ($method === 'DELETE') {
                handleDeleteMovimentacao($movimentacao_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === MANUTENÇÕES ===
        case $path === '/manutencoes' && $method === 'GET':
            handleGetManutencoes();
            break;

        case $path === '/manutencoes' && $method === 'POST':
            handleAddManutencao($input_data);
            break;

        case preg_match('/^\/manutencoes\/(\d+)$/', $path, $matches):
            $manutencao_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateManutencao($manutencao_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteManutencao($manutencao_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === PRODUTOS ===
        case $path === '/produtos' && $method === 'GET':
            handleGetProdutos();
            break;

        case $path === '/produtos' && $method === 'POST':
            handleAddProduto($input_data);
            break;

        case preg_match('/^\/produtos\/(\d+)$/', $path, $matches):
            $produto_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateProduto($produto_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteProduto($produto_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === ORÇAMENTOS ===
        case $path === '/orcamentos' && $method === 'GET':
            handleGetOrcamentos();
            break;

        case $path === '/orcamentos' && $method === 'POST':
            handleAddOrcamento($input_data);
            break;

        case preg_match('/^\/orcamentos\/(\d+)$/', $path, $matches):
            $orcamento_id = (int)$matches[1];
            if ($method === 'GET') {
                handleGetOrcamentoById($orcamento_id);
            } elseif ($method === 'PUT') {
                handleUpdateOrcamento($orcamento_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteOrcamento($orcamento_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === PEDIDOS ===
        case $path === '/pedidos' && $method === 'GET':
            handleGetPedidos();
            break;

        case preg_match('/^\/pedidos\/(\d+)$/', $path, $matches):
            $pedido_id = (int)$matches[1];
            if ($method === 'GET') {
                handleGetPedidoById($pedido_id);
            } elseif ($method === 'PUT') {
                handleUpdatePedidoStatus($pedido_id, $input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === CLIENTES ===
        case $path === '/clientes' && $method === 'GET':
            handleGetClientes();
            break;

        case $path === '/clientes' && $method === 'POST':
            handleAddCliente($input_data);
            break;

        case preg_match('/^\/clientes\/(\d+)$/', $path, $matches):
            $cliente_id = (int)$matches[1];
            if ($method === 'GET') {
                handleGetClienteById($cliente_id);
            } elseif ($method === 'PUT') {
                handleUpdateCliente($cliente_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteCliente($cliente_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === FINANCEIRO ===
        case $path === '/contas-pagar' && $method === 'GET':
            handleGetContasPagar();
            break;

        case $path === '/contas-pagar' && $method === 'POST':
            handleAddContaPagar($input_data);
            break;

        case preg_match('/^\/contas-pagar\/(\d+)$/', $path, $matches):
            $conta_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateContaPagar($conta_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteContaPagar($conta_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        case $path === '/contas-receber' && $method === 'GET':
            handleGetContasReceber();
            break;

        case preg_match('/^\/contas-receber\/(\d+)$/', $path, $matches):
            $conta_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateContaReceber($conta_id, $input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        case $path === '/financeiro/dashboard' && $method === 'GET':
            handleGetFinanceiroDashboard();
            break;

        // === FUNCIONÁRIOS/RH ===
        case $path === '/funcionarios' && $method === 'GET':
            handleGetFuncionarios();
            break;

        case $path === '/funcionarios' && $method === 'POST':
            handleAddFuncionario($input_data);
            break;

        case preg_match('/^\/funcionarios\/(\d+)$/', $path, $matches):
            $funcionario_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateFuncionario($funcionario_id, $input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        case $path === '/usuarios-sem-vinculo' && $method === 'GET':
            handleGetUsuariosSemVinculo();
            break;

        case $path === '/vendedores' && $method === 'GET':
            handleGetListaVendedores();
            break;

        // === PERMISSÕES ===
        case preg_match('/^\/permissoes\/(\d+)$/', $path, $matches):
            $usuario_id = (int)$matches[1];
            if ($method === 'GET') {
                handleGetPermissoes($usuario_id);
            } elseif ($method === 'POST' || $method === 'PUT') {
                handleSavePermissoes($usuario_id, $input_data);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === SOLICITAÇÕES DE COMPRAS ===
        case $path === '/solicitacoes-compras' && $method === 'GET':
            handleGetSolicitacoesCompras();
            break;

        case $path === '/solicitacoes-compras' && $method === 'POST':
            handleAddSolicitacaoCompra($input_data);
            break;

        case preg_match('/^\/solicitacoes-compras\/(\d+)$/', $path, $matches):
            $solicitacao_id = (int)$matches[1];
            if ($method === 'PUT') {
                handleUpdateSolicitacaoCompra($solicitacao_id, $input_data);
            } elseif ($method === 'DELETE') {
                handleDeleteSolicitacaoCompra($solicitacao_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === AVISOS DO SISTEMA ===
        case $path === '/avisos' && $method === 'GET':
            handleGetAvisosSistema();
            break;

        case $path === '/avisos' && $method === 'POST':
            handleAddAvisoSistema($input_data);
            break;

        case preg_match('/^\/avisos\/(\d+)$/', $path, $matches):
            $aviso_id = (int)$matches[1];
            if ($method === 'DELETE') {
                handleDeleteAvisoSistema($aviso_id);
            } else {
                sendJsonResponse(['error' => 'Método não permitido'], 405);
            }
            break;

        // === DASHBOARD DIRETORIA ===
        case $path === '/diretoria/dashboard' && $method === 'GET':
            handleGetDiretoriaDashboard();
            break;

        // === ROTA NÃO ENCONTRADA ===
        default:
            sendJsonResponse(['error' => 'Endpoint não encontrado: ' . $path], 404);
            break;
    }
} catch (Exception $e) {
    error_log("Erro na API: " . $e->getMessage());
    sendJsonResponse(['error' => 'Erro interno do servidor'], 500);
}
