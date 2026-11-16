-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 15, 2026 at 02:02 PM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pawlibrary`
--

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

CREATE TABLE `books` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(150) NOT NULL,
  `description` text,
  `publisher` varchar(150) DEFAULT NULL,
  `publication_year` int DEFAULT NULL,
  `page_count` int DEFAULT NULL,
  `isbn` varchar(30) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '1',
  `image_url` text,
  `genre_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `books`
--

INSERT INTO `books` (`id`, `title`, `author`, `description`, `publisher`, `publication_year`, `page_count`, `isbn`, `stock`, `image_url`, `genre_id`) VALUES
(1, 'Laskar Pelangi', 'Andrea Hirata', 'Kisah perjuangan anak-anak Belitung.', 'Bentang Pustaka', 2005, 529, '9789793062792', 5, '', 1),
(7, 'assa', 'asas', 'assa', 'asas', 2021, 12, '1', 1, '', 3),
(8, 'Matematika Dasar', 'Virgie', '', 'viurgi', 2012, 10, '12', 2, '', 6),
(9, 'Breaking Bad', 'Vince MCgilligan', 'Mr white membuat leraxa', 'Indonesxia', 2006, 256, '125634', 67, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR48DbZSXkajp98TFO6Tn_yGy1DAoqpHu1OgInOqzOA0A&s=10', 9);

-- --------------------------------------------------------

--
-- Table structure for table `buku`
--

CREATE TABLE `buku` (
  `id` int NOT NULL,
  `judul` varchar(255) NOT NULL,
  `penulis` varchar(150) NOT NULL,
  `penerbit` varchar(150) DEFAULT NULL,
  `tahun_terbit` year DEFAULT NULL,
  `kategori` varchar(100) DEFAULT NULL,
  `deskripsi` text,
  `cover` varchar(255) DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT '0.0',
  `isbn` varchar(30) DEFAULT NULL,
  `jumlah_halaman` int DEFAULT NULL,
  `bahasa` varchar(50) DEFAULT NULL,
  `berat` int DEFAULT NULL,
  `dimensi` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `genres`
--

CREATE TABLE `genres` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `genres`
--

INSERT INTO `genres` (`id`, `name`) VALUES
(3, 'Fantasi'),
(1, 'Fiksi'),
(5, 'Misteri'),
(2, 'Non-Fiksi'),
(6, 'Pendidikan'),
(4, 'Romance'),
(9, 'Sains'),
(7, 'Sejarah'),
(8, 'Teknologi'),
(10, 'Umum');

-- --------------------------------------------------------

--
-- Table structure for table `loans`
--

CREATE TABLE `loans` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `book_id` int NOT NULL,
  `borrowed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `returned_at` timestamp NULL DEFAULT NULL,
  `status` enum('Sedang dipinjam','Sudah dikembalikan') NOT NULL DEFAULT 'Sedang dipinjam'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `loans`
--

INSERT INTO `loans` (`id`, `user_id`, `book_id`, `borrowed_at`, `returned_at`, `status`) VALUES
(1, 2, 7, '2026-11-14 04:54:42', NULL, 'Sedang dipinjam'),
(2, 2, 8, '2026-11-14 06:48:21', NULL, 'Sedang dipinjam'),
(3, 2, 9, '2026-11-15 08:40:00', NULL, 'Sedang dipinjam');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `birth_date`, `gender`, `address`, `password_hash`, `role`, `created_at`) VALUES
(1, 'Admin', 'admin@admin.com', NULL, NULL, NULL, NULL, '$2y$10$f9/PXWIULphBeK2n99wcpuPVqX5LI5q0VnXOo1plW68dordZ2AMre', 'admin', '2026-11-15 13:46:40'),
(2, 'virgiaja', 'virgi123@gmail.com', NULL, NULL, NULL, NULL, '$2y$10$s.6yqASe63A8ShVUsiemNuQ6CaeuFsb2CJ7deNwj8DTwhUcK0Zkya', 'user', '2026-11-15 13:46:40'),
(3, 'Achmad Virgiansyah', 'igiaja@gmail.com', '088290320215', '2008-11-13', 'Laki-laki', 'Tangerang', '$2y$10$BGMMi4OG6h8v9KNgC90TneFwYLl1wAbsuqxFbEVDNGgr3Aaft6BFq', 'user', '2026-11-15 13:49:40');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_books_genres` (`genre_id`);

--
-- Indexes for table `buku`
--
ALTER TABLE `buku`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `genres`
--
ALTER TABLE `genres`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_loans_users` (`user_id`),
  ADD KEY `fk_loans_books` (`book_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `books`
--
ALTER TABLE `books`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `buku`
--
ALTER TABLE `buku`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `genres`
--
ALTER TABLE `genres`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `loans`
--
ALTER TABLE `loans`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `books`
--
ALTER TABLE `books`
  ADD CONSTRAINT `fk_books_genres` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `loans`
--
ALTER TABLE `loans`
  ADD CONSTRAINT `fk_loans_books` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_loans_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
