<?php
/**
 * Funções auxiliares para hash de senhas e outras utilidades
 */

function hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function check_password($password, $hash) {
    return password_verify($password, $hash);
}

function sanitize_input($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function validate_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}
?>