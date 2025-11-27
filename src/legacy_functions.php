    $conn = get_db_connection();
    if (!$conn) {
        sendJsonResponse(['status' => 'error', 'message' => 'Falha na conexão com o banco de dados'], 500);
    }
    $conn->close();
    sendJsonResponse(['status' => 'success', 'message' => 'API funcionando corretamente']);
}

// === FUNÇÕES DE USUÁRIO ===
function handleLogin($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $username = sanitize_input($data['username']);
    $password = $data['password'];
    $stmt = $conn->prepare("SELECT ID, NomeCompleto, Email, SenhaHash, NomeUsuario, Role FROM Usuarios WHERE NomeUsuario = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    if ($user_data && check_password($password, $user_data['SenhaHash'])) {
        sendJsonResponse([
            'message' => 'Login bem-sucedido',
            'id' => $user_data['ID'],
            'username' => $user_data['NomeUsuario'],
            'fullname' => $user_data['NomeCompleto'],
            'email' => $user_data['Email'],
            'role' => $user_data['Role']
        ]);
    } else {
        sendJsonResponse(['error' => 'Usuário ou senha incorretos'], 401);
    }
}

function handleRegister($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    if (!isset($data['fullname'], $data['email'], $data['username'], $data['password'])) sendJsonResponse(['error' => 'Todos os campos são obrigatórios'], 400);
    if (!validate_email($data['email'])) sendJsonResponse(['error' => 'E-mail inválido'], 400);
    $fullname = sanitize_input($data['fullname']);
    $email = sanitize_input($data['email']);
    $username = sanitize_input($data['username']);
    $password = $data['password'];
    $hashed_password = hash_password($password);
    $stmt_check = $conn->prepare("SELECT ID FROM Usuarios WHERE NomeUsuario = ? OR Email = ?");
    $stmt_check->bind_param("ss", $username, $email);
    $stmt_check->execute();
    $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) {
        $stmt_check->close(); $conn->close();
        sendJsonResponse(['error' => 'Nome de usuário ou e-mail já em uso'], 409);
    }
    $stmt_check->close();
    $stmt_insert = $conn->prepare("INSERT INTO Usuarios (NomeCompleto, Email, NomeUsuario, SenhaHash) VALUES (?, ?, ?, ?)");
    $stmt_insert->bind_param("ssss", $fullname, $email, $username, $hashed_password);
    if ($stmt_insert->execute()) sendJsonResponse(['message' => 'Usuário registrado com sucesso'], 201);
    else { error_log("Erro ao registrar usuário: " . $stmt_insert->error); sendJsonResponse(['error' => 'Erro ao registrar usuário'], 500); }
    $stmt_insert->close(); $conn->close();
}

function handleRecoverPassword($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    if (!isset($data['email']) || !validate_email($data['email'])) sendJsonResponse(['error' => 'E-mail inválido'], 400);
    $email = sanitize_input($data['email']);
    $stmt = $conn->prepare("SELECT ID FROM Usuarios WHERE Email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    if (!$user) {
        $conn->close();
        sendJsonResponse(['message' => 'Se as informações estiverem corretas, você receberá um link para redefinir sua senha por e-mail.'], 200);
    }
    $user_id = $user['ID'];
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $stmt_token = $conn->prepare("UPDATE Usuarios SET password_reset_token = ?, token_expiry = ? WHERE ID = ?");
    $stmt_token->bind_param("ssi", $token, $expires_at, $user_id);
    $stmt_token->execute(); $stmt_token->close();
    $subject = "Redefinir sua senha - Sinergy ERP";
    $reset_link = "https://virtualcriacoes.com/pages/reset-password.html?token=" . $token;
    $body = "Olá, <br><br>Você solicitou a redefinição da sua senha. Clique no link abaixo para criar uma nova senha:<br><br><a href='$reset_link'>Redefinir Senha</a><br><br>Este link é válido por 1 hora. Se você não solicitou a redefinição, ignore este e-mail.<br><br>Atenciosamente,<br>Equipe Sinergy";
    $headers = "MIME-Version: 1.0" . "\r\n" . "Content-type:text/html;charset=UTF-8" . "\r\n" . 'From: <noreply@virtualcriacoes.com>' . "\r\n";
    if (mail($email, $subject, $body, $headers)) sendJsonResponse(['message' => 'Se as informações estiverem corretas, você receberá um link para redefinir sua senha por e-mail.'], 200);
    else { error_log("Erro ao enviar e-mail de recuperação para: " . $email); sendJsonResponse(['error' => 'Erro ao enviar e-mail. Por favor, entre em contato com o suporte.'], 500); }
    $conn->close();
}

function handleResetPassword($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    if (!isset($data['token']) || !isset($data['newPassword'])) sendJsonResponse(['error' => 'Dados incompletos'], 400);
    $token = sanitize_input($data['token']);
    $new_password = $data['newPassword'];
    $current_time = date('Y-m-d H:i:s');
    $stmt = $conn->prepare("SELECT ID FROM Usuarios WHERE password_reset_token = ? AND token_expiry > ?");
    $stmt->bind_param("ss", $token, $current_time);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    if (!$user) { $conn->close(); sendJsonResponse(['error' => 'Token inválido ou expirado.'], 400); }
    $user_id = $user['ID'];
    $hashed_password = hash_password($new_password);
    $stmt_update = $conn->prepare("UPDATE Usuarios SET SenhaHash = ?, password_reset_token = NULL, token_expiry = NULL WHERE ID = ?");
    $stmt_update->bind_param("si", $hashed_password, $user_id);
    if ($stmt_update->execute()) sendJsonResponse(['message' => 'Senha redefinida com sucesso.'], 200);
    else { error_log("Erro ao redefinir senha para o usuário ID: " . $user_id); sendJsonResponse(['error' => 'Erro interno ao redefinir senha.'], 500); }
    $stmt_update->close(); $conn->close();
}

function handleGetUserProfile($username) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $stmt = $conn->prepare("SELECT NomeCompleto, Email, NomeUsuario, FotoPerfilBase64 FROM Usuarios WHERE NomeUsuario = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();
    $stmt->close(); $conn->close();
    if ($user_data) sendJsonResponse($user_data, 200);
    else sendJsonResponse(['error' => 'Usuário não encontrado'], 404);
}

function handleUpdateUserProfile($username, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $fullname = $data['fullname'] ?? null;
    $email = $data['email'] ?? null;
    $new_password = $data['newPassword'] ?? null;
    $foto_perfil_base64 = $data['FotoPerfilBase64'] ?? null;
    $stmt_select = $conn->prepare("SELECT ID, SenhaHash FROM Usuarios WHERE NomeUsuario = ?");
    $stmt_select->bind_param("s", $username);
    $stmt_select->execute();
    $result_select = $stmt_select->get_result();
    $user_info = $result_select->fetch_assoc();
    $stmt_select->close();
    if (!$user_info) { $conn->close(); sendJsonResponse(['error' => 'Usuário não encontrado'], 404); }
    $update_query = "UPDATE Usuarios SET NomeCompleto = ?, Email = ?, FotoPerfilBase64 = ? WHERE NomeUsuario = ?";
    $params = [$fullname, $email, $foto_perfil_base64, $username];
    $types = "ssss";
    if ($new_password) {
        if (strlen($new_password) < 6) { $conn->close(); sendJsonResponse(['error' => 'A nova senha deve ter no mínimo 6 caracteres'], 400); }
        $hashed_new_password = hash_password($new_password);
        $update_query = "UPDATE Usuarios SET NomeCompleto = ?, Email = ?, SenhaHash = ?, FotoPerfilBase64 = ? WHERE NomeUsuario = ?";
        $params = [$fullname, $email, $hashed_new_password, $foto_perfil_base64, $username];
        $types = "sssss";
    }
    $stmt_update = $conn->prepare($update_query);
    $stmt_update->bind_param($types, ...$params);
    if ($stmt_update->execute()) sendJsonResponse(['message' => 'Perfil atualizado com sucesso'], 200);
    else { error_log("Erro ao atualizar perfil: " . $stmt_update->error); sendJsonResponse(['error' => 'Erro ao atualizar perfil: ' . $stmt_update->error], 500); }
    $stmt_update->close(); $conn->close();
}


// === FUNÇÕES DE BOBINAS, PRODUÇÕES, MOVIMENTAÇÕES ===
function handleGetBobinas() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $query = "SELECT ID, Tipo, Espessura, Largura, Fornecedor, NotaFiscal, DataRecebimento, Lote, Peso, Status, Observacao, NaturezaOperacao, TipoMovimentacao, Usuario FROM Bobinas ORDER BY ID DESC";
    $result = $conn->query($query);
    if ($result) {
        $bobinas = [];
        while ($row = $result->fetch_assoc()) { $row['DataRecebimento'] = date('Y-m-d', strtotime($row['DataRecebimento'])); $bobinas[] = $row; }
        sendJsonResponse($bobinas, 200);
    } else { error_log("Erro ao buscar bobinas: " . $conn->error); sendJsonResponse(['error' => 'Erro ao buscar bobinas: ' . $conn->error], 500); }
    $conn->close();
}

function handleGetBobinaById($bobina_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $stmt = $conn->prepare("SELECT ID, Tipo, Espessura, Largura, Fornecedor, NotaFiscal, DataRecebimento, Lote, Peso, Status, Observacao, NaturezaOperacao, TipoMovimentacao, Usuario FROM Bobinas WHERE ID = ?");
    $stmt->bind_param("i", $bobina_id); $stmt->execute();
    $result = $stmt->get_result(); $bobina_data = $result->fetch_assoc();
    $stmt->close(); $conn->close();
    if ($bobina_data) { $bobina_data['DataRecebimento'] = date('Y-m-d', strtotime($bobina_data['DataRecebimento'])); sendJsonResponse($bobina_data, 200); }
    else sendJsonResponse(['error' => 'Bobina não encontrada'], 404);
}

function handleAddBobina($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $required_fields = ['tipo', 'espessura', 'largura', 'fornecedor', 'notaFiscal', 'dataRecebimento', 'lote', 'peso', 'naturezaOperacao', 'tipoMovimentacao'];
    foreach ($required_fields as $field) { if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) sendJsonResponse(['error' => 'Dados incompletos para adicionar bobina.'], 400); }
    $peso = (float)($data['peso'] ?? 0);
    if ($peso < 0) sendJsonResponse(['error' => 'Peso não pode ser negativo'], 400);
    $status_final = ($peso <= 0) ? 'Indisponível' : 'Disponível';
    $observacao = $data['observacao'] ?? null; $usuario = $data['usuario'] ?? 'N/A';
    $stmt_check = $conn->prepare("SELECT ID FROM Bobinas WHERE Lote = ?");
    $stmt_check->bind_param("s", $data['lote']); $stmt_check->execute(); $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) { $stmt_check->close(); $conn->close(); sendJsonResponse(['error' => 'Lote já existente'], 409); }
    $stmt_check->close();
    $stmt_insert = $conn->prepare("INSERT INTO Bobinas (Tipo, Espessura, Largura, Fornecedor, NotaFiscal, DataRecebimento, Lote, Peso, Status, Observacao, NaturezaOperacao, TipoMovimentacao, Usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt_insert->bind_param("sddssssdsssss", $data['tipo'], $data['espessura'], $data['largura'], $data['fornecedor'], $data['notaFiscal'], $data['dataRecebimento'], $data['lote'], $peso, $status_final, $observacao, $data['naturezaOperacao'], $data['tipoMovimentacao'], $usuario);
    if ($stmt_insert->execute()) sendJsonResponse(['message' => 'Bobina adicionada com sucesso'], 201);
    else { error_log("Erro ao adicionar bobina: " . $stmt_insert->error); sendJsonResponse(['error' => 'Erro ao adicionar bobina: ' . $stmt_insert->error], 500); }
    $stmt_insert->close(); $conn->close();
}

function handleUpdateBobina($bobina_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $required_fields = ['tipo', 'espessura', 'largura', 'fornecedor', 'notaFiscal', 'dataRecebimento', 'lote', 'peso', 'naturezaOperacao', 'tipoMovimentacao'];
    foreach ($required_fields as $field) { if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) sendJsonResponse(['error' => 'Dados incompletos para atualizar bobina.'], 400); }
    $peso = (float)($data['peso'] ?? 0);
    if ($peso < 0) sendJsonResponse(['error' => 'Peso não pode ser negativo'], 400);
    $status_final = ($peso <= 0) ? 'Indisponível' : 'Disponível';
    $observacao = $data['observacao'] ?? null; $usuario = $data['usuario'] ?? 'N/A';
    $stmt_check = $conn->prepare("SELECT ID FROM Bobinas WHERE Lote = ? AND ID <> ?");
    $stmt_check->bind_param("si", $data['lote'], $bobina_id); $stmt_check->execute(); $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) { $stmt_check->close(); $conn->close(); sendJsonResponse(['error' => 'Lote já existente para outra bobina'], 409); }
    $stmt_check->close();
    $stmt_update = $conn->prepare("UPDATE Bobinas SET Tipo = ?, Espessura = ?, Largura = ?, Fornecedor = ?, NotaFiscal = ?, DataRecebimento = ?, Lote = ?, Peso = ?, Status = ?, Observacao = ?, NaturezaOperacao = ?, TipoMovimentacao = ?, Usuario = ? WHERE ID = ?");
    $stmt_update->bind_param("sddssssdsssssi", $data['tipo'], $data['espessura'], $data['largura'], $data['fornecedor'], $data['notaFiscal'], $data['dataRecebimento'], $data['lote'], $peso, $status_final, $observacao, $data['naturezaOperacao'], $data['tipoMovimentacao'], $usuario, $bobina_id);
    if ($stmt_update->execute()) {
        if ($stmt_update->affected_rows === 0) sendJsonResponse(['error' => 'Bobina não encontrada ou nenhum dado alterado'], 404);
        else sendJsonResponse(['message' => 'Bobina atualizada com sucesso'], 200);
    } else { error_log("Erro ao atualizar bobina: " . $stmt_update->error); sendJsonResponse(['error' => 'Erro ao atualizar bobina: ' . $stmt_update->error], 500); }
    $stmt_update->close(); $conn->close();
}

function handleDeleteBobina($bobina_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("DELETE FROM Bobinas WHERE ID = ?");
        $stmt->bind_param("i", $bobina_id);
        if ($stmt->execute()) {
            if ($stmt->affected_rows === 0) { $conn->rollback(); $stmt->close(); sendJsonResponse(['error' => 'Bobina não encontrada'], 404); }
            else { $conn->commit(); sendJsonResponse(['message' => 'Bobina excluída com sucesso'], 200); }
        } else {
            $conn->rollback();
            if (strpos($stmt->error, 'FOREIGN KEY') !== false || strpos($stmt->error, 'REFERENCE') !== false) sendJsonResponse(['error' => 'Não é possível excluir a bobina. Ela está sendo utilizada em uma produção ou movimentação.'], 409);
            else { error_log("Erro ao excluir bobina: " . $stmt->error); sendJsonResponse(['error' => 'Erro ao excluir bobina: ' . $stmt->error], 500); }
        }
        $stmt->close();
    } catch (Exception $e) {
        $conn->rollback(); error_log("Exceção ao excluir bobina: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro interno ao excluir bobina: ' . $e->getMessage()], 500);
    }
    $conn->close();
}

function handleGetProducoes() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $producoes = [];
    $stmt_producoes = $conn->prepare("SELECT ID, NotaFiscal, NumPedido, NomeCliente, DataProducao, Conferente FROM Producoes ORDER BY ID DESC");
    $stmt_producoes->execute(); $result_producoes = $stmt_producoes->get_result();
    while ($producao_row = $result_producoes->fetch_assoc()) {
        $producao_id = $producao_row['ID'];
        $producao_row['DataProducao'] = date('Y-m-d', strtotime($producao_row['DataProducao']));
        $producao_row['itens'] = [];
        $stmt_itens = $conn->prepare("SELECT ID, ProducaoID, Tipo, QtdLaminas, Altura, Comprimento, Volumes, Peso, SucataEsperada FROM ItensProducao WHERE ProducaoID = ?");
        $stmt_itens->bind_param("i", $producao_id); $stmt_itens->execute(); $result_itens = $stmt_itens->get_result();
        while ($item_row = $result_itens->fetch_assoc()) {
            $item_producao_id = $item_row['ID']; $item_row['bobinasUsadas'] = [];
            $stmt_bobinas_utilizadas = $conn->prepare("SELECT ID, ItemProducaoID, BobinaID, PesoUsado, SucataGerada FROM BobinasUtilizadas WHERE ItemProducaoID = ?");
            $stmt_bobinas_utilizadas->bind_param("i", $item_producao_id); $stmt_bobinas_utilizadas->execute(); $result_bobinas_utilizadas = $stmt_bobinas_utilizadas->get_result();
            while ($bu_row = $result_bobinas_utilizadas->fetch_assoc()) {
                $stmt_bobina_info = $conn->prepare("SELECT Lote, Tipo FROM Bobinas WHERE ID = ?");
                $stmt_bobina_info->bind_param("i", $bu_row['BobinaID']); $stmt_bobina_info->execute();
                $result_bobina_info = $stmt_bobina_info->get_result(); $bobina_info = $result_bobina_info->fetch_assoc(); $stmt_bobina_info->close();
                if ($bobina_info) { $bu_row['loteBobina'] = $bobina_info['Lote']; $bu_row['tipoBobina'] = $bobina_info['Tipo']; }
                else { $bu_row['loteBobina'] = 'Lote Desconhecido'; $bu_row['tipoBobina'] = 'Tipo Desconhecido'; }
                $item_row['bobinasUsadas'][] = $bu_row;
            }
            $stmt_bobinas_utilizadas->close(); $producao_row['itens'][] = $item_row;
        }
        $stmt_itens->close(); $producoes[] = $producao_row;
    }
    $stmt_producoes->close(); $conn->close();
    sendJsonResponse($producoes, 200);
}

function handleAddProducao($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $conn->begin_transaction();
    try {
        $required_producao_fields = ['NotaFiscal', 'NumPedido', 'NomeCliente', 'DataProducao', 'Conferente'];
        foreach ($required_producao_fields as $field) { if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) throw new Exception("Dados incompletos para adicionar produção. Campo '$field' ausente ou vazio."); }
        if (empty($data['itens'])) throw new Exception('A produção deve conter pelo menos um item.');
        $stmt_producao = $conn->prepare("INSERT INTO Producoes (NotaFiscal, NumPedido, NomeCliente, DataProducao, Conferente) VALUES (?, ?, ?, ?, ?)");
        $stmt_producao->bind_param("sssss", $data['NotaFiscal'], $data['NumPedido'], $data['NomeCliente'], $data['DataProducao'], $data['Conferente']);
        $stmt_producao->execute(); $producao_id = $conn->insert_id; $stmt_producao->close();
        foreach ($data['itens'] as $item_data) {
            $required_item_fields = ['Tipo', 'QtdLaminas', 'Comprimento', 'Volumes', 'Peso'];
            foreach ($required_item_fields as $field) { if (!isset($item_data[$field]) || (is_string($item_data[$field]) && trim($item_data[$field]) === '')) throw new Exception("Dados incompletos para item de produção. Campo '$field' ausente ou vazio."); }
            $sucata_esperada = $item_data['SucataEsperada'] ?? 0;
            $stmt_item = $conn->prepare("INSERT INTO ItensProducao (ProducaoID, Tipo, QtdLaminas, Altura, Comprimento, Volumes, Peso, SucataEsperada) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt_item->bind_param("isiddddd", $producao_id, $item_data['Tipo'], $item_data['QtdLaminas'], $item_data['Altura'], $item_data['Comprimento'], $item_data['Volumes'], $item_data['Peso'], $item_data['SucataEsperada']);
            $stmt_item->execute(); $item_producao_id = $conn->insert_id; $stmt_item->close();
            if (empty($item_data['bobinasUsadas'])) throw new Exception("Cada item de produção deve ter pelo menos uma bobina utilizada.");
            foreach ($item_data['bobinasUsadas'] as $bobina_usada_data) {
                $required_bu_fields = ['BobinaID', 'PesoUsado', 'SucataGerada'];
                foreach ($required_bu_fields as $field) { if (!isset($bobina_usada_data[$field]) || (is_string($bobina_usada_data[$field]) && trim($bobina_usada_data[$field]) === '')) throw new Exception("Dados incompletos para bobina utilizada."); }
                $total_consumido = (float)$bobina_usada_data['PesoUsado'] + (float)$bobina_usada_data['SucataGerada'];
                $stmt_update_bobina = $conn->prepare("UPDATE Bobinas SET Peso = Peso - ? WHERE ID = ?");
                $stmt_update_bobina->bind_param("di", $total_consumido, $bobina_usada_data['BobinaID']);
                $stmt_update_bobina->execute(); $stmt_update_bobina->close();
                $stmt_update_status = $conn->prepare("UPDATE Bobinas SET Status = CASE WHEN Peso <= 0 THEN 'Indisponível' ELSE 'Disponível' END WHERE ID = ?");
                $stmt_update_status->bind_param("i", $bobina_usada_data['BobinaID']);
                $stmt_update_status->execute(); $stmt_update_status->close();
                $stmt_bu = $conn->prepare("INSERT INTO BobinasUtilizadas (ItemProducaoID, BobinaID, PesoUsado, SucataGerada) VALUES (?, ?, ?, ?)");
                $stmt_bu->bind_param("iidd", $item_producao_id, $bobina_usada_data['BobinaID'], $bobina_usada_data['PesoUsado'], $bobina_usada_data['SucataGerada']);
                $stmt_bu->execute(); $stmt_bu->close();
            }
        }
        $conn->commit(); sendJsonResponse(['message' => 'Produção registrada com sucesso', 'id' => $producao_id], 201);
    } catch (Exception $e) {
        $conn->rollback(); error_log("Erro ao registrar produção: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao registrar produção: ' . $e->getMessage()], 500);
    } finally { $conn->close(); }
}

function handleUpdateProducao($producao_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $conn->begin_transaction();
    try {
        $required_producao_fields = ['NotaFiscal', 'NumPedido', 'NomeCliente', 'DataProducao', 'Conferente'];
        foreach ($required_producao_fields as $field) { if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) throw new Exception("Dados incompletos para atualizar produção."); }
        if (empty($data['itens'])) throw new Exception('A produção deve conter pelo menos um item.');
        $stmt_get_itens = $conn->prepare("SELECT ID FROM ItensProducao WHERE ProducaoID = ?");
        $stmt_get_itens->bind_param("i", $producao_id); $stmt_get_itens->execute(); $result_itens = $stmt_get_itens->get_result();
        while ($item_row = $result_itens->fetch_assoc()) {
            $item_id = $item_row['ID'];
            $stmt_get_bu = $conn->prepare("SELECT BobinaID, PesoUsado, SucataGerada FROM BobinasUtilizadas WHERE ItemProducaoID = ?");
            $stmt_get_bu->bind_param("i", $item_id); $stmt_get_bu->execute(); $result_bu = $stmt_get_bu->get_result();
            while ($bu_row = $result_bu->fetch_assoc()) {
                $bobina_id_original = $bu_row['BobinaID'];
                $total_consumido_original = (float)$bu_row['PesoUsado'] + (float)($bu_row['SucataGerada'] ?? 0);
                $stmt_return_peso = $conn->prepare("UPDATE Bobinas SET Peso = Peso + ? WHERE ID = ?");
                $stmt_return_peso->bind_param("di", $total_consumido_original, $bobina_id_original);
                $stmt_return_peso->execute(); $stmt_return_peso->close();
                $stmt_update_status_return = $conn->prepare("UPDATE Bobinas SET Status = CASE WHEN Peso <= 0 THEN 'Indisponível' ELSE 'Disponível' END WHERE ID = ?");
                $stmt_update_status_return->bind_param("i", $bobina_id_original);
                $stmt_update_status_return->execute(); $stmt_update_status_return->close();
            }
            $stmt_get_bu->close();
        }
        $stmt_get_itens->close();
        $stmt_delete_bu = $conn->prepare("DELETE FROM BobinasUtilizadas WHERE ItemProducaoID IN (SELECT ID FROM ItensProducao WHERE ProducaoID = ?)");
        $stmt_delete_bu->bind_param("i", $producao_id); $stmt_delete_bu->execute(); $stmt_delete_bu->close();
        $stmt_delete_itens = $conn->prepare("DELETE FROM ItensProducao WHERE ProducaoID = ?");
        $stmt_delete_itens->bind_param("i", $producao_id); $stmt_delete_itens->execute(); $stmt_delete_itens->close();
        $stmt_update_producao = $conn->prepare("UPDATE Producoes SET NotaFiscal = ?, NumPedido = ?, NomeCliente = ?, DataProducao = ?, Conferente = ? WHERE ID = ?");
        $stmt_update_producao->bind_param("sssssi", $data['NotaFiscal'], $data['NumPedido'], $data['NomeCliente'], $data['DataProducao'], $data['Conferente'], $producao_id);
        $stmt_update_producao->execute(); $stmt_update_producao->close();
        foreach ($data['itens'] as $item_data) {
            $required_item_fields = ['Tipo', 'QtdLaminas', 'Comprimento', 'Volumes', 'Peso'];
            foreach ($required_item_fields as $field) { if (!isset($item_data[$field]) || (is_string($item_data[$field]) && trim($item_data[$field]) === '')) throw new Exception("Dados incompletos para item de produção."); }
            $sucata_esperada = $item_data['SucataEsperada'] ?? 0;
            $stmt_item = $conn->prepare("INSERT INTO ItensProducao (ProducaoID, Tipo, QtdLaminas, Altura, Comprimento, Volumes, Peso, SucataEsperada) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt_item->bind_param("isiddddd", $producao_id, $item_data['Tipo'], $item_data['QtdLaminas'], $item_data['Altura'], $item_data['Comprimento'], $item_data['Volumes'], $item_data['Peso'], $item_data['SucataEsperada']);
            $stmt_item->execute(); $item_producao_id = $conn->insert_id;
            if ($stmt_item->error) { error_log("Erro no insert de ItensProducao: " . $stmt_item->error); throw new Exception("Erro ao inserir item de produção: " . $stmt_item->error); }
            $stmt_item->close();
            if (empty($item_data['bobinasUsadas'])) throw new Exception("Cada item de produção deve ter pelo menos uma bobina utilizada.");
            foreach ($item_data['bobinasUsadas'] as $bobina_usada_data) {
                $required_bu_fields = ['BobinaID', 'PesoUsado', 'SucataGerada'];
                foreach ($required_bu_fields as $field) { if (!isset($bobina_usada_data[$field]) || (is_string($bobina_usada_data[$field]) && trim($bobina_usada_data[$field]) === '')) throw new Exception("Dados incompletos para bobina utilizada."); }
                $total_consumido_novo = (float)$bobina_usada_data['PesoUsado'] + (float)$bobina_usada_data['SucataGerada'];
                $stmt_update_bobina_new = $conn->prepare("UPDATE Bobinas SET Peso = Peso - ? WHERE ID = ?");
                $stmt_update_bobina_new->bind_param("di", $total_consumido_novo, $bobina_usada_data['BobinaID']);
                $stmt_update_bobina_new->execute(); $stmt_update_bobina_new->close();
                $stmt_update_status_new = $conn->prepare("UPDATE Bobinas SET Status = CASE WHEN Peso <= 0 THEN 'Indisponível' ELSE 'Disponível' END WHERE ID = ?");
                $stmt_update_status_new->bind_param("i", $bobina_usada_data['BobinaID']);
                $stmt_update_status_new->execute(); $stmt_update_status_new->close();
                $stmt_bu = $conn->prepare("INSERT INTO BobinasUtilizadas (ItemProducaoID, BobinaID, PesoUsado, SucataGerada) VALUES (?, ?, ?, ?)");
                $stmt_bu->bind_param("iidd", $item_producao_id, $bobina_usada_data['BobinaID'], $bobina_usada_data['PesoUsado'], $bobina_usada_data['SucataGerada']);
                $stmt_bu->execute();
                if ($stmt_bu->error) { error_log("Erro no insert de BobinasUtilizadas: " . $stmt_bu->error); throw new Exception("Erro ao inserir bobina utilizada: " . $stmt_bu->error); }
                $stmt_bu->close();
            }
        }
        $conn->commit(); sendJsonResponse(['message' => 'Produção atualizada com sucesso'], 200);
    } catch (Exception $e) {
        $conn->rollback(); error_log("Erro ao atualizar produção: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao atualizar produção: ' . $e->getMessage()], 500);
    } finally { $conn->close(); }
}

function handleDeleteProducao($producao_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $conn->begin_transaction();
    try {
        $stmt_get_itens = $conn->prepare("SELECT ID FROM ItensProducao WHERE ProducaoID = ?");
        $stmt_get_itens->bind_param("i", $producao_id); $stmt_get_itens->execute(); $result_itens = $stmt_get_itens->get_result();
        while ($item_row = $result_itens->fetch_assoc()) {
            $item_id = $item_row['ID'];
            $stmt_get_bu = $conn->prepare("SELECT BobinaID, PesoUsado, SucataGerada FROM BobinasUtilizadas WHERE ItemProducaoID = ?");
            $stmt_get_bu->bind_param("i", $item_id); $stmt_get_bu->execute(); $result_bu = $stmt_get_bu->get_result();
            while ($bu_row = $result_bu->fetch_assoc()) {
                $bobina_id_original = $bu_row['BobinaID'];
                $total_consumido_original = (float)$bu_row['PesoUsado'] + (float)($bu_row['SucataGerada'] ?? 0);
                $stmt_return_peso = $conn->prepare("UPDATE Bobinas SET Peso = Peso + ? WHERE ID = ?");
                $stmt_return_peso->bind_param("di", $total_consumido_original, $bobina_id_original);
                $stmt_return_peso->execute(); $stmt_return_peso->close();
                $stmt_update_status_return = $conn->prepare("UPDATE Bobinas SET Status = CASE WHEN Peso <= 0 THEN 'Indisponível' ELSE 'Disponível' END WHERE ID = ?");
                $stmt_update_status_return->bind_param("i", $bobina_id_original);
                $stmt_update_status_return->execute(); $stmt_update_status_return->close();
            }
            $stmt_get_bu->close();
        }
        $stmt_get_itens->close();
        $stmt_delete_bu = $conn->prepare("DELETE FROM BobinasUtilizadas WHERE ItemProducaoID IN (SELECT ID FROM ItensProducao WHERE ProducaoID = ?)");
        $stmt_delete_bu->bind_param("i", $producao_id); $stmt_delete_bu->execute(); $stmt_delete_bu->close();
        $stmt_delete_itens = $conn->prepare("DELETE FROM ItensProducao WHERE ProducaoID = ?");
        $stmt_delete_itens->bind_param("i", $producao_id); $stmt_delete_itens->execute(); $stmt_delete_itens->close();
        $stmt_delete_producao = $conn->prepare("DELETE FROM Producoes WHERE ID = ?");
        $stmt_delete_producao->bind_param("i", $producao_id); $stmt_delete_producao->execute(); $stmt_delete_producao->close();
        if ($conn->affected_rows === 0) { $conn->rollback(); sendJsonResponse(['error' => 'Produção não encontrada'], 404); }
        else { $conn->commit(); sendJsonResponse(['message' => 'Produção excluída com sucesso'], 200); }
    } catch (Exception $e) {
        $conn->rollback(); error_log("Erro ao excluir produção: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao excluir produção: ' . $e->getMessage()], 500);
    } finally { $conn->close(); }
}

function handleGetMovimentacoes() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $query = "SELECT ID, Timestamp, TipoMovimentacao, NaturezaOperacao, Descricao, Lote, PesoKG, OrigemDestino, Observacao, Usuario FROM Movimentacoes ORDER BY Timestamp DESC";
    $result = $conn->query($query);
    if ($result) {
        $movimentacoes = [];
        while ($row = $result->fetch_assoc()) { $row['Timestamp'] = date('c', strtotime($row['Timestamp'])); $movimentacoes[] = $row; }
        sendJsonResponse($movimentacoes, 200);
    } else { error_log("Erro ao buscar movimentações: " . $conn->error); sendJsonResponse(['error' => 'Erro ao buscar movimentações: ' . $conn->error], 500); }
    $conn->close();
}

function handleAddMovimentacao($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $peso_kg = (float)($data['pesoKg'] ?? 0);
    if (!is_numeric($peso_kg)) sendJsonResponse(['error' => 'Peso (KG) deve ser um número válido'], 400);
    $stmt_insert = $conn->prepare( "INSERT INTO Movimentacoes (TipoMovimentacao, NaturezaOperacao, Descricao, Lote, PesoKG, OrigemDestino, Observacao, Usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)" );
    $stmt_insert->bind_param( "ssssdsss", $data['tipoMovimentacao'], $data['naturezaOperacao'], $data['descricao'], $data['lote'], $peso_kg, $data['origemDestino'], $data['observacao'], $data['usuario'] );
    if ($stmt_insert->execute()) sendJsonResponse(['message' => 'Movimentação registrada com sucesso'], 201);
    else { error_log("Erro ao adicionar movimentação: " . $stmt_insert->error); sendJsonResponse(['error' => 'Erro ao adicionar movimentação: ' . $stmt_insert->error], 500); }
    $stmt_insert->close(); $conn->close();
}

function handleDeleteMovimentacao($movimentacao_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $stmt = $conn->prepare("DELETE FROM Movimentacoes WHERE ID = ?");
    $stmt->bind_param("i", $movimentacao_id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows === 0) sendJsonResponse(['error' => 'Movimentação não encontrada'], 404);
        else sendJsonResponse(['message' => 'Movimentação excluída com sucesso'], 200);
    } else { error_log("Erro ao excluir movimentação: " . $stmt->error); sendJsonResponse(['error' => 'Erro ao excluir movimentação: ' . $stmt->error], 500); }
    $stmt->close(); $conn->close();
}

// === NOVAS FUNÇÕES PARA PRODUTOS E ORÇAMENTOS ===

function handleGetProdutos() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $query = "SELECT ID, NomeItem, UnidadeMedida, PrecoSerralheria, PrecoConsumidor FROM Produtos ORDER BY NomeItem ASC";
    $result = $conn->query($query);
    if ($result) {
        $produtos = [];
        while ($row = $result->fetch_assoc()) { $produtos[] = $row; }
        sendJsonResponse($produtos, 200);
    } else { error_log("Erro ao buscar produtos: " . $conn->error); sendJsonResponse(['error' => 'Erro ao buscar produtos: ' . $conn->error], 500); }
    $conn->close();
}

function handleGetOrcamentos() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $usuario_id = isset($_GET['usuarioID']) ? (int)$_GET['usuarioID'] : null;
    $params = [];
    $types = "";
    
    // ADICIONADO: o.TipoPagamento, o.FormaPagamento
    $query = "SELECT o.ID, o.NumeroOrcamento, o.DataOrcamento, o.DataValidade, o.ClienteNome, 
                     o.TipoOrcamento, o.Status, o.ValorTotal, o.TipoPagamento, o.FormaPagamento, 
                     u.NomeCompleto AS VendedorNome
              FROM Orcamentos o
              JOIN Usuarios u ON o.UsuarioID = u.ID";
    
    if ($usuario_id !== null) {
        $query .= " WHERE o.UsuarioID = ?";
        $params[] = $usuario_id;
        $types = "i";
    }
    
    $query .= " ORDER BY o.ID DESC";
    
    $stmt = $conn->prepare($query);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $orcamentos = [];
    while ($row = $result->fetch_assoc()) { 
        $orcamentos[] = $row; 
    }
    $stmt->close(); 
    $conn->close();
    sendJsonResponse($orcamentos, 200);
}

function handleGetOrcamentoById($orcamento_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $orcamento = null; $itens = [];
    $stmt_orc = $conn->prepare("SELECT * FROM Orcamentos WHERE ID = ?");
    $stmt_orc->bind_param("i", $orcamento_id); $stmt_orc->execute();
    $result_orc = $stmt_orc->get_result(); $orcamento = $result_orc->fetch_assoc(); $stmt_orc->close();
    if (!$orcamento) { $conn->close(); sendJsonResponse(['error' => 'Orçamento não encontrado'], 404); }
    $stmt_itens = $conn->prepare("SELECT * FROM ItensOrcamento WHERE OrcamentoID = ?");
    $stmt_itens->bind_param("i", $orcamento_id); $stmt_itens->execute();
    $result_itens = $stmt_itens->get_result();
    while ($item = $result_itens->fetch_assoc()) { $itens[] = $item; }
    $stmt_itens->close();
    $orcamento['itens'] = $itens;
    $conn->close(); sendJsonResponse($orcamento, 200);
}

function handleAddOrcamento($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    $conn->begin_transaction();
    try {
        if (empty($data['usuarioID']) || empty($data['itens'])) {
            throw new Exception("Dados incompletos. ID do usuário e Itens são obrigatórios.");
        }
        
        // Lógica do Número Sequencial
        $prefix = date('m') . date('y') . '-'; 
        $like_prefix = $prefix . '%';
        $stmt_max = $conn->prepare("SELECT NumeroOrcamento FROM Orcamentos WHERE NumeroOrcamento LIKE ? ORDER BY CAST(SUBSTRING(NumeroOrcamento, 7) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE");
        $stmt_max->bind_param("s", $like_prefix); 
        $stmt_max->execute(); 
        $result = $stmt_max->get_result(); 
        $last_orcamento = $result->fetch_assoc(); 
        $stmt_max->close();
        
        $next_number = 1; 
        if ($last_orcamento) { 
            $last_seq_str = substr($last_orcamento['NumeroOrcamento'], -4); 
            $next_number = (int)$last_seq_str + 1; 
        }
        $numero_orcamento_final = $prefix . str_pad($next_number, 4, '0', STR_PAD_LEFT);

        $stmt_orc = $conn->prepare(
            "INSERT INTO Orcamentos (UsuarioID, TipoOrcamento, Status, NumeroOrcamento, DataOrcamento, DataValidade, 
             ClienteNome, ClienteDocumento, ClienteEndereco, ClienteCidadeUF, ClienteContato, ClienteEmail, 
             TemFrete, ValorFrete, DescontoGeralPercent, Subtotal, ValorTotal, Observacoes, TipoPagamento, FormaPagamento)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        $status_pendente = 'pendente';
        $temFreteInt = $data['temFrete'] ? 1 : 0;
        $tipoPgto = $data['tipoPagamento'] ?? 'À Vista';
        $formaPgto = $data['formaPagamento'] ?? 'Pix';
        
        // CORREÇÃO: String agora tem 20 caracteres (isssssssssssiddddsss)
        // Antes faltava um 's' no final
        $stmt_orc->bind_param(
            "isssssssssssiddddsss", 
            $data['usuarioID'], $data['tipo'], $status_pendente, $numero_orcamento_final,
            $data['dataOrcamento'], $data['dataValidade'],
            $data['clienteNome'], $data['clienteDocumento'], $data['clienteEndereco'], $data['clienteCidadeUF'],
            $data['clienteContato'], $data['clienteEmail'], $temFreteInt, $data['valorFrete'],
            $data['descontoGeralPercent'], $data['subtotal'], $data['valorTotal'], $data['observacoes'],
            $tipoPgto, $formaPgto
        );
        $stmt_orc->execute();
        $orcamento_id = $conn->insert_id;
        $stmt_orc->close();

        $stmt_item = $conn->prepare("INSERT INTO ItensOrcamento (OrcamentoID, ProdutoID, Item, Comprimento, Altura, Quantidade, UnidadeMedida, ValorUnitario, DescontoPercent, ValorTotalItem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($data['itens'] as $item) {
            $stmt_item->bind_param("iisdddsddd", $orcamento_id, $item['produtoId'], $item['item'], $item['comprimento'], $item['altura'], $item['quantidade'], $item['unidadeMedida'], $item['valorUnitario'], $item['descontoPercent'], $item['total']);
            $stmt_item->execute();
        }
        $stmt_item->close();
        
        $conn->commit();
        sendJsonResponse(['message' => 'Orçamento salvo com sucesso', 'id' => $orcamento_id], 201);
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Erro ao salvar orçamento: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro ao salvar orçamento: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

function handleUpdateOrcamento($orcamento_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    // --- BLOCO 1: ATUALIZAÇÃO DE STATUS (Botões Aprovar/Rejeitar) ---
    if (isset($data['status']) && count($data) == 1) {
        $novoStatus = $data['status'];
        
        $conn->begin_transaction();
        try {
            // 1. Atualiza o status do orçamento
            $stmt_status = $conn->prepare("UPDATE Orcamentos SET Status = ? WHERE ID = ?");
            $stmt_status->bind_param("si", $novoStatus, $orcamento_id);
            $stmt_status->execute();
            $stmt_status->close();

            // 2. LÓGICA DE CRIAR O PEDIDO (APENAS SE FOR 'aprovado')
            if ($novoStatus === 'aprovado') {
                
                // 2a. Pega os dados do orçamento (INCLUINDO OS NOVOS CAMPOS DE PAGAMENTO)
                $stmt_orc = $conn->prepare("SELECT o.*, u.NomeCompleto AS VendedorNome FROM Orcamentos o JOIN Usuarios u ON o.UsuarioID = u.ID WHERE o.ID = ?");
                $stmt_orc->bind_param("i", $orcamento_id);
                $stmt_orc->execute();
                $orcamento = $stmt_orc->get_result()->fetch_assoc();
                $stmt_orc->close();

                if (!$orcamento) {
                    throw new Exception("Orçamento não encontrado para criar pedido.");
                }

                // 2b. Pega os itens do orçamento
                $stmt_itens_orc = $conn->prepare("SELECT * FROM ItensOrcamento WHERE OrcamentoID = ?");
                $stmt_itens_orc->bind_param("i", $orcamento_id);
                $stmt_itens_orc->execute();
                $itens_orcamento = $stmt_itens_orc->get_result();

                // --- LÓGICA DO NÚMERO SEQUENCIAL DO PEDIDO ---
                $prefix_ped = date('m') . date('y') . '-';
                $like_prefix_ped = $prefix_ped . '%';
                $stmt_max_ped = $conn->prepare("SELECT NumeroPedido FROM Pedidos WHERE NumeroPedido LIKE ? ORDER BY CAST(SUBSTRING(NumeroPedido, 7) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE");
                $stmt_max_ped->bind_param("s", $like_prefix_ped);
                $stmt_max_ped->execute();
                $last_pedido = $stmt_max_ped->get_result()->fetch_assoc();
                $stmt_max_ped->close();
                
                $next_number_ped = 1;
                if ($last_pedido) {
                    $last_seq_str_ped = substr($last_pedido['NumeroPedido'], -4);
                    $next_number_ped = (int)$last_seq_str_ped + 1;
                }
                $numero_pedido_final = $prefix_ped . str_pad($next_number_ped, 4, '0', STR_PAD_LEFT);
                
                // 2c. Cria o novo Pedido (LEVANDO TIPO E FORMA DE PAGAMENTO)
                $data_pedido = date('Y-m-d');
                $stmt_ped = $conn->prepare(
                    "INSERT INTO Pedidos (
                        OrcamentoID, NumeroPedido, ClienteNome, ClienteContato, ClienteEmail, DataPedido, ValorTotal, StatusPedido, VendedorNome,
                        ClienteDocumento, ClienteEndereco, ClienteCidadeUF, Observacoes, TemFrete, ValorFrete, DescontoGeralPercent, Subtotal,
                        TipoPagamento, FormaPagamento
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Aguardando Produção', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)" 
                );
                
                $temFreteInt = $orcamento['TemFrete'] ? 1 : 0;
                
                // Bind com 19 parâmetros: "isssssdsssssidddss"
                $stmt_ped->bind_param(
                    "sssssssssiddddsssi", 
                    $orcamento['ID'], 
                    $numero_pedido_final, 
                    $orcamento['ClienteNome'], 
                    $orcamento['ClienteContato'], 
                    $orcamento['ClienteEmail'], 
                    $data_pedido, 
                    $orcamento['ValorTotal'], 
                    $orcamento['VendedorNome'], 
                    $orcamento['ClienteDocumento'], 
                    $orcamento['ClienteEndereco'], 
                    $orcamento['ClienteCidadeUF'], 
                    $orcamento['Observacoes'], 
                    $temFreteInt, 
                    $orcamento['ValorFrete'], 
                    $orcamento['DescontoGeralPercent'], 
                    $orcamento['Subtotal'],
                    $orcamento['TipoPagamento'],  // <--- Novo
                    $orcamento['FormaPagamento']  // <--- Novo
                );
                $stmt_ped->execute();
                $pedido_id = $conn->insert_id;
                $stmt_ped->close();

                // 2d. Cria a Conta a Receber (LEVANDO TIPO E FORMA DE PAGAMENTO)
                $data_emissao = $data_pedido;
                $data_vencimento = date('Y-m-d', strtotime($data_emissao . ' + 30 days')); 
                $stmt_ar = $conn->prepare(
                    "INSERT INTO ContasReceber (PedidoID, ClienteNome, NumeroPedido, Valor, DataEmissao, DataVencimento, Status, TipoPagamento, FormaPagamento)
                     VALUES (?, ?, ?, ?, ?, ?, 'Aguardando', ?, ?)"
                );
                $stmt_ar->bind_param(
                    "issdssss",
                    $pedido_id, 
                    $orcamento['ClienteNome'], 
                    $numero_pedido_final,
                    $orcamento['ValorTotal'], 
                    $data_emissao, 
                    $data_vencimento,
                    $orcamento['TipoPagamento'], // <--- Novo
                    $orcamento['FormaPagamento'] // <--- Novo
                );
                $stmt_ar->execute();
                $stmt_ar->close();

                // 2e. Copia os itens do orçamento para o pedido
                $stmt_item_ped = $conn->prepare(
                    "INSERT INTO ItensPedido (PedidoID, ProdutoID, ItemNome, Comprimento, Altura, Quantidade, UnidadeMedida, ValorUnitario, ValorTotalItem)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );
                while ($item = $itens_orcamento->fetch_assoc()) {
                    $stmt_item_ped->bind_param("iisdddsdd", $pedido_id, $item['ProdutoID'], $item['Item'], $item['Comprimento'], $item['Altura'], $item['Quantidade'], $item['UnidadeMedida'], $item['ValorUnitario'], $item['ValorTotalItem']);
                    $stmt_item_ped->execute();
                }
                $stmt_item_ped->close();
                $stmt_itens_orc->close();
            }
            
            $conn->commit();
            sendJsonResponse(['message' => 'Status do orçamento atualizado'], 200);

        } catch (Exception $e) {
            $conn->rollback();
            error_log("Erro ao atualizar status e criar pedido: " . $e->getMessage());
            sendJsonResponse(['error' => 'Erro ao atualizar status: ' . $e->getMessage()], 500);
        } finally {
            $conn->close();
        }
        return;
    }

    // --- BLOCO 2: ATUALIZAÇÃO COMPLETA (EDICAO DO ORÇAMENTO) ---
    $conn->begin_transaction();
    try {
        if (empty($data['usuarioID']) || empty($data['itens'])) {
            throw new Exception("Dados incompletos. ID do usuário e Itens são obrigatórios.");
        }

        // Verifica se existe pedido vinculado (Bloqueia edição se já virou pedido)
        $stmt_find_pedido = $conn->prepare("SELECT ID FROM Pedidos WHERE OrcamentoID = ?");
        $stmt_find_pedido->bind_param("i", $orcamento_id);
        $stmt_find_pedido->execute();
        $pedido_vinculado = $stmt_find_pedido->get_result()->fetch_assoc();
        $stmt_find_pedido->close();

        if ($pedido_vinculado) {
            throw new Exception("Este orçamento já foi aprovado e está bloqueado. Você só pode editar o Pedido correspondente na aba 'Pedidos'.");
        }
        
        // Atualiza tabela principal (INCLUINDO NOVOS CAMPOS)
        $stmt_orc = $conn->prepare(
            "UPDATE Orcamentos SET 
             TipoOrcamento = ?, DataOrcamento = ?, DataValidade = ?, 
             ClienteNome = ?, ClienteDocumento = ?, ClienteEndereco = ?, ClienteCidadeUF = ?, 
             ClienteContato = ?, ClienteEmail = ?, TemFrete = ?, ValorFrete = ?, 
             DescontoGeralPercent = ?, Subtotal = ?, ValorTotal = ?, Observacoes = ?,
             TipoPagamento = ?, FormaPagamento = ?
             WHERE ID = ?"
        );
        
        $temFreteInt = $data['temFrete'] ? 1 : 0;
        $tipoPgto = $data['tipoPagamento'] ?? 'À Vista';
        $formaPgto = $data['formaPagamento'] ?? 'Pix';
        
        // Bind com 18 parâmetros: "sssssssssiddddssi"
        $stmt_orc->bind_param(
            "sssssssssiddddsssi",
            $data['tipo'], 
            $data['dataOrcamento'], 
            $data['dataValidade'],
            $data['clienteNome'], 
            $data['clienteDocumento'], 
            $data['clienteEndereco'], 
            $data['clienteCidadeUF'],
            $data['clienteContato'], 
            $data['clienteEmail'], 
            $temFreteInt, 
            $data['valorFrete'],
            $data['descontoGeralPercent'], 
            $data['subtotal'], 
            $data['valorTotal'], 
            $data['observacoes'],
            $tipoPgto,   // <--- Novo
            $formaPgto,  // <--- Novo
            $orcamento_id
        );
        $stmt_orc->execute();
        $stmt_orc->close();

        // Remove itens antigos
        $stmt_delete_itens = $conn->prepare("DELETE FROM ItensOrcamento WHERE OrcamentoID = ?");
        $stmt_delete_itens->bind_param("i", $orcamento_id);
        $stmt_delete_itens->execute();
        $stmt_delete_itens->close();

        // Re-insere itens
        $stmt_item = $conn->prepare(
            "INSERT INTO ItensOrcamento (OrcamentoID, ProdutoID, Item, Comprimento, Altura, 
             Quantidade, UnidadeMedida, ValorUnitario, DescontoPercent, ValorTotalItem)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        foreach ($data['itens'] as $item) {
            $stmt_item->bind_param(
                "iisdddsddd",
                $orcamento_id, 
                $item['produtoId'], 
                $item['item'], 
                $item['comprimento'], 
                $item['altura'],
                $item['quantidade'], 
                $item['unidadeMedida'], 
                $item['valorUnitario'], 
                $item['descontoPercent'], 
                $item['total']
            );
            $stmt_item->execute();
        }
        $stmt_item->close();
        
        $conn->commit();
        sendJsonResponse(['message' => 'Orçamento atualizado com sucesso'], 200);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Erro ao ATUALIZAR orçamento: " . $e->getMessage());
        sendJsonResponse(['error' => $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

function handleDeleteOrcamento($orcamento_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $stmt = $conn->prepare("DELETE FROM Orcamentos WHERE ID = ?");
    $stmt->bind_param("i", $orcamento_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) sendJsonResponse(['message' => 'Orçamento excluído com sucesso'], 200);
        else sendJsonResponse(['error' => 'Orçamento não encontrado'], 404);
    } else {
        error_log("Erro ao excluir orçamento: " . $stmt->error);
        sendJsonResponse(['error' => 'Erro ao excluir orçamento'], 500);
    }
    $stmt->close();
    $conn->close();
}

function handleGetPedidos() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $usuario_role = isset($_GET['role']) ? $_GET['role'] : null;
    $vendedor_nome = isset($_GET['nomeVendedor']) ? $_GET['nomeVendedor'] : '';

    $params = [];
    $types = "";
    
    $query = "SELECT ID, NumeroPedido, ClienteNome, DataPedido, ValorTotal, StatusPedido, VendedorNome, TipoPagamento, FormaPagamento FROM Pedidos";
    
    if ($usuario_role !== 'admin') {
        $query .= " WHERE VendedorNome = ?";
        $params[] = $vendedor_nome;
        $types = "s";
    }

    $query .= " ORDER BY ID DESC";
    
    $stmt = $conn->prepare($query);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $pedidos = [];
    while ($row = $result->fetch_assoc()) { 
        // === ADIÇÃO: Busca os itens para cada pedido (para os relatórios) ===
        $pedidoID = $row['ID'];
        $stmt_itens = $conn->prepare("SELECT ItemNome, Quantidade, ValorTotalItem FROM ItensPedido WHERE PedidoID = ?");
        $stmt_itens->bind_param("i", $pedidoID);
        $stmt_itens->execute();
        $res_itens = $stmt_itens->get_result();
        $itens = [];
        while ($item = $res_itens->fetch_assoc()) {
            $itens[] = $item;
        }
        $stmt_itens->close();
        
        $row['itens'] = $itens; // Anexa os itens ao pedido
        // ===================================================================
        
        $pedidos[] = $row; 
    }
    $stmt->close(); 
    $conn->close();
    sendJsonResponse($pedidos, 200);
}

function handleGetPedidoById($pedido_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    $pedido = null; $itens = [];
    $stmt_ped = $conn->prepare("SELECT * FROM Pedidos WHERE ID = ?");
    $stmt_ped->bind_param("i", $pedido_id); $stmt_ped->execute();
    $result_ped = $stmt_ped->get_result(); $pedido = $result_ped->fetch_assoc(); $stmt_ped->close();
    if (!$pedido) { $conn->close(); sendJsonResponse(['error' => 'Pedido não encontrado'], 404); }
    $stmt_itens = $conn->prepare("SELECT * FROM ItensPedido WHERE PedidoID = ?");
    $stmt_itens->bind_param("i", $pedido_id); $stmt_itens->execute();
    $result_itens = $stmt_itens->get_result();
    while ($item = $result_itens->fetch_assoc()) { $itens[] = $item; }
    $stmt_itens->close();
    $pedido['itens'] = $itens;
    $conn->close(); sendJsonResponse($pedido, 200);
}

/**
 * Atualiza um Pedido.
 * Pode ser uma atualização de status (mudar para "Em Produção")
 * OU uma atualização completa (edição de itens, valores, cliente).
 */
function handleUpdatePedidoStatus($pedido_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    // === CENÁRIO 1: ATUALIZAÇÃO APENAS DE STATUS ===
    // Se tem 'status' E NÃO TEM 'itens', é apenas uma troca de status ou cancelamento
    if (isset($data['status']) && !isset($data['itens'])) {
        $status = $data['status'];
        $motivo = isset($data['motivo']) ? $data['motivo'] : null;

        if ($motivo) {
            $stmt = $conn->prepare("UPDATE Pedidos SET StatusPedido = ?, MotivoCancelamento = ? WHERE ID = ?");
            $stmt->bind_param("ssi", $status, $motivo, $pedido_id);
        } else {
            $stmt = $conn->prepare("UPDATE Pedidos SET StatusPedido = ? WHERE ID = ?");
            $stmt->bind_param("si", $status, $pedido_id);
        }

        if ($stmt->execute()) {
            $stmt->close();
            $conn->close();
            sendJsonResponse(['message' => 'Status do pedido atualizado'], 200);
            return; // Encerra aqui
        } else {
            $stmt->close();
            $conn->close();
            sendJsonResponse(['error' => 'Erro ao atualizar status do pedido'], 500);
            return;
        }
    }

    // === CENÁRIO 2: ATUALIZAÇÃO COMPLETA (EDIÇÃO DE DADOS) ===
    // Se chegamos aqui, verificamos se temos os itens para edição
    if (!isset($data['itens']) || empty($data['itens'])) {
        $conn->close();
        sendJsonResponse(['error' => 'Dados inválidos. Para editar, envie os itens. Para mudar status, envie o campo status.'], 400);
        return;
    }

    $conn->begin_transaction();
    try {
        // 1. Pega o status atual do pedido
        $stmt_status = $conn->prepare("SELECT StatusPedido FROM Pedidos WHERE ID = ?");
        $stmt_status->bind_param("i", $pedido_id);
        $stmt_status->execute();
        $res_status = $stmt_status->get_result();
        $pedido_atual = $res_status->fetch_assoc();
        $stmt_status->close();
        
        if (!$pedido_atual) {
            throw new Exception("Pedido não encontrado.");
        }

        // 2. Define o novo status (Regra de "Pedido Alterado") se necessário
        $statusAtualPedido = $pedido_atual['StatusPedido'];
        $novoStatusPedido = $statusAtualPedido;
        
        if ($statusAtualPedido === 'Aguardando Produção') {
            $novoStatusPedido = 'Aguardando Produção - Pedido Alterado';
        } else if ($statusAtualPedido === 'Em Produção' || $statusAtualPedido === 'Concluído') {
            $novoStatusPedido = 'Pedido Alterado';
        }
        
        // 3. Atualiza o Pedido principal
        $stmt_ped = $conn->prepare(
            "UPDATE Pedidos SET 
             ClienteNome = ?, ClienteContato = ?, ClienteEmail = ?, ValorTotal = ?, StatusPedido = ?,
             ClienteDocumento = ?, ClienteEndereco = ?, ClienteCidadeUF = ?, Observacoes = ?,
             TemFrete = ?, ValorFrete = ?, DescontoGeralPercent = ?, Subtotal = ?
             WHERE ID = ?"
        );
        
        $clienteNome = $data['clienteNome'];
        $clienteCont = $data['clienteContato'];
        $clienteEmail = $data['clienteEmail'];
        $valorTotal = $data['valorTotal'];
        $clienteDoc = $data['clienteDocumento'];
        $clienteEnd = $data['clienteEndereco'];
        $clienteCid = $data['clienteCidadeUF'];
        $obs = $data['observacoes'];
        $temFreteInt = $data['temFrete'] ? 1 : 0;
        $valorFrete = $data['valorFrete'];
        $descontoGeral = $data['descontoGeralPercent'];
        $subtotal = $data['subtotal'];
        
        $stmt_ped->bind_param(
            "sssdsssssidddi", 
            $clienteNome, $clienteCont, $clienteEmail, $valorTotal, $novoStatusPedido, 
            $clienteDoc, $clienteEnd, $clienteCid, $obs, 
            $temFreteInt, $valorFrete, $descontoGeral, $subtotal, 
            $pedido_id
        );
        $stmt_ped->execute();
        $stmt_ped->close();
        
        // 4. Apaga Itens antigos do Pedido
        $stmt_del_ped_itens = $conn->prepare("DELETE FROM ItensPedido WHERE PedidoID = ?");
        $stmt_del_ped_itens->bind_param("i", $pedido_id);
        $stmt_del_ped_itens->execute();
        $stmt_del_ped_itens->close();
        
        // 5. Prepara para reinserir itens no Pedido
        $stmt_item_ped = $conn->prepare(
            "INSERT INTO ItensPedido (PedidoID, ProdutoID, ItemNome, Comprimento, Altura, 
             Quantidade, UnidadeMedida, ValorUnitario, ValorTotalItem)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        // 6. Loop para inserir itens
        foreach ($data['itens'] as $item) {
            $stmt_item_ped->bind_param(
                "iisdddsdd",
                $pedido_id,
                $item['produtoId'],
                $item['item'],
                $item['comprimento'],
                $item['altura'],
                $item['quantidade'],
                $item['unidadeMedida'],
                $item['valorUnitario'],
                $item['total']
            );
            $stmt_item_ped->execute();
        }
        $stmt_item_ped->close();
        
        // 7. Atualiza o Contas a Receber APENAS se estiver Pendente/Aguardando
        // Não mexe se já estiver Pago ou Vencido para evitar inconsistência financeira
        $stmt_ar = $conn->prepare(
            "UPDATE ContasReceber SET Valor = ?, ClienteNome = ? 
             WHERE PedidoID = ? AND (Status = 'Aguardando' OR Status = 'Pendente')"
        );
        $stmt_ar->bind_param("dsi", $valorTotal, $clienteNome, $pedido_id);
        $stmt_ar->execute();
        $stmt_ar->close();
        
        $conn->commit();
        sendJsonResponse(['message' => 'Pedido atualizado com sucesso'], 200);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Erro ao ATUALIZAR pedido completo: " . $e->getMessage());
        sendJsonResponse(['error' => $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

// === NOVAS FUNÇÕES PARA CLIENTES ===

function handleGetClientes() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $usuario_id = isset($_GET['usuarioID']) ? (int)$_GET['usuarioID'] : null;
    $role = isset($_GET['role']) ? $_GET['role'] : 'user';
    $params = [];
    $types = "";
    
    // ADICIONADO: TipoCliente e VendedorResponsavel
    $query = "SELECT ID, Nome, Documento, Endereco, CidadeUF, Contato, Email, TipoCliente, VendedorResponsavel FROM Clientes";
    
    // === CORREÇÃO: Lógica descomentada para ativar o filtro ===
    if ($role !== 'admin' && $usuario_id !== null) {
        $query .= " WHERE UsuarioID = ?"; 
        $params[] = $usuario_id;
        $types = "i";
    }
    
    $query .= " ORDER BY Nome ASC";
    
    $stmt = $conn->prepare($query);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $clientes = [];
    while ($row = $result->fetch_assoc()) { 
        $clientes[] = $row; 
    }
    $stmt->close(); 
    $conn->close();
    sendJsonResponse($clientes, 200);
}

function handleAddCliente($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    if (empty($data['UsuarioID']) || empty($data['Nome'])) {
        sendJsonResponse(['error' => 'Nome do cliente e ID do usuário são obrigatórios.'], 400);
    }

    try {
        // ADICIONADO: EnderecosAdicionais
        $stmt = $conn->prepare(
            "INSERT INTO Clientes (UsuarioID, Nome, Documento, Endereco, CidadeUF, Contato, Email, TipoCliente, VendedorResponsavel, EnderecosAdicionais)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        $tipo = $data['TipoCliente'] ?? 'Consumidor Final';
        $vendedor = $data['VendedorResponsavel'] ?? '';
        
        // Converte o array de endereços extras para JSON string
        $enderecosExtras = isset($data['EnderecosAdicionais']) ? json_encode($data['EnderecosAdicionais'], JSON_UNESCAPED_UNICODE) : '[]';

        $stmt->bind_param(
            "isssssssss", // 10 tipos
            $data['UsuarioID'],
            $data['Nome'],
            $data['Documento'],
            $data['Endereco'],
            $data['CidadeUF'],
            $data['Contato'],
            $data['Email'],
            $tipo,
            $vendedor,
            $enderecosExtras
        );
        
        $stmt->execute();
        $cliente_id = $conn->insert_id;
        $stmt->close();
        
        sendJsonResponse(['message' => 'Cliente cadastrado com sucesso', 'ID' => $cliente_id], 201);

    } catch (Exception $e) {
        error_log("Erro ao salvar cliente: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro ao salvar cliente: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

// IMPORTANTE: Atualize também o handleGetClienteById para retornar esse campo
function handleGetClienteById($cliente_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    // ADICIONADO: EnderecosAdicionais
    $stmt = $conn->prepare("SELECT ID, Nome, Documento, Endereco, CidadeUF, Contato, Email, TipoCliente, VendedorResponsavel, EnderecosAdicionais FROM Clientes WHERE ID = ?");
    $stmt->bind_param("i", $cliente_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $cliente = $result->fetch_assoc();
    
    // Decodifica o JSON para array antes de enviar
    if ($cliente && $cliente['EnderecosAdicionais']) {
        $cliente['EnderecosAdicionais'] = json_decode($cliente['EnderecosAdicionais'], true);
    } else if ($cliente) {
        $cliente['EnderecosAdicionais'] = [];
    }

    $stmt->close(); 
    $conn->close();

    if ($cliente) {
        sendJsonResponse($cliente, 200);
    } else {
        sendJsonResponse(['error' => 'Cliente não encontrado'], 404);
    }
}

function handleUpdateCliente($cliente_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    try {
        // ADICIONADO: EnderecosAdicionais
        $stmt = $conn->prepare(
            "UPDATE Clientes SET Nome = ?, Documento = ?, Endereco = ?, CidadeUF = ?, Contato = ?, Email = ?, TipoCliente = ?, VendedorResponsavel = ?, EnderecosAdicionais = ?
             WHERE ID = ?"
        );
        
        $tipo = $data['TipoCliente'] ?? 'Consumidor Final';
        $vendedor = $data['VendedorResponsavel'] ?? '';
        
        // Converte o array de endereços extras para JSON string
        $enderecosExtras = isset($data['EnderecosAdicionais']) ? json_encode($data['EnderecosAdicionais'], JSON_UNESCAPED_UNICODE) : '[]';

        $stmt->bind_param(
            "sssssssssi", // 10 tipos
            $data['Nome'],
            $data['Documento'],
            $data['Endereco'],
            $data['CidadeUF'],
            $data['Contato'],
            $data['Email'],
            $tipo,
            $vendedor,
            $enderecosExtras,
            $cliente_id
        );
        
        $stmt->execute();
        sendJsonResponse(['message' => 'Cliente atualizado com sucesso'], 200);
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("Erro ao atualizar cliente: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro ao atualizar cliente: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Exclui um cliente.
 */
function handleDeleteCliente($cliente_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    try {
        $stmt = $conn->prepare("DELETE FROM Clientes WHERE ID = ?");
        $stmt->bind_param("i", $cliente_id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            // Verifica se o cliente existe antes de dar erro 404
            $check = $conn->query("SELECT ID FROM Clientes WHERE ID = $cliente_id");
            if ($check->num_rows === 0) {
                sendJsonResponse(['error' => 'Cliente não encontrado'], 404);
            } else {
                 // Se existe e não excluiu, foi outro erro não capturado
                 sendJsonResponse(['error' => 'Erro desconhecido ao excluir cliente.'], 500);
            }
        } else {
            sendJsonResponse(['message' => 'Cliente excluído com sucesso'], 200);
        }
        $stmt->close();
        
    } catch (mysqli_sql_exception $e) {
        // Código 1451: Cannot delete or update a parent row: a foreign key constraint fails
        if ($e->getCode() == 1451) {
             sendJsonResponse(['error' => 'Não é possível excluir este cliente pois ele possui Orçamentos, Pedidos ou Manutenções vinculados. Exclua os registros vinculados primeiro.'], 409);
        } else {
            error_log("Erro de SQL ao excluir cliente: " . $e->getMessage()); 
            sendJsonResponse(['error' => 'Erro de banco de dados: ' . $e->getMessage()], 500);
        }
    } catch (Exception $e) {
        error_log("Erro genérico ao excluir cliente: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro interno ao excluir cliente: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Busca todas as manutenções
 * CORRIGIDO: Adicionado o campo m.DataSolicitacao ao SELECT
 */
function handleGetManutencoes() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $query = "
        SELECT 
            m.ID, m.CodigoManutencao, m.ClienteID, m.ProblemaDefeito, m.DataCompra, m.DataGarantia,
            m.ResponsavelID, m.ServicoRealizado, m.DataManutencao, m.Status, m.Valor, m.Observacoes,
            m.DataSolicitacao,  -- <--- CAMPO ADICIONADO AQUI
            c.Nome AS NomeCliente, 
            u.NomeCompleto AS NomeResponsavel
        FROM Manutencoes m
        LEFT JOIN Clientes c ON m.ClienteID = c.ID
        LEFT JOIN Usuarios u ON m.ResponsavelID = u.ID
        ORDER BY m.DataSolicitacao DESC
    ";
    
    $result = $conn->query($query);
    $manutencoes = [];
    while ($row = $result->fetch_assoc()) {
        $manutencoes[] = $row;
    }
    $conn->close();
    sendJsonResponse($manutencoes, 200);
}

/**
 * Adiciona uma nova manutenção
 */
function handleAddManutencao($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    $conn->begin_transaction();
    try {
        if (empty($data['ClienteID']) || empty($data['ProblemaDefeito'])) {
            throw new Exception("Cliente e Problema são obrigatórios.");
        }

        // --- LÓGICA DO CÓDIGO SEQUENCIAL ---
        $prefix = 'MNT-' . date('m') . date('y') . '-';
        $like_prefix = $prefix . '%';

        $stmt_max = $conn->prepare("SELECT CodigoManutencao FROM Manutencoes WHERE CodigoManutencao LIKE ? ORDER BY CAST(SUBSTRING(CodigoManutencao, 11) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE");
        $stmt_max->bind_param("s", $like_prefix);
        $stmt_max->execute();
        $last_mnt = $stmt_max->get_result()->fetch_assoc();
        $stmt_max->close();
        
        $next_number = 1;
        if ($last_mnt) {
            $last_seq_str = substr($last_mnt['CodigoManutencao'], -4);
            $next_number = (int)$last_seq_str + 1;
        }
        $codigo_manutencao_final = $prefix . str_pad($next_number, 4, '0', STR_PAD_LEFT);
        // --- FIM DA LÓGICA ---

        $stmt = $conn->prepare(
            "INSERT INTO Manutencoes (
                CodigoManutencao, ClienteID, ProblemaDefeito, DataCompra, DataGarantia, 
                ResponsavelID, ServicoRealizado, DataManutencao, Status, Valor, Observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        // Variáveis locais
        $dataCompra = empty($data['DataCompra']) ? null : $data['DataCompra'];
        $dataGarantia = empty($data['DataGarantia']) ? null : $data['DataGarantia'];
        $responsavelID = empty($data['ResponsavelID']) ? null : (int)$data['ResponsavelID'];
        $servicoRealizado = $data['ServicoRealizado'] ?? '';
        $dataManutencao = empty($data['DataManutencao']) ? null : $data['DataManutencao'];
        $status = $data['Status'] ?? 'Pendente';
        $valor = isset($data['Valor']) ? (float)$data['Valor'] : 0.00; // NOVO CAMPO
        $observacoes = $data['Observacoes'] ?? '';

        // Bind com 11 tipos: "sisssisssds" (d para double/decimal)
        $stmt->bind_param(
            "sisssisssds",
            $codigo_manutencao_final,
            $data['ClienteID'],
            $data['ProblemaDefeito'],
            $dataCompra,
            $dataGarantia,
            $responsavelID,
            $servicoRealizado,
            $dataManutencao,
            $status,
            $valor, // NOVO
            $observacoes
        );
        
        $stmt->execute();
        $conn->commit();
        sendJsonResponse(['message' => 'Solicitação de manutenção salva com sucesso!'], 201);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Erro ao salvar manutenção: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro ao salvar manutenção: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Atualiza uma manutenção
 */
function handleUpdateManutencao($manutencao_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    // Preparando os campos para atualização
    $responsavelID = empty($data['ResponsavelID']) ? null : (int)$data['ResponsavelID'];
    $servicoRealizado = $data['ServicoRealizado'] ?? '';
    $dataManutencao = empty($data['DataManutencao']) ? null : $data['DataManutencao'];
    $status = $data['Status'] ?? 'Pendente';
    $valor = isset($data['Valor']) ? (float)$data['Valor'] : 0.00; // NOVO CAMPO
    $observacoes = $data['Observacoes'] ?? '';
    $problemaDefeito = $data['ProblemaDefeito'] ?? '';
    $dataCompra = empty($data['DataCompra']) ? null : $data['DataCompra'];
    $dataGarantia = empty($data['DataGarantia']) ? null : $data['DataGarantia'];
    $clienteID = (int)$data['ClienteID'];

    try {
        $stmt = $conn->prepare(
            "UPDATE Manutencoes SET 
             ClienteID = ?, ProblemaDefeito = ?, DataCompra = ?, DataGarantia = ?, 
             ResponsavelID = ?, ServicoRealizado = ?, DataManutencao = ?, Status = ?, Valor = ?, Observacoes = ?
             WHERE ID = ?"
        );
        
        // Bind com 11 tipos: "isssisssdsi"
        $stmt->bind_param(
            "isssisssdsi",
            $clienteID,
            $problemaDefeito,
            $dataCompra,
            $dataGarantia,
            $responsavelID,
            $servicoRealizado,
            $dataManutencao,
            $status,
            $valor, // NOVO
            $observacoes,
            $manutencao_id
        );

        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendJsonResponse(['message' => 'Nenhum dado alterado.'], 200);
        } else {
            sendJsonResponse(['message' => 'Manutenção atualizada com sucesso'], 200);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao atualizar manutenção: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro ao atualizar manutenção: ' . $e->getMessage()], 500);
    } finally {
        $stmt->close();
        $conn->close();
    }
}

/**
 * Busca todas as contas a pagar
 */
function handleGetContasPagar() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $query = "SELECT * FROM ContasPagar ORDER BY DataVencimento ASC";
    
    $result = $conn->query($query);
    $contas = [];
    while ($row = $result->fetch_assoc()) {
        $contas[] = $row;
    }
    $conn->close();
    sendJsonResponse($contas, 200);
}

function handleAddContaPagar($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    // Tenta desativar exibição de erros HTML para esta requisição específica
    ini_set('display_errors', 0);

    $conn->begin_transaction();

    try {
        if (empty($data['UsuarioID']) || empty($data['Descricao']) || empty($data['Valor']) || empty($data['DataVencimento']) || empty($data['Categoria'])) {
            throw new Exception("Descrição, Valor, Vencimento, Categoria e ID do Usuário são obrigatórios.");
        }

        // Verifica se as colunas novas existem (para evitar erro fatal se o ALTER TABLE não rodou)
        $check_cols = $conn->query("SHOW COLUMNS FROM ContasPagar LIKE 'TipoPagamento'");
        if ($check_cols->num_rows == 0) {
             // Se não existem, faz o INSERT antigo (fallback)
             $stmt = $conn->prepare(
                "INSERT INTO ContasPagar (UsuarioID, Descricao, Fornecedor, Categoria, Valor, DataVencimento, Status, Observacoes)
                 VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?)"
            );
            $valor = (float)$data['Valor'];
            $stmt->bind_param("isssdss", $data['UsuarioID'], $data['Descricao'], $data['Fornecedor'], $data['Categoria'], $valor, $data['DataVencimento'], $data['Observacoes']);
        } else {
            // Se existem, faz o INSERT completo
            $stmt = $conn->prepare(
                "INSERT INTO ContasPagar (UsuarioID, Descricao, Fornecedor, Categoria, Valor, DataVencimento, Status, Observacoes, TipoPagamento, FormaPagamento)
                 VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?, ?, ?)"
            );
            
            $fornecedor = $data['Fornecedor'] ?? '';
            $observacoes = $data['Observacoes'] ?? '';
            $tipoPgto = $data['TipoPagamento'] ?? 'À Vista';
            $formaPgto = $data['FormaPagamento'] ?? 'Pix';
            $valor = (float)$data['Valor'];

            $stmt->bind_param(
                "isssdssss", 
                $data['UsuarioID'],
                $data['Descricao'],
                $fornecedor,
                $data['Categoria'],
                $valor,
                $data['DataVencimento'],
                $observacoes,
                $tipoPgto,
                $formaPgto
            );
        }
        
        if (!$stmt->execute()) {
            throw new Exception($stmt->error);
        }
        
        $stmt->close();
        $conn->commit();
        sendJsonResponse(['message' => 'Conta a pagar salva com sucesso!'], 201);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Erro ao salvar conta a pagar: " . $e->getMessage()); 
        sendJsonResponse(['error' => 'Erro ao salvar conta: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

function handleUpdateContaPagar($conta_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    if (isset($data['marcarComoPago']) && $data['marcarComoPago'] === true) {
        $dataPagamento = date('Y-m-d');
        $stmt = $conn->prepare("UPDATE ContasPagar SET Status = 'Pago', DataPagamento = ? WHERE ID = ?");
        $stmt->bind_param("si", $dataPagamento, $conta_id);
    } 
    elseif (isset($data['marcarComoPendente']) && $data['marcarComoPendente'] === true) {
        $stmt = $conn->prepare("UPDATE ContasPagar SET Status = 'Pendente', DataPagamento = NULL WHERE ID = ?");
        $stmt->bind_param("i", $conta_id);
    } 
    else {
        // ATUALIZAÇÃO COMPLETA
        $stmt = $conn->prepare(
            "UPDATE ContasPagar SET 
             Descricao = ?, Fornecedor = ?, Categoria = ?, Valor = ?, DataVencimento = ?, 
             Status = ?, Observacoes = ?, DataPagamento = ?, TipoPagamento = ?, FormaPagamento = ?
             WHERE ID = ?"
        );
        
        $dataPagamento = empty($data['DataPagamento']) ? null : $data['DataPagamento'];
        $tipoPgto = $data['TipoPagamento'] ?? 'À Vista';
        $formaPgto = $data['FormaPagamento'] ?? 'Pix';
        
        // CORREÇÃO AQUI: A string de tipos agora tem 11 caracteres correspondentes às 11 variáveis
        $stmt->bind_param(
            "sssdssssssi", // Antes estava faltando um 's'
            $data['Descricao'],
            $data['Fornecedor'],
            $data['Categoria'],
            $data['Valor'],
            $data['DataVencimento'],
            $data['Status'],
            $data['Observacoes'],
            $dataPagamento,
            $tipoPgto,
            $formaPgto,
            $conta_id
        );
    }

    try {
        $stmt->execute();
        sendJsonResponse(['message' => 'Conta atualizada com sucesso'], 200);
    } catch (Exception $e) {
        error_log("Erro ao atualizar conta: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao atualizar conta: ' . $e->getMessage()], 500);
    } finally {
        if(isset($stmt)) $stmt->close();
        $conn->close();
    }
}

/**
 * Exclui uma conta a pagar
 */
function handleDeleteContaPagar($conta_id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    $stmt = $conn->prepare("DELETE FROM ContasPagar WHERE ID = ? AND Status != 'Pago'");
    $stmt->bind_param("i", $conta_id);
    
    try {
        $stmt->execute();
        if ($stmt->affected_rows === 0) {
            sendJsonResponse(['error' => 'Conta não encontrada ou já está paga (não pode ser excluída).'], 404);
        } else {
            sendJsonResponse(['message' => 'Conta excluída com sucesso'], 200);
        }
    } catch (Exception $e) {
        error_log("Erro ao excluir conta: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao excluir conta: ' . $e->getMessage()], 500);
    } finally {
        $stmt->close();
        $conn->close();
    }
}

/**
 * Busca todas as contas a receber
 */
function handleGetContasReceber() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $query = "SELECT * FROM ContasReceber ORDER BY DataVencimento ASC";
    
    $result = $conn->query($query);
    $contas = [];
    while ($row = $result->fetch_assoc()) {
        $contas[] = $row;
    }
    $conn->close();
    sendJsonResponse($contas, 200);
}

function handleUpdateContaReceber($conta_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    try {
        if (isset($data['marcarComoRecebido']) && $data['marcarComoRecebido'] === true) {
            $dataPagamento = date('Y-m-d');
            $stmt = $conn->prepare("UPDATE ContasReceber SET Status = 'Pago', DataRecebimento = ? WHERE ID = ?");
            $stmt->bind_param("si", $dataPagamento, $conta_id);
        } 
        elseif (isset($data['marcarComoAguardando']) && $data['marcarComoAguardando'] === true) {
            $stmt = $conn->prepare("UPDATE ContasReceber SET Status = 'Aguardando', DataRecebimento = NULL WHERE ID = ?");
            $stmt->bind_param("i", $conta_id);
        } 
        else {
            // NOVA LÓGICA DE EDIÇÃO COMPLETA PARA RECEBER
            $stmt = $conn->prepare(
                "UPDATE ContasReceber SET 
                 ClienteNome = ?, NumeroPedido = ?, Valor = ?, DataVencimento = ?, 
                 Status = ?, DataRecebimento = ?, TipoPagamento = ?, FormaPagamento = ?
                 WHERE ID = ?"
            );
            
            $dataRecebimento = empty($data['DataRecebimento']) ? null : $data['DataRecebimento'];
            $tipoPgto = $data['TipoPagamento'] ?? 'À Vista';
            $formaPgto = $data['FormaPagamento'] ?? 'Boleto';

            $stmt->bind_param(
                "ssdsssssi",
                $data['ClienteNome'],
                $data['NumeroPedido'],
                $data['Valor'],
                $data['DataVencimento'],
                $data['Status'],
                $dataRecebimento,
                $tipoPgto,
                $formaPgto,
                $conta_id
            );
        }

        $stmt->execute();
        sendJsonResponse(['message' => 'Conta atualizada com sucesso'], 200);
    } catch (Exception $e) {
        error_log("Erro ao atualizar conta a receber: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao atualizar conta: ' . $e->getMessage()], 500);
    } finally {
        if(isset($stmt)) $stmt->close();
        $conn->close();
    }
}
/**
 * Busca todos os dados consolidados para o Dashboard Financeiro.
 */
function handleGetFinanceiroDashboard() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $dashboardData = [
        'kpis' => [
            'aReceber' => 0,
            'aPagar' => 0,
            'recebido30d' => 0,
            'pago30d' => 0,
            'saldoPrevisto' => 0,
            'vencidoReceber' => 0,
        ],
        'charts' => [
            'fluxoCaixa' => ['labels' => [], 'entradas' => [], 'saidas' => []],
            'despesasCategoria' => ['labels' => [], 'valores' => []]
        ],
        'listas' => [
            'proximosRecebimentos' => [],
            'proximosPagamentos' => []
        ]
    ];

    $hoje = date('Y-m-d');
    $data30diasAtras = date('Y-m-d', strtotime('-30 days'));

    try {
        // --- KPIs ---
        $kpi_ar = $conn->query("SELECT SUM(Valor) as total FROM ContasReceber WHERE Status = 'Aguardando'")->fetch_assoc();
        $dashboardData['kpis']['aReceber'] = (float)($kpi_ar['total'] ?? 0);
        
        $kpi_ap = $conn->query("SELECT SUM(Valor) as total FROM ContasPagar WHERE Status = 'Pendente'")->fetch_assoc();
        $dashboardData['kpis']['aPagar'] = (float)($kpi_ap['total'] ?? 0);
        
        $kpi_r30d = $conn->query("SELECT SUM(Valor) as total FROM ContasReceber WHERE Status = 'Pago' AND DataRecebimento >= '$data30diasAtras'")->fetch_assoc();
        $dashboardData['kpis']['recebido30d'] = (float)($kpi_r30d['total'] ?? 0);
        
        $kpi_p30d = $conn->query("SELECT SUM(Valor) as total FROM ContasPagar WHERE Status = 'Pago' AND DataPagamento >= '$data30diasAtras'")->fetch_assoc();
        $dashboardData['kpis']['pago30d'] = (float)($kpi_p30d['total'] ?? 0);
        
        $kpi_vencido = $conn->query("SELECT SUM(Valor) as total FROM ContasReceber WHERE Status = 'Aguardando' AND DataVencimento < '$hoje'")->fetch_assoc();
        $dashboardData['kpis']['vencidoReceber'] = (float)($kpi_vencido['total'] ?? 0);
        
        $dashboardData['kpis']['saldoPrevisto'] = $dashboardData['kpis']['aReceber'] - $dashboardData['kpis']['aPagar'];

        // --- Gráfico de Despesas por Categoria (Pago nos últimos 30 dias) ---
        $cat_result = $conn->query("SELECT Categoria, SUM(Valor) as total FROM ContasPagar WHERE Status = 'Pago' AND DataPagamento >= '$data30diasAtras' GROUP BY Categoria");
        while ($row = $cat_result->fetch_assoc()) {
            $dashboardData['charts']['despesasCategoria']['labels'][] = $row['Categoria'];
            $dashboardData['charts']['despesasCategoria']['valores'][] = (float)$row['total'];
        }

        // --- Gráfico de Fluxo de Caixa (Pago/Recebido nos últimos 30 dias) ---
        $entradas = []; $saidas = []; $labels = [];
        for ($i = 29; $i >= 0; $i--) {
            $data = date('Y-m-d', strtotime("-$i days"));
            $labels[] = date('d/m', strtotime("-$i days"));

            $e_res = $conn->query("SELECT SUM(Valor) as total FROM ContasReceber WHERE DataRecebimento = '$data'")->fetch_assoc();
            $entradas[] = (float)($e_res['total'] ?? 0);
            
            $s_res = $conn->query("SELECT SUM(Valor) as total FROM ContasPagar WHERE DataPagamento = '$data'")->fetch_assoc();
            $saidas[] = (float)($s_res['total'] ?? 0);
        }
        $dashboardData['charts']['fluxoCaixa']['labels'] = $labels;
        $dashboardData['charts']['fluxoCaixa']['entradas'] = $entradas;
        $dashboardData['charts']['fluxoCaixa']['saidas'] = $saidas;

        // --- Listas Rápidas ---
        $lista_ar = $conn->query("SELECT ClienteNome, DataVencimento, Valor FROM ContasReceber WHERE Status = 'Aguardando' ORDER BY DataVencimento ASC LIMIT 5");
        while ($row = $lista_ar->fetch_assoc()) { $dashboardData['listas']['proximosRecebimentos'][] = $row; }
        
        $lista_ap = $conn->query("SELECT Descricao, DataVencimento, Valor FROM ContasPagar WHERE Status = 'Pendente' ORDER BY DataVencimento ASC LIMIT 5");
        while ($row = $lista_ap->fetch_assoc()) { $dashboardData['listas']['proximosPagamentos'][] = $row; }

        $conn->close();
        sendJsonResponse($dashboardData, 200);

    } catch (Exception $e) {
        $conn->close();
        error_log("Erro no dashboard financeiro: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao buscar dados do dashboard: ' . $e->getMessage()], 500);
    }
}

/**
 * Busca todos os funcionários
 * CORRIGIDO: Garante que "SELECT *" está sendo usado para trazer todos os campos.
 */
function handleGetFuncionarios() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    // --- GARANTA QUE ESTA LINHA ESTEJA COM "SELECT *" ---
    $query = "SELECT * FROM Funcionarios 
              ORDER BY NomeCompleto ASC";
    
    $result = $conn->query($query);
    $funcionarios = [];
    while ($row = $result->fetch_assoc()) {
        $funcionarios[] = $row;
    }
    $conn->close();
    sendJsonResponse($funcionarios, 200);
}

/**
 * Busca usuários do sistema que ainda não foram vinculados a um funcionário
 */
function handleGetUsuariosSemVinculo() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);

    $query = "SELECT u.ID, u.NomeUsuario, u.NomeCompleto 
              FROM Usuarios u
              LEFT JOIN Funcionarios f ON u.ID = f.UsuarioID
              WHERE f.UsuarioID IS NULL";
    
    $result = $conn->query($query);
    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $usuarios[] = $row;
    }
    $conn->close();
    sendJsonResponse($usuarios, 200);
}

/**
 * Adiciona um novo funcionário
 * CORRIGIDO: A string de tipos agora tem exatamente 24 caracteres para as 24 variáveis.
 */
function handleAddFuncionario($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    try {
        if (empty($data['NomeCompleto']) || empty($data['CPF']) || empty($data['DataAdmissao']) || empty($data['Cargo'])) {
            throw new Exception("Nome, CPF, Data de Admissão e Cargo são obrigatórios.");
        }

        $stmt = $conn->prepare(
            "INSERT INTO Funcionarios (
                NomeCompleto, FotoPerfilBase64, DataNascimento, RG, CPF, NomeMae, NomePai, 
                Telefone, Email, Endereco, CEP, CidadeUF, PIS_PASEP, TituloEleitor, 
                DataAdmissao, Cargo, Departamento, Salario, TipoContrato, Status, 
                Banco, Agencia, ContaCorrente, UsuarioID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        // --- Variáveis locais ---
        $nomeCompleto = $data['NomeCompleto'];
        $fotoBase64 = $data['FotoPerfilBase64'] ?? null;
        $dataNascimento = $data['DataNascimento'] ?? null;
        $rg = $data['RG'] ?? '';
        $cpf = $data['CPF'];
        $nomeMae = $data['NomeMae'] ?? '';
        $nomePai = $data['NomePai'] ?? '';
        $telefone = $data['Telefone'] ?? '';
        $email = $data['Email'] ?? '';
        $endereco = $data['Endereco'] ?? '';
        $cep = $data['CEP'] ?? '';
        $cidadeUF = $data['CidadeUF'] ?? '';
        $pisPasep = $data['PIS_PASEP'] ?? '';
        $tituloEleitor = $data['TituloEleitor'] ?? '';
        $dataAdmissao = $data['DataAdmissao'];
        $cargo = $data['Cargo'];
        $departamento = $data['Departamento'];
        $salario = empty($data['Salario']) ? 0.00 : (float)$data['Salario'];
        $tipoContrato = $data['TipoContrato'] ?? 'CLT';
        $status = $data['Status'] ?? 'Ativo';
        $banco = $data['Banco'] ?? '';
        $agencia = $data['Agencia'] ?? '';
        $contaCorrente = $data['ContaCorrente'] ?? '';
        $usuarioID = empty($data['UsuarioID']) ? null : (int)$data['UsuarioID'];

        // CORREÇÃO AQUI: A string tinha um 's' a mais antes do 'i' final.
        // Agora tem 24 caracteres: 17 's' + 1 'd' + 5 's' + 1 'i'
        $stmt->bind_param(
            "sssssssssssssssssdsssssi", 
            $nomeCompleto, $fotoBase64, $dataNascimento, $rg, $cpf, $nomeMae, $nomePai,
            $telefone, $email, $endereco, $cep, $cidadeUF, $pisPasep, $tituloEleitor,
            $dataAdmissao, $cargo, $departamento, $salario, $tipoContrato, $status,
            $banco, $agencia, $contaCorrente, $usuarioID
        );
        
        if (!$stmt->execute()) {
            throw new Exception($stmt->error);
        }
        
        $stmt->close();
        $conn->commit();
        sendJsonResponse(['message' => 'Funcionário cadastrado com sucesso!'], 201);

    } catch (Exception $e) {
        $conn->rollback();
        // Captura erro de duplicidade (CPF único)
        if ($conn->errno == 1062 || strpos($e->getMessage(), 'Duplicate entry') !== false) {
             sendJsonResponse(['error' => 'Erro: Já existe um funcionário com este CPF.'], 409);
        } else {
            error_log("Erro ao salvar funcionário: " . $e->getMessage()); 
            sendJsonResponse(['error' => 'Erro ao salvar funcionário: ' . $e->getMessage()], 500);
        }
    } finally {
        $conn->close();
    }
}

/**
 * Atualiza um funcionário
 * CORRIGIDO: String de tipos do bind_param
 */
function handleUpdateFuncionario($funcionario_id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    try {
        $stmt = $conn->prepare(
            "UPDATE Funcionarios SET 
                NomeCompleto = ?, FotoPerfilBase64 = ?, DataNascimento = ?, RG = ?, CPF = ?, NomeMae = ?, NomePai = ?, 
                Telefone = ?, Email = ?, Endereco = ?, CEP = ?, CidadeUF = ?, PIS_PASEP = ?, TituloEleitor = ?, 
                DataAdmissao = ?, Cargo = ?, Departamento = ?, Salario = ?, TipoContrato = ?, Status = ?, 
                Banco = ?, Agencia = ?, ContaCorrente = ?, UsuarioID = ?
            WHERE ID = ?"
        );
        
        // --- Variáveis locais (Necessário para bind_param) ---
        $nomeCompleto = $data['NomeCompleto'];
        $fotoBase64 = $data['FotoPerfilBase64'] ?? null;
        $dataNascimento = $data['DataNascimento'] ?? null;
        $rg = $data['RG'] ?? '';
        $cpf = $data['CPF'];
        $nomeMae = $data['NomeMae'] ?? '';
        $nomePai = $data['NomePai'] ?? '';
        $telefone = $data['Telefone'] ?? '';
        $email = $data['Email'] ?? '';
        $endereco = $data['Endereco'] ?? '';
        $cep = $data['CEP'] ?? '';
        $cidadeUF = $data['CidadeUF'] ?? '';
        $pisPasep = $data['PIS_PASEP'] ?? '';
        $tituloEleitor = $data['TituloEleitor'] ?? '';
        $dataAdmissao = $data['DataAdmissao'];
        $cargo = $data['Cargo'];
        $departamento = $data['Departamento'];
        $salario = empty($data['Salario']) ? 0.00 : (float)$data['Salario'];
        $tipoContrato = $data['TipoContrato'] ?? 'CLT';
        $status = $data['Status'] ?? 'Ativo';
        $banco = $data['Banco'] ?? '';
        $agencia = $data['Agencia'] ?? '';
        $contaCorrente = $data['ContaCorrente'] ?? '';
        $usuarioID = empty($data['UsuarioID']) ? null : (int)$data['UsuarioID'];
        // --- Fim das variáveis ---

        // String de tipos CORRIGIDA (25 tipos):
        $stmt->bind_param(
            "sssssssssssssssssdsssssii", // 17 's', 1 'd', 5 's', 2 'i'
            $nomeCompleto, $fotoBase64, $dataNascimento, $rg, $cpf, $nomeMae, $nomePai,
            $telefone, $email, $endereco, $cep, $cidadeUF, $pisPasep, $tituloEleitor,
            $dataAdmissao, $cargo, $departamento, $salario, $tipoContrato, $status,
            $banco, $agencia, $contaCorrente, $usuarioID,
            $funcionario_id
        );
        
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendJsonResponse(['message' => 'Nenhum dado alterado.'], 200);
        } else {
            sendJsonResponse(['message' => 'Funcionário atualizado com sucesso'], 200);
        }

    } catch (Exception $e) {
         if ($e->getCode() == 1062) {
             sendJsonResponse(['error' => 'Erro: Já existe um funcionário com este CPF.'], 409);
         } else {
            error_log("Erro ao atualizar funcionário: " . $e->getMessage()); 
            sendJsonResponse(['error' => 'Erro ao atualizar funcionário: ' . $e->getMessage()], 500);
         }
    } finally {
        $stmt->close();
        $conn->close();
    }
}

/**
 * Busca todos os usuários para preencher o dropdown de vendedores
 */
function handleGetListaVendedores() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Não foi possível conectar ao banco de dados'], 500);
    
    // Busca ID e Nome de todos os usuários (você pode filtrar por Role se quiser: WHERE Role = 'vendedor' OR Role = 'admin')
    $query = "SELECT NomeCompleto FROM Usuarios ORDER BY NomeCompleto ASC";
    $result = $conn->query($query);
    
    $vendedores = [];
    while ($row = $result->fetch_assoc()) {
        $vendedores[] = $row['NomeCompleto'];
    }
    $conn->close();
    sendJsonResponse($vendedores, 200);
}

/**
 * Busca as permissões de um usuário específico
 */
function handleGetPermissoes($usuario_id) {
    $conn = get_db_connection();
    $stmt = $conn->prepare("SELECT Modulo FROM Permissoes WHERE UsuarioID = ?");
    $stmt->bind_param("i", $usuario_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $modulos = [];
    while ($row = $result->fetch_assoc()) {
        $modulos[] = $row['Modulo'];
    }
    
    $stmt->close();
    $conn->close();
    sendJsonResponse($modulos, 200);
}

/**
 * Salva as novas permissões
 */
function handleSavePermissoes($usuario_id, $data) {
    $conn = get_db_connection();
    
    if (!isset($data['modulos']) || !is_array($data['modulos'])) {
        sendJsonResponse(['error' => 'Lista de módulos inválida'], 400);
    }

    $conn->begin_transaction();
    try {
        // 1. Remove permissões antigas
        $stmt_del = $conn->prepare("DELETE FROM Permissoes WHERE UsuarioID = ?");
        $stmt_del->bind_param("i", $usuario_id);
        $stmt_del->execute();
        $stmt_del->close();

        // 2. Insere novas permissões
        if (!empty($data['modulos'])) {
            $stmt_ins = $conn->prepare("INSERT INTO Permissoes (UsuarioID, Modulo) VALUES (?, ?)");
            foreach ($data['modulos'] as $modulo) {
                $stmt_ins->bind_param("is", $usuario_id, $modulo);
                $stmt_ins->execute();
            }
            $stmt_ins->close();
        }

        $conn->commit();
        sendJsonResponse(['message' => 'Permissões atualizadas com sucesso'], 200);
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Erro ao salvar permissões: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao salvar permissões'], 500);
    } finally {
        $conn->close();
    }
}

// Exemplo de melhoria no index.php (Sugestão futura para blindagem total)

function verificarPermissao($usuario_id, $modulo_necessario) {
    $conn = get_db_connection();
    // Admin sempre passa
    // Verifica se existe registro na tabela Permissoes para este usuário e módulo
    // Se não, retorna false e a API responde com erro 403 Forbidden
}

/**
 * Adiciona um novo produto ao catálogo
 */
function handleAddProduto($data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Erro de conexão'], 500);

    try {
        if (empty($data['NomeItem']) || empty($data['UnidadeMedida'])) {
            throw new Exception("Nome e Unidade de Medida são obrigatórios.");
        }

        $stmt = $conn->prepare("INSERT INTO Produtos (NomeItem, UnidadeMedida, PrecoSerralheria, PrecoConsumidor) VALUES (?, ?, ?, ?)");
        
        $precoSerralheria = isset($data['PrecoSerralheria']) ? (float)$data['PrecoSerralheria'] : 0.00;
        $precoConsumidor = isset($data['PrecoConsumidor']) ? (float)$data['PrecoConsumidor'] : 0.00;

        $stmt->bind_param("ssdd", $data['NomeItem'], $data['UnidadeMedida'], $precoSerralheria, $precoConsumidor);
        
        if ($stmt->execute()) {
            sendJsonResponse(['message' => 'Produto cadastrado com sucesso!', 'id' => $conn->insert_id], 201);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        error_log("Erro ao adicionar produto: " . $e->getMessage());
        sendJsonResponse(['error' => 'Erro ao salvar produto: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Atualiza um produto existente
 */
function handleUpdateProduto($id, $data) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Erro de conexão'], 500);

    try {
        $stmt = $conn->prepare("UPDATE Produtos SET NomeItem = ?, UnidadeMedida = ?, PrecoSerralheria = ?, PrecoConsumidor = ? WHERE ID = ?");
        
        $precoSerralheria = (float)$data['PrecoSerralheria'];
        $precoConsumidor = (float)$data['PrecoConsumidor'];

        $stmt->bind_param("ssddi", $data['NomeItem'], $data['UnidadeMedida'], $precoSerralheria, $precoConsumidor, $id);
        
        if ($stmt->execute()) {
            sendJsonResponse(['message' => 'Produto atualizado com sucesso!'], 200);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Erro ao atualizar: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Exclui um produto
 */
function handleDeleteProduto($id) {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Erro de conexão'], 500);

    try {
        // Verifica se está em uso (Opcional, mas recomendado)
        // $check = $conn->query("SELECT ID FROM ItensOrcamento WHERE ProdutoID = $id LIMIT 1");
        // if ($check->num_rows > 0) throw new Exception("Produto em uso em orçamentos. Não pode ser excluído.");

        $stmt = $conn->prepare("DELETE FROM Produtos WHERE ID = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            sendJsonResponse(['message' => 'Produto excluído com sucesso!'], 200);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Erro ao excluir: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Busca solicitações de compra.
 * Se não for admin, vê apenas as suas.
 */
function handleGetSolicitacoesCompras() {
    $conn = get_db_connection();
    $usuario_id = isset($_GET['usuarioID']) ? (int)$_GET['usuarioID'] : null;
    $role = isset($_GET['role']) ? $_GET['role'] : 'user';

    $query = "SELECT s.*, u.NomeCompleto as Solicitante 
              FROM SolicitacoesCompras s 
              JOIN Usuarios u ON s.UsuarioID = u.ID";

    if ($role !== 'admin' && $usuario_id) {
        $query .= " WHERE s.UsuarioID = $usuario_id";
    }
    
    $query .= " ORDER BY FIELD(s.Status, 'Pendente', 'Em Cotação', 'Aprovado', 'Concluído', 'Recusado'), s.Prioridade DESC, s.DataSolicitacao DESC";

    $result = $conn->query($query);
    $items = [];
    while ($row = $result->fetch_assoc()) { $items[] = $row; }
    $conn->close();
    sendJsonResponse($items, 200);
}

function handleAddSolicitacaoCompra($data) {
    $conn = get_db_connection();
    try {
        $stmt = $conn->prepare("INSERT INTO SolicitacoesCompras (UsuarioID, Setor, Material, Quantidade, Unidade, Descricao, Prioridade, DataNecessidade, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')");
        $dataNecessidade = !empty($data['DataNecessidade']) ? $data['DataNecessidade'] : null;
        
        $stmt->bind_param("issdssss", 
            $data['UsuarioID'], $data['Setor'], $data['Material'], $data['Quantidade'], 
            $data['Unidade'], $data['Descricao'], $data['Prioridade'], $dataNecessidade
        );
        
        if ($stmt->execute()) sendJsonResponse(['message' => 'Solicitação enviada com sucesso!'], 201);
        else throw new Exception($stmt->error);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Erro ao salvar: ' . $e->getMessage()], 500);
    } finally { $conn->close(); }
}

function handleUpdateSolicitacaoCompra($id, $data) {
    $conn = get_db_connection();
    $conn->begin_transaction();
    try {
        // Atualiza o status e dados da solicitação
        $query = "UPDATE SolicitacoesCompras SET Status = ?";
        $types = "s";
        $params = [$data['Status']];

        if (isset($data['MotivoRecusa'])) {
            $query .= ", MotivoRecusa = ?";
            $types .= "s";
            $params[] = $data['MotivoRecusa'];
        }
        
        $query .= " WHERE ID = ?";
        $types .= "i";
        $params[] = $id;

        $stmt = $conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();

        // INTEGRAÇÃO FINANCEIRA: Se aprovado e com dados financeiros, cria Conta a Pagar
        if ($data['Status'] === 'Aprovado' && isset($data['GerarFinanceiro']) && $data['GerarFinanceiro']) {
            $stmt_fin = $conn->prepare("INSERT INTO ContasPagar (UsuarioID, Descricao, Fornecedor, Categoria, Valor, DataVencimento, Status, Observacoes, TipoPagamento, FormaPagamento) VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?, ?, ?)");
            
            $obs = "Gerado via Solicitação de Compra #" . $id;
            $categoria = "Suprimentos"; // Ou pega do input
            
            $stmt_fin->bind_param("isssdssss", 
                $data['UsuarioID'], // ID do Admin que aprovou
                $data['DescricaoFinanceira'], // "Compra de X para Setor Y"
                $data['Fornecedor'],
                $categoria,
                $data['ValorFinal'],
                $data['DataVencimento'],
                $obs,
                $data['TipoPagamento'],
                $data['FormaPagamento']
            );
            $stmt_fin->execute();
            $stmt_fin->close();
        }

        $conn->commit();
        sendJsonResponse(['message' => 'Solicitação atualizada com sucesso!'], 200);
    } catch (Exception $e) {
        $conn->rollback();
        sendJsonResponse(['error' => 'Erro: ' . $e->getMessage()], 500);
    } finally { $conn->close(); }
}

function handleDeleteSolicitacaoCompra($id) {
    $conn = get_db_connection();
    $conn->query("DELETE FROM SolicitacoesCompras WHERE ID = $id");
    $conn->close();
    sendJsonResponse(['message' => 'Excluído com sucesso'], 200);
}

/**
 * Busca avisos do sistema ativos e dentro do prazo
 */
function handleGetAvisosSistema() {
    $conn = get_db_connection();
    $hoje = date('Y-m-d H:i:s');
    
    // Busca avisos ativos que não expiraram (ou que não têm data de expiração)
    $query = "SELECT * FROM AvisosSistema 
              WHERE Ativo = 1 
              AND (DataExpiracao IS NULL OR DataExpiracao > '$hoje')
              ORDER BY DataCriacao DESC";
              
    $result = $conn->query($query);
    $avisos = [];
    while ($row = $result->fetch_assoc()) {
        $avisos[] = $row;
    }
    $conn->close();
    sendJsonResponse($avisos, 200);
}

/**
 * Cria um novo aviso global
 */
function handleAddAvisoSistema($data) {
    $conn = get_db_connection();
    try {
        if (empty($data['titulo']) || empty($data['mensagem'])) {
            throw new Exception("Título e mensagem são obrigatórios.");
        }

        $stmt = $conn->prepare("INSERT INTO AvisosSistema (Titulo, Mensagem, Tipo, DataExpiracao, CriadoPor) VALUES (?, ?, ?, ?, ?)");
        
        $expiracao = !empty($data['expiracao']) ? $data['expiracao'] : null;
        $tipo = $data['tipo'] ?? 'info';
        $usuario = $data['usuario_id'];

        $stmt->bind_param("ssssi", $data['titulo'], $data['mensagem'], $tipo, $expiracao, $usuario);
        
        if ($stmt->execute()) {
            sendJsonResponse(['message' => 'Aviso publicado com sucesso!'], 201);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Erro ao criar aviso: ' . $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

/**
 * Remove (desativa) um aviso
 */
function handleDeleteAvisoSistema($id) {
    $conn = get_db_connection();
    // Soft delete (apenas marca como inativo)
    $conn->query("UPDATE AvisosSistema SET Ativo = 0 WHERE ID = $id");
    $conn->close();
    sendJsonResponse(['message' => 'Aviso removido.'], 200);
}

/**
 * Dashboard Executivo Completo (BI)
 */
function handleGetDiretoriaDashboard() {
    $conn = get_db_connection();
    if (!$conn) sendJsonResponse(['error' => 'Erro de conexão'], 500);

    $data = [
        'financeiro' => ['saldo' => 0, 'aPagar' => 0, 'aReceber' => 0],
        'comercial' => ['pedidosAbertos' => 0, 'faturamentoTotal' => 0, 'porVendedor' => [], 'porCliente' => []],
        'estoque' => [],
        'producao' => [],
        'manutencao' => ['emAndamento' => 0, 'causas' => []],
        'rh' => ['qtdFuncionarios' => 0, 'custoMedio' => 0],
        'comex' => [],
        'compras' => ['aguardando' => 0, 'porSetor' => []],
        'pendencias' => [] // Central de Aprovação (Ultimato)
    ];

    try {
        // 1. FINANCEIRO
        // Saldo Atual (Recebido - Pago)
        $sqlEnt = "SELECT SUM(Valor) as val FROM ContasReceber WHERE Status = 'Pago'";
        $sqlSai = "SELECT SUM(Valor) as val FROM ContasPagar WHERE Status = 'Pago'";
        $ent = $conn->query($sqlEnt)->fetch_assoc()['val'] ?? 0;
        $sai = $conn->query($sqlSai)->fetch_assoc()['val'] ?? 0;
        $data['financeiro']['saldo'] = $ent - $sai;

        // A Pagar e A Receber
        $data['financeiro']['aPagar'] = (float)($conn->query("SELECT SUM(Valor) as val FROM ContasPagar WHERE Status = 'Pendente'")->fetch_assoc()['val'] ?? 0);
        $data['financeiro']['aReceber'] = (float)($conn->query("SELECT SUM(Valor) as val FROM ContasReceber WHERE Status IN ('Aguardando', 'Pendente')")->fetch_assoc()['val'] ?? 0);

        // 2. COMERCIAL
        // Pedidos em Aberto (Não Concluído/Cancelado)
        $data['comercial']['pedidosAbertos'] = (int)($conn->query("SELECT COUNT(*) as qtd FROM Pedidos WHERE StatusPedido NOT IN ('Concluído', 'Cancelado')")->fetch_assoc()['qtd'] ?? 0);
        
        // Faturamento Total (Pedidos Concluídos)
        $data['comercial']['faturamentoTotal'] = (float)($conn->query("SELECT SUM(ValorTotal) as val FROM Pedidos WHERE StatusPedido = 'Concluído'")->fetch_assoc()['val'] ?? 0);

        // Faturamento por Vendedor
        $resVend = $conn->query("SELECT VendedorNome, SUM(ValorTotal) as total FROM Pedidos WHERE StatusPedido = 'Concluído' GROUP BY VendedorNome ORDER BY total DESC");
        while($r = $resVend->fetch_assoc()) $data['comercial']['porVendedor'][] = $r;

        // Faturamento por Cliente (Top 5)
        $resCli = $conn->query("SELECT ClienteNome, SUM(ValorTotal) as total FROM Pedidos WHERE StatusPedido = 'Concluído' GROUP BY ClienteNome ORDER BY total DESC LIMIT 5");
        while($r = $resCli->fetch_assoc()) $data['comercial']['porCliente'][] = $r;

        // 3. ESTOQUE (Posição Atual por Tipo)
        $resEst = $conn->query("SELECT Tipo, SUM(Peso) as pesoTotal FROM Bobinas WHERE Status = 'Disponível' GROUP BY Tipo ORDER BY pesoTotal DESC");
        while($r = $resEst->fetch_assoc()) $data['estoque'][] = $r;

        // 4. PRODUÇÃO (Em Andamento)
        // Trazemos detalhes das produções ativas (aquelas cujos pedidos estão 'Em Produção')
        $sqlProd = "SELECT p.ID, p.NumPedido, p.NomeCliente, p.DataProducao FROM Producoes p JOIN Pedidos ped ON p.NumPedido = ped.NumeroPedido WHERE ped.StatusPedido = 'Em Produção'";
        $resProd = $conn->query($sqlProd);
        while($r = $resProd->fetch_assoc()) $data['producao'][] = $r;

        // 5. MANUTENÇÃO
        $data['manutencao']['emAndamento'] = (int)($conn->query("SELECT COUNT(*) as qtd FROM Manutencoes WHERE Status = 'Em Manutenção'")->fetch_assoc()['qtd'] ?? 0);
        
        // Principais Causas
        $resManut = $conn->query("SELECT ProblemaDefeito, COUNT(*) as qtd FROM Manutencoes GROUP BY ProblemaDefeito ORDER BY qtd DESC LIMIT 5");
        while($r = $resManut->fetch_assoc()) $data['manutencao']['causas'][] = $r;

        // 6. RH
        $resRH = $conn->query("SELECT COUNT(*) as qtd, SUM(Salario) as folha FROM Funcionarios WHERE Status = 'Ativo'");
        $rhData = $resRH->fetch_assoc();
        $qtdFunc = $rhData['qtd'] ?? 0;
        $data['rh']['qtdFuncionarios'] = (int)$qtdFunc;
        $data['rh']['custoMedio'] = $qtdFunc > 0 ? ($rhData['folha'] / $qtdFunc) : 0;

        // 7. COMEX (Containers)
        // Se a tabela não existir ainda, retorna vazio para não quebrar
        $checkTable = $conn->query("SHOW TABLES LIKE 'RastreioContainers'");
        if($checkTable && $checkTable->num_rows > 0) {
            $resComex = $conn->query("SELECT ContainerNumero, StatusAtual, DataETA FROM RastreioContainers WHERE StatusStep < 8 ORDER BY DataETA ASC");
            while($r = $resComex->fetch_assoc()) $data['comex'][] = $r;
        }

        // 8. COMPRAS
        $data['compras']['aguardando'] = (int)($conn->query("SELECT COUNT(*) as qtd FROM SolicitacoesCompras WHERE Status = 'Pendente'")->fetch_assoc()['qtd'] ?? 0);
        
        $resCompras = $conn->query("SELECT Setor, COUNT(*) as qtd FROM SolicitacoesCompras GROUP BY Setor");
        while($r = $resCompras->fetch_assoc()) $data['compras']['porSetor'][] = $r;

        // 9. PENDÊNCIAS (Central de Aprovação - O Ultimato)
        $pendencias = [];
        
        // Compras Pendentes
        $resC = $conn->query("SELECT s.ID, 'Compra' as Tipo, s.Material as Titulo, s.Quantidade, s.Unidade, u.NomeCompleto as Autor, s.DataSolicitacao as Data FROM SolicitacoesCompras s LEFT JOIN Usuarios u ON s.UsuarioID = u.ID WHERE s.Status = 'Pendente'");
        if ($resC) while($r = $resC->fetch_assoc()) { $r['Descricao'] = "Compra: " . $r['Titulo']; $r['Valor'] = 0; $pendencias[] = $r; }
        
        // Orçamentos Altos Pendentes
        $resO = $conn->query("SELECT o.ID, 'Orcamento' as Tipo, o.ClienteNome as Titulo, o.ValorTotal as Valor, u.NomeCompleto as Autor, o.DataOrcamento as Data FROM Orcamentos o LEFT JOIN Usuarios u ON o.UsuarioID = u.ID WHERE o.Status = 'pendente' AND o.ValorTotal > 10000");
        if ($resO) while($r = $resO->fetch_assoc()) { $r['Descricao'] = "Orçamento: " . $r['Titulo']; $pendencias[] = $r; }

        usort($pendencias, function($a, $b) { return strtotime($a['Data']) - strtotime($b['Data']); });
        $data['pendencias'] = $pendencias;

        sendJsonResponse($data, 200);

    } catch (Exception $e) {
        error_log("Erro Dashboard Diretoria: " . $e->getMessage());
        sendJsonResponse(['error' => $e->getMessage()], 500);
    } finally {
        $conn->close();
    }
}

?>