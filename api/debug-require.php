<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "1. Testando config.php...<br>";
require_once __DIR__ . '/../config/config.php';
echo "✅ config.php OK<br>";

echo "2. Testando database.php...<br>";
require_once __DIR__ . '/../config/database.php';
echo "✅ database.php OK<br>";

echo "3. Testando cors.php...<br>";
require_once __DIR__ . '/../config/cors.php';
echo "✅ cors.php OK<br>";

echo "4. Testando autoload.php...<br>";
require_once __DIR__ . '/../src/autoload.php';
echo "✅ autoload.php OK<br>";

echo "5. Testando helpers.php...<br>";
require_once __DIR__ . '/../src/Utils/helpers.php';
echo "✅ helpers.php OK<br>";

echo "6. Testando legacy_functions.php...<br>";
require_once __DIR__ . '/../src/legacy_functions.php';
echo "✅ legacy_functions.php OK<br>";

echo "<br><strong>TODOS OS ARQUIVOS CARREGADOS COM SUCESSO!</strong>";
?>
