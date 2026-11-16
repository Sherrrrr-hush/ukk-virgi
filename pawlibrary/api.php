<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

/* =========================================
   RESPONSE
========================================= */

function response($success, $message = '', $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

function inputData() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

/* =========================================
   AUTHENTICATION
========================================= */

function requireLogin() {
    if (empty($_SESSION['user'])) {
        response(false, 'Silakan login terlebih dahulu');
    }

    return $_SESSION['user'];
}

function requireAdmin() {
    $user = requireLogin();

    if (($user['role'] ?? '') !== 'admin') {
        response(false, 'Akses khusus admin');
    }

    return $user;
}


/* =========================================
   KOLOM PROFIL TAMBAHAN (otomatis dibuat)
========================================= */

const USER_FIELDS = 'id, name, email, phone, birth_date, gender, address, role, created_at';

function ensureUserColumns($pdo) {
    $needed = [
        'phone'      => "VARCHAR(20) DEFAULT NULL",
        'birth_date' => "DATE DEFAULT NULL",
        'gender'     => "VARCHAR(20) DEFAULT NULL",
        'address'    => "VARCHAR(255) DEFAULT NULL",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
    ];

    $stmt = $pdo->query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );
    $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($needed as $column => $definition) {
        if (!in_array($column, $existing, true)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN `$column` $definition");
        }
    }

    $idx = $pdo->query(
        "SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
         AND INDEX_NAME = 'phone' LIMIT 1"
    )->fetch();

    if (!$idx) {
        $pdo->exec("ALTER TABLE users ADD UNIQUE KEY `phone` (`phone`)");
    }
}

// Normalisasi nomor telepon Indonesia: +62 812-3456-7890 -> 081234567890
function normalizePhone($phone) {
    $phone = preg_replace('/[\s\-\.\(\)]/', '', (string)$phone);

    if (strpos($phone, '+62') === 0) {
        $phone = '0' . substr($phone, 3);
    } elseif (strpos($phone, '62') === 0) {
        $phone = '0' . substr($phone, 2);
    }

    return $phone;
}

function isValidPhone($phone) {
    return (bool)preg_match('/^08\d{8,12}$/', $phone);
}

function findUserById($pdo, $id) {
    $stmt = $pdo->prepare("SELECT " . USER_FIELDS . " FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

// Validasi data profil opsional (tanggal lahir, gender, alamat)
function cleanProfileExtras($data) {
    $birth = trim($data['birth_date'] ?? '');
    $gender = trim($data['gender'] ?? '');
    $address = trim($data['address'] ?? '');

    if ($birth !== '') {
        $d = DateTime::createFromFormat('Y-m-d', $birth);
        if (!$d || $d->format('Y-m-d') !== $birth || $d > new DateTime('today')) {
            response(false, 'Tanggal lahir tidak valid');
        }
    }

    if ($gender !== '' && !in_array($gender, ['Laki-laki', 'Perempuan'], true)) {
        response(false, 'Jenis kelamin tidak valid');
    }

    if (mb_strlen($address) > 255) {
        response(false, 'Alamat maksimal 255 karakter');
    }

    return [
        $birth === '' ? null : $birth,
        $gender === '' ? null : $gender,
        $address === '' ? null : $address,
    ];
}

/* =========================================
   API ACTION
========================================= */

$action = $_GET['action'] ?? '';

/* =========================================
   AKUN DEMO ADMIN
========================================= */

try {
    ensureUserColumns($pdo);
} catch (PDOException $e) {
    error_log($e->getMessage());
}

try {
    $email = 'admin@admin.com';

    $checkAdmin = $pdo->prepare(
        "SELECT id FROM users WHERE email = ?"
    );

    $checkAdmin->execute([$email]);

    if (!$checkAdmin->fetch()) {
        $passwordHash = password_hash(
            'admin123',
            PASSWORD_DEFAULT
        );

        $createAdmin = $pdo->prepare(
            "INSERT INTO users
             (name, email, password_hash, role)
             VALUES (?, ?, ?, 'admin')"
        );

        $createAdmin->execute([
            'Admin ManyBooks',
            $email,
            $passwordHash
        ]);
    }

} catch (PDOException $e) {
    error_log($e->getMessage());
}

/* =========================================
   MAIN API
========================================= */

try {

    switch ($action) {

        /* =====================================
           CEK SESSION
        ===================================== */

        case 'me':

            if (!empty($_SESSION['user']['id'])) {
                // Ambil data terbaru dari database agar profil selalu lengkap
                $fresh = findUserById($pdo, $_SESSION['user']['id']);

                if ($fresh) {
                    $_SESSION['user'] = $fresh;
                }
            }

            response(
                true,
                'Session aktif',
                $_SESSION['user'] ?? null
            );

            break;


        /* =====================================
           REGISTER
        ===================================== */

        case 'register':

            $data = inputData();

            $name = trim($data['name'] ?? '');
            $email = strtolower(trim($data['email'] ?? ''));
            $phone = normalizePhone($data['phone'] ?? '');
            $password = $data['password'] ?? '';

            if (
                $name === '' ||
                !filter_var($email, FILTER_VALIDATE_EMAIL) ||
                strlen($password) < 6
            ) {
                response(
                    false,
                    'Data pendaftaran tidak valid. Password minimal 6 karakter.'
                );
            }

            if (!isValidPhone($phone)) {
                response(
                    false,
                    'Nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx.'
                );
            }

            [$birth, $gender, $address] = cleanProfileExtras($data);

            $check = $pdo->prepare(
                "SELECT email, phone FROM users
                 WHERE email = ? OR phone = ?
                 LIMIT 1"
            );

            $check->execute([$email, $phone]);
            $exists = $check->fetch(PDO::FETCH_ASSOC);

            if ($exists) {
                response(
                    false,
                    $exists['email'] === $email
                        ? 'Email sudah digunakan'
                        : 'Nomor telepon sudah digunakan'
                );
            }

            $hash = password_hash(
                $password,
                PASSWORD_DEFAULT
            );

            $stmt = $pdo->prepare(
                "INSERT INTO users
                 (name, email, phone, birth_date, gender, address, password_hash, role)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'user')"
            );

            $stmt->execute([
                $name,
                $email,
                $phone,
                $birth,
                $gender,
                $address,
                $hash
            ]);

            response(true, 'Pendaftaran berhasil');

            break;


        /* =====================================
           LOGIN
        ===================================== */

        case 'login':

            $data = inputData();

            // Bisa masuk dengan email ATAU nomor telepon
            $identifier = trim($data['email'] ?? $data['identifier'] ?? '');
            $password = $data['password'] ?? '';

            if (strpos($identifier, '@') !== false) {
                $field = 'email';
                $value = strtolower($identifier);
            } else {
                $field = 'phone';
                $value = normalizePhone($identifier);
            }

            $stmt = $pdo->prepare(
                "SELECT " . USER_FIELDS . ", password_hash
                 FROM users
                 WHERE $field = ?
                 LIMIT 1"
            );

            $stmt->execute([$value]);

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (
                !$user ||
                !password_verify(
                    $password,
                    $user['password_hash']
                )
            ) {
                response(false, 'Email/nomor telepon atau password salah');
            }

            session_regenerate_id(true);

            unset($user['password_hash']);

            $_SESSION['user'] = $user;

            response(
                true,
                'Login berhasil',
                $user
            );

            break;


        /* =====================================
           UPDATE PROFIL
        ===================================== */

        case 'update_profile':

            $user = requireLogin();
            $data = inputData();

            $name = trim($data['name'] ?? '');
            $email = strtolower(trim($data['email'] ?? ''));
            $phone = normalizePhone($data['phone'] ?? '');

            if ($name === '') {
                response(false, 'Nama tidak boleh kosong');
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                response(false, 'Format email tidak valid');
            }

            // Akun lama (mis. admin) boleh belum punya nomor telepon
            if ($phone === '') {
                $phone = null;
            } elseif (!isValidPhone($phone)) {
                response(false, 'Nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx.');
            }

            [$birth, $gender, $address] = cleanProfileExtras($data);

            $check = $pdo->prepare(
                "SELECT email, phone FROM users
                 WHERE (email = ? OR (? IS NOT NULL AND phone = ?))
                 AND id != ?
                 LIMIT 1"
            );

            $check->execute([$email, $phone, $phone, $user['id']]);
            $exists = $check->fetch(PDO::FETCH_ASSOC);

            if ($exists) {
                response(
                    false,
                    $exists['email'] === $email
                        ? 'Email sudah digunakan akun lain'
                        : 'Nomor telepon sudah digunakan akun lain'
                );
            }

            $stmt = $pdo->prepare(
                "UPDATE users
                 SET name = ?, email = ?, phone = ?,
                     birth_date = ?, gender = ?, address = ?
                 WHERE id = ?"
            );

            $stmt->execute([
                $name,
                $email,
                $phone,
                $birth,
                $gender,
                $address,
                $user['id']
            ]);

            $updatedUser = findUserById($pdo, $user['id']);

            $_SESSION['user'] = $updatedUser;

            response(
                true,
                'Profil berhasil diperbarui',
                ['user' => $updatedUser]
            );

            break;


        /* =====================================
           LOGOUT
        ===================================== */

        case 'logout':

            $_SESSION = [];

            session_destroy();

            response(true, 'Berhasil keluar');

            break;


        /* =====================================
           AMBIL SEMUA BUKU
        ===================================== */

        case 'get_books':

            $sql = "
                SELECT
                    books.id,
                    books.title,
                    books.author,
                    books.description,
                    books.publisher,
                    books.publication_year,
                    books.page_count,
                    books.isbn,
                    books.stock,
                    books.image_url AS img,

                    COALESCE(genres.name, 'Umum') AS genre,

                    (
                        SELECT COUNT(*)
                        FROM loans
                        WHERE loans.book_id = books.id
                        AND loans.status = 'Sedang dipinjam'
                    ) AS borrowed_count,

                    GREATEST(
                        CAST(books.stock AS SIGNED) -
                        CAST((
                            SELECT COUNT(*)
                            FROM loans
                            WHERE loans.book_id = books.id
                            AND loans.status = 'Sedang dipinjam'
                        ) AS SIGNED),
                        0
                    ) AS available_stock

                FROM books

                LEFT JOIN genres
                    ON books.genre_id = genres.id

                ORDER BY books.id DESC
            ";

            $stmt = $pdo->query($sql);

            response(
                true,
                'Data buku berhasil diambil',
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            );

            break;


        /* =====================================
           DETAIL BUKU
        ===================================== */

        case 'get_book_detail':

            $id = (int)($_GET['id'] ?? 0);

            if ($id <= 0) {
                response(false, 'ID buku tidak valid');
            }

            $sql = "
                SELECT
                    books.id,
                    books.title,
                    books.author,
                    books.description,
                    books.publisher,
                    books.publication_year,
                    books.page_count,
                    books.isbn,
                    books.stock,
                    books.image_url AS img,

                    COALESCE(genres.name, 'Umum') AS genre,

                    (
                        SELECT COUNT(*)
                        FROM loans
                        WHERE loans.book_id = books.id
                        AND loans.status = 'Sedang dipinjam'
                    ) AS borrowed_count,

                    GREATEST(
                        CAST(books.stock AS SIGNED) -
                        CAST((
                            SELECT COUNT(*)
                            FROM loans
                            WHERE loans.book_id = books.id
                            AND loans.status = 'Sedang dipinjam'
                        ) AS SIGNED),
                        0
                    ) AS available_stock

                FROM books

                LEFT JOIN genres
                    ON books.genre_id = genres.id

                WHERE books.id = ?

                LIMIT 1
            ";

            $stmt = $pdo->prepare($sql);

            $stmt->execute([$id]);

            $book = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$book) {
                response(false, 'Buku tidak ditemukan');
            }

            response(
                true,
                'Detail buku berhasil diambil',
                $book
            );

            break;


        /* =====================================
           TAMBAH BUKU
        ===================================== */

        case 'add_book':

            requireAdmin();

            $data = inputData();

            $title = trim($data['title'] ?? '');
            $author = trim($data['author'] ?? '');
            $description = trim($data['description'] ?? '');
            $publisher = trim($data['publisher'] ?? '');
            $year = (int)($data['publication_year'] ?? 0);
            $pages = (int)($data['page_count'] ?? 0);
            $isbn = trim($data['isbn'] ?? '');
            $stock = (int)($data['stock'] ?? 1);
            $img = trim($data['img'] ?? '');
            $genre = trim($data['genre'] ?? 'Umum');

            if ($title === '' || $author === '') {
                response(false, 'Judul dan penulis wajib diisi');
            }

            if ($stock < 1) {
                response(false, 'Stok buku minimal 1');
            }

            if (
                $year < 0 ||
                $year > 9999 ||
                $pages < 0
            ) {
                response(false, 'Tahun atau jumlah halaman tidak valid');
            }

            $stmt = $pdo->prepare(
                "SELECT id FROM genres WHERE name = ?"
            );

            $stmt->execute([$genre]);

            $genreId = $stmt->fetchColumn();

            if (!$genreId) {

                $stmt = $pdo->prepare(
                    "INSERT INTO genres (name) VALUES (?)"
                );

                $stmt->execute([$genre]);

                $genreId = $pdo->lastInsertId();
            }

            $stmt = $pdo->prepare(
                "INSERT INTO books
                (
                    title,
                    author,
                    description,
                    publisher,
                    publication_year,
                    page_count,
                    isbn,
                    stock,
                    image_url,
                    genre_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            $stmt->execute([
                $title,
                $author,
                $description,
                $publisher,
                $year ?: null,
                $pages ?: null,
                $isbn,
                $stock,
                $img,
                $genreId
            ]);

            response(true, 'Buku berhasil ditambahkan');

            break;


        /* =====================================
           EDIT BUKU
        ===================================== */

        case 'update_book':

            requireAdmin();

            $data = inputData();

            $id = (int)($data['id'] ?? 0);
            $title = trim($data['title'] ?? '');
            $author = trim($data['author'] ?? '');
            $description = trim($data['description'] ?? '');
            $publisher = trim($data['publisher'] ?? '');
            $year = (int)($data['publication_year'] ?? 0);
            $pages = (int)($data['page_count'] ?? 0);
            $isbn = trim($data['isbn'] ?? '');
            $stock = (int)($data['stock'] ?? 1);
            $img = trim($data['img'] ?? '');
            $genre = trim($data['genre'] ?? 'Umum');

            if (
                $id <= 0 ||
                $title === '' ||
                $author === ''
            ) {
                response(false, 'Data buku tidak valid');
            }

            if (
                $stock < 1 ||
                $year < 0 ||
                $year > 9999 ||
                $pages < 0
            ) {
                response(
                    false,
                    'Stok, tahun, atau jumlah halaman tidak valid'
                );
            }

            $checkBook = $pdo->prepare(
                "SELECT id FROM books WHERE id = ?"
            );

            $checkBook->execute([$id]);

            if (!$checkBook->fetch()) {
                response(false, 'Buku tidak ditemukan');
            }

            $stmt = $pdo->prepare(
                "SELECT id FROM genres WHERE name = ?"
            );

            $stmt->execute([$genre]);

            $genreId = $stmt->fetchColumn();

            if (!$genreId) {

                $stmt = $pdo->prepare(
                    "INSERT INTO genres (name) VALUES (?)"
                );

                $stmt->execute([$genre]);

                $genreId = $pdo->lastInsertId();
            }

            $stmt = $pdo->prepare(
                "SELECT COUNT(*)
                 FROM loans
                 WHERE book_id = ?
                 AND status = 'Sedang dipinjam'"
            );

            $stmt->execute([$id]);

            $activeLoans = (int)$stmt->fetchColumn();

            if ($stock < $activeLoans) {
                response(
                    false,
                    'Stok tidak boleh lebih kecil dari jumlah buku yang sedang dipinjam'
                );
            }

            $stmt = $pdo->prepare(
                "UPDATE books SET
                    title = ?,
                    author = ?,
                    description = ?,
                    publisher = ?,
                    publication_year = ?,
                    page_count = ?,
                    isbn = ?,
                    stock = ?,
                    image_url = ?,
                    genre_id = ?
                 WHERE id = ?"
            );

            $stmt->execute([
                $title,
                $author,
                $description,
                $publisher,
                $year ?: null,
                $pages ?: null,
                $isbn,
                $stock,
                $img,
                $genreId,
                $id
            ]);

            response(true, 'Buku berhasil diperbarui');

            break;


        /* =====================================
           HAPUS BUKU
        ===================================== */

        case 'delete_book':

            requireAdmin();

            $data = inputData();

            $id = (int)($data['id'] ?? 0);

            if ($id <= 0) {
                response(false, 'ID buku tidak valid');
            }

            $check = $pdo->prepare(
                "SELECT id FROM loans
                 WHERE book_id = ?
                 LIMIT 1"
            );

            $check->execute([$id]);

            if ($check->fetch()) {
                response(
                    false,
                    'Buku memiliki riwayat peminjaman dan tidak dapat dihapus'
                );
            }

            $stmt = $pdo->prepare(
                "DELETE FROM books WHERE id = ?"
            );

            $stmt->execute([$id]);

            response(true, 'Buku berhasil dihapus');

            break;


        /* =====================================
           AMBIL GENRE
        ===================================== */

        case 'get_genres':

            $stmt = $pdo->query(
                "SELECT id, name
                 FROM genres
                 ORDER BY name"
            );

            response(
                true,
                'Genre berhasil diambil',
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            );

            break;


        /* =====================================
           TAMBAH GENRE
        ===================================== */

        case 'add_genre':

            requireAdmin();

            $data = inputData();

            $name = trim($data['name'] ?? '');

            if ($name === '') {
                response(false, 'Nama genre wajib diisi');
            }

            $stmt = $pdo->prepare(
                "SELECT id FROM genres
                 WHERE LOWER(name) = LOWER(?)"
            );

            $stmt->execute([$name]);

            if ($stmt->fetch()) {
                response(false, 'Genre sudah tersedia');
            }

            $stmt = $pdo->prepare(
                "INSERT INTO genres (name) VALUES (?)"
            );

            $stmt->execute([$name]);

            response(true, 'Genre berhasil ditambahkan');

            break;


        /* =====================================
           HAPUS GENRE
        ===================================== */

        case 'delete_genre':

            requireAdmin();

            $data = inputData();

            $id = (int)($data['id'] ?? 0);

            if ($id <= 0) {
                response(false, 'ID genre tidak valid');
            }

            $check = $pdo->prepare(
                "SELECT id FROM books
                 WHERE genre_id = ?
                 LIMIT 1"
            );

            $check->execute([$id]);

            if ($check->fetch()) {
                response(
                    false,
                    'Genre masih digunakan oleh buku'
                );
            }

            $stmt = $pdo->prepare(
                "DELETE FROM genres WHERE id = ?"
            );

            $stmt->execute([$id]);

            response(true, 'Genre berhasil dihapus');

            break;


        /* =====================================
           PINJAM BUKU
        ===================================== */

        case 'borrow':

            $user = requireLogin();

            $data = inputData();

            $bookId = (int)($data['book_id'] ?? 0);

            if ($bookId <= 0) {
                response(false, 'Buku tidak valid');
            }

            try {

                $pdo->beginTransaction();

                $checkBook = $pdo->prepare(
                    "SELECT id, stock
                     FROM books
                     WHERE id = ?
                     FOR UPDATE"
                );

                $checkBook->execute([$bookId]);

                $book = $checkBook->fetch(PDO::FETCH_ASSOC);

                if (!$book) {
                    $pdo->rollBack();

                    response(false, 'Buku tidak ditemukan');
                }

                $check = $pdo->prepare(
                    "SELECT id FROM loans
                     WHERE user_id = ?
                     AND book_id = ?
                     AND status = 'Sedang dipinjam'"
                );

                $check->execute([
                    $user['id'],
                    $bookId
                ]);

                if ($check->fetch()) {
                    $pdo->rollBack();

                    response(false, 'Buku ini masih kamu pinjam');
                }

                $count = $pdo->prepare(
                    "SELECT COUNT(*)
                     FROM loans
                     WHERE book_id = ?
                     AND status = 'Sedang dipinjam'"
                );

                $count->execute([$bookId]);

                $borrowed = (int)$count->fetchColumn();

                $available = (int)$book['stock'] - $borrowed;

                if ($available <= 0) {
                    $pdo->rollBack();

                    response(false, 'Maaf, stok buku sedang habis');
                }

                $stmt = $pdo->prepare(
                    "INSERT INTO loans
                     (user_id, book_id, status)
                     VALUES (?, ?, 'Sedang dipinjam')"
                );

                $stmt->execute([
                    $user['id'],
                    $bookId
                ]);

                $pdo->commit();

                response(true, 'Buku berhasil dipinjam');

            } catch (PDOException $e) {

                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }

                throw $e;
            }

            break;


        /* =====================================
           RIWAYAT PEMINJAMAN USER
        ===================================== */

        case 'get_loans':

            $user = requireLogin();

            if (($user['role'] ?? '') !== 'user') {
                response(
                    false,
                    'Riwayat ini khusus untuk pengguna'
                );
            }

            $sql = "
                SELECT
                    loans.id,
                    loans.user_id,
                    books.title,
                    books.author,
                    COALESCE(genres.name, 'Umum') AS genre,
                    loans.borrowed_at AS date,
                    loans.returned_at,
                    loans.status

                FROM loans

                INNER JOIN books
                    ON loans.book_id = books.id

                LEFT JOIN genres
                    ON books.genre_id = genres.id

                WHERE loans.user_id = ?

                ORDER BY loans.borrowed_at DESC
            ";

            $stmt = $pdo->prepare($sql);

            $stmt->execute([$user['id']]);

            response(
                true,
                'Riwayat peminjaman berhasil diambil',
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            );

            break;


        /* =====================================
           RIWAYAT SEMUA PEMINJAMAN ADMIN
        ===================================== */

        case 'get_all_loans':

            requireAdmin();

            $sql = "
                SELECT
                    loans.id,
                    users.name AS user_name,
                    users.email AS user_email,
                    books.title,
                    books.author,
                    COALESCE(genres.name, 'Umum') AS genre,
                    loans.borrowed_at AS date,
                    loans.returned_at,
                    loans.status

                FROM loans

                INNER JOIN users
                    ON loans.user_id = users.id

                INNER JOIN books
                    ON loans.book_id = books.id

                LEFT JOIN genres
                    ON books.genre_id = genres.id

                ORDER BY loans.borrowed_at DESC
            ";

            $stmt = $pdo->query($sql);

            response(
                true,
                'Semua riwayat peminjaman berhasil diambil',
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            );

            break;


        /* =====================================
           PENGEMBALIAN BUKU USER
        ===================================== */

        case 'return_book':

            $user = requireLogin();

            if (($user['role'] ?? '') !== 'user') {
                response(
                    false,
                    'Hanya pengguna yang dapat mengembalikan buku'
                );
            }

            $data = inputData();

            $loanId = (int)($data['loan_id'] ?? 0);

            if ($loanId <= 0) {
                response(
                    false,
                    'ID peminjaman tidak valid'
                );
            }

            $check = $pdo->prepare(
                "SELECT id, status
                 FROM loans
                 WHERE id = ?
                 AND user_id = ?"
            );

            $check->execute([
                $loanId,
                $user['id']
            ]);

            $loan = $check->fetch(PDO::FETCH_ASSOC);

            if (!$loan) {
                response(
                    false,
                    'Data peminjaman tidak ditemukan atau bukan milikmu'
                );
            }

            if ($loan['status'] !== 'Sedang dipinjam') {
                response(
                    false,
                    'Buku sudah dikembalikan sebelumnya'
                );
            }

            $stmt = $pdo->prepare(
                "UPDATE loans
                 SET status = 'Sudah dikembalikan',
                     returned_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                 AND user_id = ?
                 AND status = 'Sedang dipinjam'"
            );

            $stmt->execute([
                $loanId,
                $user['id']
            ]);

            if ($stmt->rowCount() === 0) {
                response(
                    false,
                    'Pengembalian gagal atau buku sudah dikembalikan'
                );
            }

            response(
                true,
                'Buku berhasil dikembalikan'
            );

            break;


        /* =====================================
           STATISTIK BERANDA (publik, hanya angka)
        ===================================== */

        case 'get_stats':

            $totalBooks = (int)$pdo->query(
                "SELECT COUNT(*) FROM books"
            )->fetchColumn();

            $totalUsers = (int)$pdo->query(
                "SELECT COUNT(*) FROM users WHERE role = 'user'"
            )->fetchColumn();

            $activeLoans = (int)$pdo->query(
                "SELECT COUNT(*) FROM loans
                 WHERE status = 'Sedang dipinjam'"
            )->fetchColumn();

            response(
                true,
                'Statistik berhasil diambil',
                [
                    'books' => $totalBooks,
                    'users' => $totalUsers,
                    'borrowed' => $activeLoans
                ]
            );

            break;


        /* =====================================
           AKSI TIDAK DITEMUKAN
        ===================================== */

        default:

            response(
                false,
                'Aksi API tidak ditemukan'
            );

            break;
    }

} catch (PDOException $e) {

    error_log($e->getMessage());

    response(
        false,
        'ERROR DATABASE: ' . $e->getMessage()
    );
}