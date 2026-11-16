-- Jalankan sekali di database `pawlibrary` (phpMyAdmin > SQL).
-- Catatan: api.php juga membuat kolom ini otomatis saat pertama kali dipanggil,
-- jadi file ini opsional.

ALTER TABLE `users`
  ADD COLUMN `phone` varchar(20) DEFAULT NULL AFTER `email`,
  ADD COLUMN `birth_date` date DEFAULT NULL AFTER `phone`,
  ADD COLUMN `gender` varchar(20) DEFAULT NULL AFTER `birth_date`,
  ADD COLUMN `address` varchar(255) DEFAULT NULL AFTER `gender`,
  ADD COLUMN `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD UNIQUE KEY `phone` (`phone`);
