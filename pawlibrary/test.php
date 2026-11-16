
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

    echo "KONEKSI DATABASE BERHASIL!";

} catch (PDOException $e) {
    echo "KONEKSI GAGAL: " . $e->getMessage();
}

?>
