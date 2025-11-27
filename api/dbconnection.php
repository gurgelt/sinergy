<?php
// Configurações do Banco de Dados HostGator
define('DB_HOST', 'localhost');
define('DB_NAME', 'atriu019_sinergy');
define('DB_USER', 'atriu019_paulo');
define('DB_PASSWORD', 'jauyo8Y091Z@58JABSDavas%%');

function get_db_connection() {
    // --- ADICIONE ESTA LINHA ---
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    // -------------------------
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
        
        if ($conn->connect_error) {
            error_log("Erro de conexão MySQL: " . $conn->connect_error);
            return false;
        }
        
        $conn->set_charset("utf8mb4");
        return $conn;
    } catch (Exception $e) {
        error_log("Exceção na conexão: " . $e->getMessage());
        return false;
    }
}
?>