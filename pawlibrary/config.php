
<?php
$host = "localhost";
$dbname = "pawlibrary";
$username = "root";
$password = "";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );

    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

} catch (PDOException $e) {
    die("Koneksi database gagal: " . $e->getMessage());
}
?>
