-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 07, 2025 at 03:16 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `parking_management_db`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `calculate_parking_fee` (IN `p_session_id` INT, OUT `p_fee` DECIMAL(10,2))   BEGIN
    DECLARE v_entry_time DATETIME;
    DECLARE v_exit_time DATETIME;
    DECLARE v_type_id INT;
    DECLARE v_minutes INT;
    
    SELECT ps.entry_time, ps.exit_time, v.type_id
    INTO v_entry_time, v_exit_time, v_type_id
    FROM parking_sessions ps
    JOIN vehicles v ON ps.vehicle_id = v.id
    WHERE ps.id = p_session_id;
    
    SET v_minutes = TIMESTAMPDIFF(MINUTE, v_entry_time, v_exit_time);
    
    -- Fee calculation logic based on time bands
    IF v_minutes <= 30 THEN
        SELECT amount_lkr INTO p_fee FROM fee_schedules 
        WHERE type_id = v_type_id AND band_name = '0-30m';
    ELSEIF v_minutes <= 60 THEN
        SELECT amount_lkr INTO p_fee FROM fee_schedules 
        WHERE type_id = v_type_id AND band_name = '30m-1h';
    ELSEIF v_minutes <= 120 THEN
        SELECT amount_lkr INTO p_fee FROM fee_schedules 
        WHERE type_id = v_type_id AND band_name = '1-2h';
    ELSEIF v_minutes <= 180 THEN
        SELECT amount_lkr INTO p_fee FROM fee_schedules 
        WHERE type_id = v_type_id AND band_name = '2-3h';
    ELSEIF v_minutes <= 240 THEN
        SELECT amount_lkr INTO p_fee FROM fee_schedules 
        WHERE type_id = v_type_id AND band_name = '3-4h';
    ELSE
        SELECT amount_lkr INTO p_fee FROM fee_schedules 
        WHERE type_id = v_type_id AND band_name = '4+h';
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `details` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_schedules`
--

CREATE TABLE `fee_schedules` (
  `id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `band_name` varchar(30) NOT NULL COMMENT 'e.g., 0-30m, 30m-1h, 1-2h',
  `amount_lkr` decimal(10,2) NOT NULL,
  `is_free_band` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fee_schedules`
--

INSERT INTO `fee_schedules` (`id`, `type_id`, `band_name`, `amount_lkr`, `is_free_band`, `created_at`, `updated_at`) VALUES
(19, 1, '0 to 30min', 0.00, 1, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(20, 1, '30min - 1hr', 50.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(21, 1, '1 - 2 hr', 100.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(22, 1, '2 - 6 hr', 150.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(23, 1, '6 - 12 hr', 200.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(24, 1, '12 - 24 hr', 500.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(25, 1, '24 hr +', 500.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(26, 2, '0 to 30min', 0.00, 1, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(27, 2, '30min - 1hr', 20.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(28, 2, '1 - 2 hr', 40.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(29, 2, '2 - 6 hr', 50.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(30, 2, '6 - 12 hr', 80.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(31, 2, '12 - 24 hr', 150.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(32, 2, '24 hr +', 150.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(33, 3, '0 to 30min', 0.00, 1, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(34, 3, '30min - 1hr', 100.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(35, 3, '1 - 2 hr', 200.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(36, 3, '2 - 6 hr', 300.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(37, 3, '6 - 12 hr', 450.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(38, 3, '12 - 24 hr', 800.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(39, 3, '24 hr +', 800.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(40, 4, '0 to 30min', 0.00, 1, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(41, 4, '30min - 1hr', 70.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(42, 4, '1 - 2 hr', 120.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(43, 4, '2 - 6 hr', 240.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(44, 4, '6 - 12 hr', 360.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(45, 4, '12 - 24 hr', 600.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35'),
(46, 4, '24 hr +', 600.00, 0, '2025-12-06 03:39:35', '2025-12-06 03:39:35');

-- --------------------------------------------------------

--
-- Table structure for table `mobile_bookings`
--

CREATE TABLE `mobile_bookings` (
  `id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `spot_id` int(11) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `is_checked_in` tinyint(1) DEFAULT 0,
  `checked_in_at` timestamp NULL DEFAULT NULL,
  `is_cancelled` tinyint(1) DEFAULT 0,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` varchar(50) DEFAULT NULL COMMENT 'auto-cancelled, manual, expired',
  `qr_code_data` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mobile_bookings`
--

INSERT INTO `mobile_bookings` (`id`, `user_id`, `vehicle_id`, `spot_id`, `start_time`, `expires_at`, `is_checked_in`, `checked_in_at`, `is_cancelled`, `cancelled_at`, `cancellation_reason`, `qr_code_data`, `created_at`, `updated_at`) VALUES
('BK1765082762427', 2, 9, 1, '2025-12-07 04:48:55', '2025-12-06 23:31:02', 1, '2025-12-07 04:48:55', 0, NULL, NULL, 'BOOKING-BK1765082762427-CAV 8537-A-001', '2025-12-06 23:16:02', '2025-12-06 23:18:55'),
('BK1765083071019', 2, 9, 1, '2025-12-07 04:53:47', '2025-12-06 23:36:11', 0, NULL, 1, '2025-12-07 04:53:47', 'expired', 'BOOKING-BK1765083071019-CAV 8537-A-001', '2025-12-06 23:21:11', '2025-12-06 23:23:47'),
('BK1765083478704', 2, 9, 1, '2025-12-07 04:58:30', '2025-12-06 23:42:58', 1, '2025-12-07 04:58:30', 0, NULL, NULL, 'BOOKING-BK1765083478704-CAV 8537-A-001', '2025-12-06 23:27:58', '2025-12-06 23:28:30'),
('BK1765083848976', 2, 9, 1, '2025-12-07 05:09:48', '2025-12-06 23:49:08', 1, '2025-12-07 05:09:48', 0, NULL, NULL, 'BOOKING-BK1765083848976-CAV 8537-A-001', '2025-12-06 23:34:09', '2025-12-06 23:39:48'),
('BK1765084402679', 2, 9, 1, '2025-12-07 05:14:33', '2025-12-06 23:58:22', 1, '2025-12-07 05:14:33', 0, NULL, NULL, 'BOOKING-BK1765084402679-CAV 8537-A-001', '2025-12-06 23:43:22', '2025-12-06 23:44:33'),
('BK1765085531685', 2, 5, 1, '2025-12-07 05:33:46', '2025-12-07 00:17:11', 1, '2025-12-07 05:33:46', 0, NULL, NULL, 'BOOKING-BK1765085531685-CAC 6570-A-001', '2025-12-07 00:02:11', '2025-12-07 00:03:46'),
('BK1765089203780', 2, 9, 1, '2025-12-07 06:35:36', '2025-12-07 01:18:22', 1, '2025-12-07 06:35:36', 0, NULL, NULL, 'BOOKING-BK1765089203780-CAV 8537-A-001', '2025-12-07 01:03:23', '2025-12-07 01:05:36'),
('BK1765089538320', 2, 5, 2, '2025-12-07 06:39:23', '2025-12-07 01:23:57', 0, NULL, 1, '2025-12-07 06:39:23', 'manual', 'BOOKING-BK1765089538320-CAC 6570-A-002', '2025-12-07 01:08:58', '2025-12-07 01:09:23'),
('BK1765090901533', 2, 5, 2, '2025-12-07 07:02:47', '2025-12-07 01:46:40', 1, '2025-12-07 07:02:47', 0, NULL, NULL, 'BOOKING-BK1765090901533-CAC 6570-A-002', '2025-12-07 01:31:41', '2025-12-07 01:32:47');

-- --------------------------------------------------------

--
-- Table structure for table `mobile_users`
--

CREATE TABLE `mobile_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mobile_users`
--

INSERT INTO `mobile_users` (`id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'testuser', 'test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqXwVVZ.V6', 'Test User', '+1234567890', 1, '2025-12-06 05:49:36', '2025-12-06 05:49:36'),
(2, 'rasindu1', 'abc123@gmail.com', '$2b$12$DUTJX108MawPHEGi4AP7a.6NVNDQ6BCw6gSdm9dL5HxxFxzIdLe26', 'rasindu perera', '0709862456', 1, '2025-12-06 03:29:33', '2025-12-06 03:29:33');

-- --------------------------------------------------------

--
-- Table structure for table `parking_sessions`
--

CREATE TABLE `parking_sessions` (
  `id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `spot_id` int(11) NOT NULL,
  `entry_time` datetime NOT NULL,
  `exit_time` datetime DEFAULT NULL,
  `entry_source` varchar(20) DEFAULT NULL COMMENT 'camera, manual, rfid',
  `exit_source` varchar(20) DEFAULT NULL COMMENT 'camera, manual, rfid',
  `qr_token` varchar(64) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active' COMMENT 'active, closed',
  `calculated_fee_lkr` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(20) DEFAULT NULL COMMENT 'cash, rfid',
  `payment_status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parking_sessions`
--

INSERT INTO `parking_sessions` (`id`, `vehicle_id`, `spot_id`, `entry_time`, `exit_time`, `entry_source`, `exit_source`, `qr_token`, `status`, `calculated_fee_lkr`, `payment_method`, `payment_status`, `created_at`, `updated_at`) VALUES
(1, 2, 1, '2025-12-05 15:01:10', '2025-12-05 15:02:39', 'camera', NULL, 'd0ouPAYRz_mqu57KUzsImuTtxikpplGQ', 'closed', 0.00, 'cash', 'paid', '2025-12-05 15:01:11', '2025-12-05 15:02:39'),
(2, 2, 1, '2025-12-05 15:12:15', '2025-12-05 15:14:27', 'camera', NULL, 'mIu71k4n--tmzt7ZVOOF9-aLzXY0UJjp', 'closed', 0.00, 'cash', 'paid', '2025-12-05 15:12:15', '2025-12-05 15:14:27'),
(3, 1, 6, '2025-12-05 15:15:38', '2025-12-05 15:27:34', 'camera', NULL, 'dLOGCP3VImapkCFDCsYxK_TbTT363QSO', 'closed', 0.00, 'rfid', 'paid', '2025-12-05 15:15:38', '2025-12-05 15:27:34'),
(4, 2, 1, '2025-12-05 15:39:38', '2025-12-05 15:45:28', 'camera', NULL, 'YPU9g7fzzZr7FXYocPWZ58u1PS8m5M3M', 'closed', 0.00, 'card', 'paid', '2025-12-05 15:39:38', '2025-12-05 15:45:28'),
(5, 2, 1, '2025-12-05 16:01:06', '2025-12-06 03:44:21', 'camera', NULL, 'B_HSef9BgzgWU1VHRXuz-ktHjPErQpb3', 'closed', 200.00, 'card', 'paid', '2025-12-05 16:01:06', '2025-12-06 03:44:21'),
(6, 3, 2, '2025-12-05 16:01:59', '2025-12-06 04:36:41', 'camera', NULL, 'DJ5vQ3Q6L8cF1luy99klgeFDRWz-rkAk', 'closed', 0.00, 'rfid', 'paid', '2025-12-05 16:01:59', '2025-12-06 04:36:41'),
(7, 4, 3, '2025-12-06 03:29:33', '2025-12-07 06:59:53', 'camera', NULL, 'HzPAiEhTMzxBtjP1j3nBCZwpK6Z7tdNf', 'closed', 500.00, 'card', 'paid', '2025-12-06 03:29:33', '2025-12-07 06:59:53'),
(8, 2, 1, '2025-12-06 03:57:18', '2025-12-06 13:00:38', 'camera', NULL, 'HFiWa0vfesHqHpqP0OjRE8AdjCoRicpM', 'closed', 200.00, 'cash', 'paid', '2025-12-06 03:57:18', '2025-12-06 13:00:38'),
(9, 3, 2, '2025-12-06 06:58:22', '2025-12-06 07:00:31', 'camera', NULL, 'C8WqrHw7BuPwrBFjHCtP7sihA_ayFOcQ', 'closed', 0.00, 'cash', 'paid', '2025-12-06 06:58:22', '2025-12-06 07:00:31'),
(10, 7, 4, '2025-12-06 10:05:39', '2025-12-06 10:13:16', 'camera', NULL, 'a3xM2ae96XKgGh104MkaWA7pcaVH9PA2', 'closed', 0.00, 'cash', 'paid', '2025-12-06 10:05:39', '2025-12-06 10:13:16'),
(11, 3, 4, '2025-12-06 10:20:38', '2025-12-06 10:22:10', 'camera', NULL, 'zPY7w3sbD3O-wAjpcFDNLmh9x2JK2m1T', 'closed', 0.00, 'cash', 'paid', '2025-12-06 10:20:38', '2025-12-06 10:22:10'),
(12, 3, 2, '2025-12-06 11:18:24', '2025-12-06 11:36:37', 'camera', NULL, 'G-fksQveyeyPhYdZQg1JFuQyXFH-IH2-', 'closed', 0.00, 'cash', 'paid', '2025-12-06 11:18:24', '2025-12-06 11:36:37'),
(13, 3, 4, '2025-12-06 11:38:38', '2025-12-06 11:52:46', 'camera', NULL, 'M4ueJBF0guBxultqyhJioZCEFyZFQh4C', 'closed', 0.00, 'card', 'paid', '2025-12-06 11:38:38', '2025-12-06 11:52:46'),
(14, 3, 2, '2025-12-06 11:54:19', '2025-12-06 12:06:16', 'camera', NULL, 'hP4KllXvA_d-v-k_Pcq79io_5tRyh7MI', 'closed', 0.00, 'cash', 'paid', '2025-12-06 11:54:19', '2025-12-06 12:06:16'),
(15, 3, 2, '2025-12-06 12:10:22', '2025-12-06 12:22:59', 'camera', NULL, 'wW4Wvq2a3Vfc0vZBv0-zYZFYk_BDEKYT', 'closed', 0.00, 'cash', 'paid', '2025-12-06 12:10:22', '2025-12-06 12:22:59'),
(16, 3, 2, '2025-12-06 12:24:22', '2025-12-06 12:36:22', 'camera', NULL, 'cbY9lfMKxIwOBN5Uske8Z_YHO6hdfwse', 'closed', 0.00, 'cash', 'paid', '2025-12-06 12:24:22', '2025-12-06 12:36:22'),
(17, 3, 2, '2025-12-06 12:37:27', '2025-12-06 12:39:47', 'camera', NULL, 'TSoQU1OKn64eKL6Zx91vCeV5a9kag2il', 'closed', 0.00, 'card', 'paid', '2025-12-06 12:37:27', '2025-12-06 12:39:47'),
(18, 3, 2, '2025-12-06 12:40:42', '2025-12-06 12:57:39', 'camera', NULL, 'Nce8dcu72N_Fpuipt-r_vgkEeMfq3lPp', 'closed', 0.00, 'cash', 'paid', '2025-12-06 12:40:42', '2025-12-06 12:57:39'),
(19, 3, 1, '2025-12-06 13:02:01', '2025-12-07 03:54:59', 'camera', NULL, '_cCg8LqRl6ejs6aQGobAtH1i8d6sCdB5', 'closed', 500.00, 'card', 'paid', '2025-12-06 13:02:01', '2025-12-07 03:54:59'),
(20, 2, 2, '2025-12-06 13:38:24', '2025-12-06 13:47:51', 'camera', NULL, '4dUyB0hyQpIEF5o02m6DXQ_Bauv-xoKh', 'closed', 0.00, 'cash', 'paid', '2025-12-06 13:38:24', '2025-12-06 13:47:51'),
(21, 8, 2, '2025-12-06 13:49:39', '2025-12-06 13:52:20', 'camera', NULL, 'v2Sv6YxefQGZxTOXdFzmp-mUVQqWIzY8', 'closed', 0.00, 'cash', 'paid', '2025-12-06 13:49:39', '2025-12-06 13:52:20'),
(22, 2, 2, '2025-12-06 13:54:19', '2025-12-06 13:58:36', 'camera', NULL, 'cJiVSLTSyoZBDFqmh3spvYVbBhz8gvhR', 'closed', 0.00, 'cash', 'paid', '2025-12-06 13:54:19', '2025-12-06 13:58:36'),
(23, 9, 2, '2025-12-06 14:00:27', '2025-12-06 14:08:35', 'camera', NULL, 'guyunk4srlqMcu_aBRpG6-S-_LuAMJNI', 'closed', 0.00, 'cash', 'paid', '2025-12-06 14:00:27', '2025-12-06 14:08:35'),
(24, 2, 2, '2025-12-06 14:10:08', '2025-12-06 14:40:24', 'camera', NULL, 'ylvJOIHVKWvMCrMbhOimwYPcnWxlneaT', 'closed', 50.00, 'cash', 'paid', '2025-12-06 14:10:08', '2025-12-06 14:40:24'),
(25, 2, 2, '2025-12-06 14:43:03', '2025-12-06 14:48:56', 'camera', NULL, 'jY8sfg0pzHeQoCFgK0Y5tTLmNskO1SXL', 'closed', 0.00, 'cash', 'paid', '2025-12-06 14:43:03', '2025-12-06 14:48:56'),
(26, 2, 2, '2025-12-06 14:50:38', '2025-12-06 15:05:57', 'camera', NULL, 'LKXsfj1FfePozhpgmWKIz5eMbjV1QxnB', 'closed', 0.00, 'cash', 'paid', '2025-12-06 14:50:38', '2025-12-06 15:05:57'),
(27, 2, 2, '2025-12-06 15:17:09', '2025-12-06 15:29:07', 'camera', NULL, 'gRmrB_xxCp7ueNQ-nD6gTfKRjiClh0T3', 'closed', 0.00, 'cash', 'paid', '2025-12-06 15:17:09', '2025-12-06 15:29:07'),
(28, 2, 2, '2025-12-06 15:34:50', '2025-12-06 15:46:39', 'camera', NULL, '8V5B1rsgVCTnNLJ30J313rmPS-CpR2_j', 'closed', 0.00, 'cash', 'paid', '2025-12-06 15:34:50', '2025-12-06 15:46:39'),
(29, 2, 2, '2025-12-06 15:56:33', '2025-12-07 02:42:36', 'camera', NULL, 'AHu_HfxjxKtCICM36S7mXditWB_k9OpY', 'closed', 200.00, 'cash', 'paid', '2025-12-06 15:56:33', '2025-12-07 02:42:36'),
(30, 10, 6, '2025-12-07 02:40:54', '2025-12-07 06:58:29', 'camera', NULL, 'E2jUMlHqo8sxDSFa3Wuh8kbGV0psAJwz', 'closed', 50.00, 'cash', 'paid', '2025-12-07 02:40:54', '2025-12-07 06:58:29'),
(31, 2, 2, '2025-12-07 02:44:48', '2025-12-07 03:09:35', 'camera', NULL, '8UamCenpiqF4kAkB9CbpdE7jAnIf0TUe', 'closed', 0.00, 'cash', 'paid', '2025-12-07 02:44:48', '2025-12-07 03:09:35'),
(32, 2, 2, '2025-12-07 03:12:03', '2025-12-07 03:30:42', 'camera', NULL, 'cwA1sx14AJA-L3b4dG78KdLc2JkJ5uoC', 'closed', 0.00, 'cash', 'paid', '2025-12-07 03:12:03', '2025-12-07 03:30:42'),
(33, 9, 1, '2025-12-07 09:45:01', '2025-12-07 04:20:07', NULL, NULL, NULL, 'closed', 500.00, 'cash', 'paid', '2025-12-07 04:15:02', '2025-12-07 04:20:07'),
(34, 9, 1, '2025-12-07 09:51:23', '2025-12-07 04:23:07', NULL, NULL, NULL, 'closed', 500.00, 'card', 'paid', '2025-12-07 04:21:23', '2025-12-07 04:23:07'),
(35, 2, 1, '2025-12-07 04:23:33', '2025-12-07 04:24:15', 'camera', NULL, 'bu0ta1VE2rqoeihnvE_CY9PfHpLXYiDO', 'closed', 0.00, 'cash', 'paid', '2025-12-07 04:23:33', '2025-12-07 04:24:15'),
(36, 2, 1, '2025-12-07 04:27:20', '2025-12-07 04:32:54', 'camera', NULL, 'EuGYF6INPQePg22wqQR-1UPfKUfAsDVC', 'closed', 0.00, 'cash', 'paid', '2025-12-07 04:27:20', '2025-12-07 04:32:54'),
(37, 2, 1, '2025-12-07 04:48:55', '2025-12-07 04:49:56', 'camera', NULL, 'DUu9_PZM4AD0z2E6h4qCYiUah_JoKcZv', 'closed', 0.00, 'cash', 'paid', '2025-12-07 04:48:55', '2025-12-07 04:49:56'),
(38, 9, 1, '2025-12-07 10:28:30', '2025-12-07 04:59:46', NULL, NULL, NULL, 'closed', 500.00, 'cash', 'paid', '2025-12-07 04:58:30', '2025-12-07 04:59:46'),
(39, 9, 1, '2025-12-07 05:09:48', '2025-12-07 05:10:52', 'camera', NULL, 'R3l519jpTOX3C6qMs9nlZKVA3d_nbGxj', 'closed', 0.00, 'cash', 'paid', '2025-12-07 05:09:48', '2025-12-07 05:10:52'),
(40, 2, 1, '2025-12-07 05:14:33', '2025-12-07 05:16:18', 'camera', NULL, 'SslWeE1beSOesJ4f2Yc4zk0VwJrKCcUJ', 'closed', 0.00, 'card', 'paid', '2025-12-07 05:14:33', '2025-12-07 05:16:18'),
(41, 3, 1, '2025-12-07 05:33:46', '2025-12-07 05:34:54', 'camera', NULL, 'bPcFZ3OGc7sGxN_-QN5FnH36yl5xA4dI', 'closed', 0.00, 'card', 'paid', '2025-12-07 05:33:46', '2025-12-07 05:34:54'),
(42, 2, 1, '2025-12-07 06:35:36', NULL, 'camera', NULL, 's_hYu0l3F_11Zmg38eCSTWvelvATYbiJ', 'active', NULL, NULL, NULL, '2025-12-07 06:35:36', '2025-12-07 06:35:36'),
(43, 10, 6, '2025-12-07 07:00:51', NULL, 'camera', NULL, 'UR9dE7l847LPP01MJC_N9T641nz4pmRA', 'active', NULL, NULL, NULL, '2025-12-07 07:00:51', '2025-12-07 07:00:51'),
(44, 3, 2, '2025-12-07 07:02:47', NULL, 'camera', NULL, '4hVUJrwgQO5x9drAJuApPfKlaa6WLAMS', 'active', NULL, NULL, NULL, '2025-12-07 07:02:47', '2025-12-07 07:02:47');

--
-- Triggers `parking_sessions`
--
DELIMITER $$
CREATE TRIGGER `after_session_insert` AFTER INSERT ON `parking_sessions` FOR EACH ROW BEGIN
    UPDATE parking_spots 
    SET is_occupied = TRUE 
    WHERE id = NEW.spot_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_session_update` AFTER UPDATE ON `parking_sessions` FOR EACH ROW BEGIN
    IF NEW.status = 'closed' AND OLD.status = 'active' THEN
        UPDATE parking_spots 
        SET is_occupied = FALSE 
        WHERE id = NEW.spot_id;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `parking_spots`
--

CREATE TABLE `parking_spots` (
  `id` int(11) NOT NULL,
  `label` varchar(20) NOT NULL,
  `type_id` int(11) NOT NULL,
  `is_occupied` tinyint(1) DEFAULT 0,
  `booking` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 if spot is reserved for mobile booking, 0 otherwise',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `booking_expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parking_spots`
--

INSERT INTO `parking_spots` (`id`, `label`, `type_id`, `is_occupied`, `booking`, `created_at`, `updated_at`, `booking_expires_at`) VALUES
(1, 'A-001', 1, 1, 0, '2025-12-05 13:33:19', '2025-12-07 06:35:36', NULL),
(2, 'A-002', 1, 1, 0, '2025-12-05 13:33:19', '2025-12-07 07:02:47', NULL),
(3, 'A-003', 1, 0, 0, '2025-12-05 13:33:19', '2025-12-07 06:59:53', NULL),
(4, 'A-004', 1, 0, 0, '2025-12-05 13:33:19', '2025-12-06 11:52:46', NULL),
(5, 'A-005', 1, 0, 0, '2025-12-05 13:33:19', '2025-12-05 13:33:19', NULL),
(6, 'B-001', 2, 1, 0, '2025-12-05 13:33:19', '2025-12-07 07:00:51', NULL),
(7, 'B-002', 2, 0, 0, '2025-12-05 13:33:19', '2025-12-05 13:33:19', NULL),
(8, 'B-003', 2, 0, 0, '2025-12-05 13:33:19', '2025-12-05 13:33:19', NULL),
(9, 'C-001', 3, 0, 0, '2025-12-05 13:33:19', '2025-12-05 13:33:19', NULL),
(10, 'C-002', 3, 0, 0, '2025-12-05 13:33:19', '2025-12-05 13:33:19', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `method` varchar(20) NOT NULL COMMENT 'cash, rfid',
  `amount_lkr` decimal(10,2) NOT NULL,
  `timestamp` datetime NOT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `session_id`, `method`, `amount_lkr`, `timestamp`, `cashier_id`, `created_at`) VALUES
(1, 1, 'cash', 0.00, '2025-12-05 15:02:39', 2, '2025-12-05 15:02:39'),
(2, 2, 'cash', 0.00, '2025-12-05 15:14:27', 1, '2025-12-05 15:14:27'),
(3, 3, 'rfid', 0.00, '2025-12-05 15:27:34', NULL, '2025-12-05 15:27:34'),
(4, 4, 'card', 0.00, '2025-12-05 15:45:28', 2, '2025-12-05 15:45:28'),
(5, 5, 'card', 200.00, '2025-12-06 03:44:21', 2, '2025-12-06 03:44:21'),
(6, 6, 'rfid', 0.00, '2025-12-06 04:36:41', NULL, '2025-12-06 04:36:41'),
(7, 9, 'cash', 0.00, '2025-12-06 07:00:31', 2, '2025-12-06 07:00:31'),
(8, 10, 'cash', 0.00, '2025-12-06 10:13:16', 2, '2025-12-06 10:13:16'),
(9, 11, 'cash', 0.00, '2025-12-06 10:22:10', 2, '2025-12-06 10:22:10'),
(10, 12, 'cash', 0.00, '2025-12-06 11:36:37', 2, '2025-12-06 11:36:37'),
(11, 13, 'card', 0.00, '2025-12-06 11:52:46', 2, '2025-12-06 11:52:46'),
(12, 14, 'cash', 0.00, '2025-12-06 12:06:16', 2, '2025-12-06 12:06:16'),
(13, 15, 'cash', 0.00, '2025-12-06 12:22:59', 2, '2025-12-06 12:22:59'),
(14, 16, 'cash', 0.00, '2025-12-06 12:36:22', 2, '2025-12-06 12:36:22'),
(15, 17, 'card', 0.00, '2025-12-06 12:39:47', 2, '2025-12-06 12:39:47'),
(16, 18, 'cash', 0.00, '2025-12-06 12:57:39', 2, '2025-12-06 12:57:39'),
(17, 8, 'cash', 200.00, '2025-12-06 13:00:38', 2, '2025-12-06 13:00:38'),
(18, 20, 'cash', 0.00, '2025-12-06 13:47:51', 2, '2025-12-06 13:47:51'),
(19, 21, 'cash', 0.00, '2025-12-06 13:52:20', 2, '2025-12-06 13:52:20'),
(20, 22, 'cash', 0.00, '2025-12-06 13:58:36', 2, '2025-12-06 13:58:36'),
(21, 23, 'cash', 0.00, '2025-12-06 14:08:35', 2, '2025-12-06 14:08:35'),
(22, 24, 'cash', 50.00, '2025-12-06 14:40:24', 2, '2025-12-06 14:40:24'),
(23, 25, 'cash', 0.00, '2025-12-06 14:48:56', 2, '2025-12-06 14:48:56'),
(24, 26, 'cash', 0.00, '2025-12-06 15:05:57', 2, '2025-12-06 15:05:57'),
(25, 27, 'cash', 0.00, '2025-12-06 15:29:07', 2, '2025-12-06 15:29:07'),
(26, 28, 'cash', 0.00, '2025-12-06 15:46:39', 2, '2025-12-06 15:46:39'),
(27, 29, 'cash', 200.00, '2025-12-07 02:42:36', 2, '2025-12-07 02:42:36'),
(28, 31, 'cash', 0.00, '2025-12-07 03:09:35', 2, '2025-12-07 03:09:35'),
(29, 32, 'cash', 0.00, '2025-12-07 03:30:42', 2, '2025-12-07 03:30:42'),
(30, 19, 'card', 500.00, '2025-12-07 03:54:59', 2, '2025-12-07 03:54:59'),
(31, 33, 'cash', 500.00, '2025-12-07 04:20:07', 2, '2025-12-07 04:20:07'),
(32, 34, 'card', 500.00, '2025-12-07 04:23:07', 2, '2025-12-07 04:23:07'),
(33, 35, 'cash', 0.00, '2025-12-07 04:24:15', 2, '2025-12-07 04:24:15'),
(34, 36, 'cash', 0.00, '2025-12-07 04:32:54', 2, '2025-12-07 04:32:54'),
(35, 37, 'cash', 0.00, '2025-12-07 04:49:56', 2, '2025-12-07 04:49:56'),
(36, 38, 'cash', 500.00, '2025-12-07 04:59:46', 2, '2025-12-07 04:59:46'),
(37, 39, 'cash', 0.00, '2025-12-07 05:10:52', 2, '2025-12-07 05:10:52'),
(38, 40, 'card', 0.00, '2025-12-07 05:16:18', 2, '2025-12-07 05:16:18'),
(39, 41, 'card', 0.00, '2025-12-07 05:34:54', 2, '2025-12-07 05:34:54'),
(40, 30, 'cash', 50.00, '2025-12-07 06:58:29', 2, '2025-12-07 06:58:29'),
(41, 7, 'card', 500.00, '2025-12-07 06:59:53', 2, '2025-12-07 06:59:53');

-- --------------------------------------------------------

--
-- Table structure for table `rfid_accounts`
--

CREATE TABLE `rfid_accounts` (
  `id` int(11) NOT NULL,
  `rfid_number` varchar(64) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `national_id` varchar(50) NOT NULL,
  `valid_from` datetime NOT NULL,
  `valid_to` datetime NOT NULL,
  `monthly_payment` decimal(10,2) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rfid_accounts`
--

INSERT INTO `rfid_accounts` (`id`, `rfid_number`, `full_name`, `contact_number`, `email`, `national_id`, `valid_from`, `valid_to`, `monthly_payment`, `status`, `created_at`, `updated_at`) VALUES
(1, 'RFID-45125740705', 'Rasindu pravishka perera', '0766804571', 'seller2@signet.com', '200226700978', '2025-12-05 00:00:00', '2026-01-04 00:00:00', 15000.00, 1, '2025-12-05 09:03:03', '2025-12-05 14:47:27');

-- --------------------------------------------------------

--
-- Table structure for table `rfid_vehicles`
--

CREATE TABLE `rfid_vehicles` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `added_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rfid_vehicles`
--

INSERT INTO `rfid_vehicles` (`id`, `account_id`, `vehicle_id`, `is_active`, `added_date`) VALUES
(1, 1, 1, 1, '2025-12-05 09:03:03'),
(3, 1, 3, 1, '2025-12-05 23:06:02');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL COMMENT 'Controller, Accountant, or Admin',
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `status`, `created_at`) VALUES
(1, 'admin', '$2b$12$cjO.noVnVj8smc8VvKWnvu201YV.F2pt02mfR11iBIq5/VOi7e..6', 'Admin', 1, '2025-12-05 13:33:19'),
(2, 'controller', '$2b$12$lctyKPvlLcvyxdThnpJlduNd4NrzYM7UFyc5FA2IcuFuN6ph9PURq', 'Controller', 1, '2025-12-05 13:33:19'),
(3, 'accountant', '$2b$12$Dfik4F3kqWiRqM4LxXkvquyNv4WM5R/tLfrBd0j/5s3UWzHC/Y2rK', 'Accountant', 1, '2025-12-05 13:33:19'),
(4, 'rfid_registrar', '$2b$12$VrrwYO8fjrtc0DwqInSvdOhRvCaSdtk3nH7hb2rKrLQ0rUUdLZ2gi', 'RFID_Registrar', 1, '2025-12-05 13:59:46'),
(5, 'rasindu', '$2b$12$TrTq2h.o4uo5sZeQFGnRuO2Ag9L6Meznp0Jk9z1Z82JiMLv.oo6XG', 'Mobile_User', 1, '2025-12-06 08:45:19');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `plate_number` varchar(20) NOT NULL,
  `type_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `plate_number`, `type_id`, `created_at`) VALUES
(1, 'BEN 1367', 2, '2025-12-05 14:33:03'),
(2, 'CAV-8537', 1, '2025-12-05 15:01:10'),
(3, 'CAC-6570', 1, '2025-12-05 16:01:59'),
(4, 'CBJ-1595', 1, '2025-12-06 03:29:33'),
(5, 'CAC 6570', 1, '2025-12-06 04:34:09'),
(6, 'BEN 1000', 2, '2025-12-06 09:13:05'),
(7, 'CAC-6576', 1, '2025-12-06 10:05:39'),
(8, 'CAV-0537', 1, '2025-12-06 13:49:39'),
(9, 'CAV 8537', 1, '2025-12-06 14:00:27'),
(10, 'BIW-5388', 2, '2025-12-07 02:40:54');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_types`
--

CREATE TABLE `vehicle_types` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicle_types`
--

INSERT INTO `vehicle_types` (`id`, `code`, `name`, `is_active`, `created_at`) VALUES
(1, 'CAR', 'Car', 1, '2025-12-05 13:33:19'),
(2, 'BIKE', 'Motorbike', 1, '2025-12-05 13:33:19'),
(3, 'HEAVY', 'Heavy Vehicle', 1, '2025-12-05 13:33:19'),
(4, 'VAN', 'Van', 1, '2025-12-05 13:33:19');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_active_sessions`
-- (See below for the actual view)
--
CREATE TABLE `v_active_sessions` (
`session_id` int(11)
,`plate_number` varchar(20)
,`vehicle_type` varchar(50)
,`spot_label` varchar(20)
,`entry_time` datetime
,`status` varchar(20)
,`duration_minutes` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_daily_revenue`
-- (See below for the actual view)
--
CREATE TABLE `v_daily_revenue` (
`payment_date` date
,`payment_method` varchar(20)
,`transaction_count` bigint(21)
,`total_amount` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_rfid_account_vehicles`
-- (See below for the actual view)
--
CREATE TABLE `v_rfid_account_vehicles` (
`account_id` int(11)
,`rfid_number` varchar(64)
,`full_name` varchar(100)
,`email` varchar(100)
,`plate_number` varchar(20)
,`vehicle_type` varchar(50)
,`vehicle_active` tinyint(1)
,`account_active` tinyint(1)
,`valid_from` datetime
,`valid_to` datetime
);

-- --------------------------------------------------------

--
-- Structure for view `v_active_sessions`
--
DROP TABLE IF EXISTS `v_active_sessions`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_active_sessions`  AS SELECT `ps`.`id` AS `session_id`, `v`.`plate_number` AS `plate_number`, `vt`.`name` AS `vehicle_type`, `spot`.`label` AS `spot_label`, `ps`.`entry_time` AS `entry_time`, `ps`.`status` AS `status`, timestampdiff(MINUTE,`ps`.`entry_time`,current_timestamp()) AS `duration_minutes` FROM (((`parking_sessions` `ps` join `vehicles` `v` on(`ps`.`vehicle_id` = `v`.`id`)) join `vehicle_types` `vt` on(`v`.`type_id` = `vt`.`id`)) join `parking_spots` `spot` on(`ps`.`spot_id` = `spot`.`id`)) WHERE `ps`.`status` = 'active' ;

-- --------------------------------------------------------

--
-- Structure for view `v_daily_revenue`
--
DROP TABLE IF EXISTS `v_daily_revenue`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_daily_revenue`  AS SELECT cast(`p`.`timestamp` as date) AS `payment_date`, `p`.`method` AS `payment_method`, count(`p`.`id`) AS `transaction_count`, sum(`p`.`amount_lkr`) AS `total_amount` FROM `payments` AS `p` GROUP BY cast(`p`.`timestamp` as date), `p`.`method` ;

-- --------------------------------------------------------

--
-- Structure for view `v_rfid_account_vehicles`
--
DROP TABLE IF EXISTS `v_rfid_account_vehicles`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_rfid_account_vehicles`  AS SELECT `ra`.`id` AS `account_id`, `ra`.`rfid_number` AS `rfid_number`, `ra`.`full_name` AS `full_name`, `ra`.`email` AS `email`, `v`.`plate_number` AS `plate_number`, `vt`.`name` AS `vehicle_type`, `rv`.`is_active` AS `vehicle_active`, `ra`.`status` AS `account_active`, `ra`.`valid_from` AS `valid_from`, `ra`.`valid_to` AS `valid_to` FROM (((`rfid_accounts` `ra` join `rfid_vehicles` `rv` on(`ra`.`id` = `rv`.`account_id`)) join `vehicles` `v` on(`rv`.`vehicle_id` = `v`.`id`)) join `vehicle_types` `vt` on(`v`.`type_id` = `vt`.`id`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_actor` (`actor_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `fee_schedules`
--
ALTER TABLE `fee_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type_band` (`type_id`,`band_name`);

--
-- Indexes for table `mobile_bookings`
--
ALTER TABLE `mobile_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_spot_id` (`spot_id`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_is_cancelled` (`is_cancelled`),
  ADD KEY `idx_is_checked_in` (`is_checked_in`);

--
-- Indexes for table `mobile_users`
--
ALTER TABLE `mobile_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `parking_sessions`
--
ALTER TABLE `parking_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `qr_token` (`qr_token`),
  ADD KEY `idx_vehicle` (`vehicle_id`),
  ADD KEY `idx_spot` (`spot_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_entry_time` (`entry_time`),
  ADD KEY `idx_exit_time` (`exit_time`),
  ADD KEY `idx_payment` (`payment_method`,`payment_status`);

--
-- Indexes for table `parking_spots`
--
ALTER TABLE `parking_spots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `label` (`label`),
  ADD KEY `idx_label` (`label`),
  ADD KEY `idx_type` (`type_id`),
  ADD KEY `idx_occupied` (`is_occupied`),
  ADD KEY `idx_type_occupied` (`type_id`,`is_occupied`),
  ADD KEY `idx_booking` (`booking`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session` (`session_id`),
  ADD KEY `idx_method` (`method`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_cashier` (`cashier_id`);

--
-- Indexes for table `rfid_accounts`
--
ALTER TABLE `rfid_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rfid_number` (`rfid_number`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_rfid` (`rfid_number`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_validity` (`valid_from`,`valid_to`);

--
-- Indexes for table `rfid_vehicles`
--
ALTER TABLE `rfid_vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_account_vehicle` (`account_id`,`vehicle_id`),
  ADD KEY `idx_account` (`account_id`),
  ADD KEY `idx_vehicle` (`vehicle_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `plate_number` (`plate_number`),
  ADD KEY `idx_plate` (`plate_number`),
  ADD KEY `idx_type` (`type_id`),
  ADD KEY `idx_plate_number` (`plate_number`);

--
-- Indexes for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_code` (`code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fee_schedules`
--
ALTER TABLE `fee_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `mobile_users`
--
ALTER TABLE `mobile_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `parking_sessions`
--
ALTER TABLE `parking_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `parking_spots`
--
ALTER TABLE `parking_spots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `rfid_accounts`
--
ALTER TABLE `rfid_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `rfid_vehicles`
--
ALTER TABLE `rfid_vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `fee_schedules`
--
ALTER TABLE `fee_schedules`
  ADD CONSTRAINT `fee_schedules_ibfk_1` FOREIGN KEY (`type_id`) REFERENCES `vehicle_types` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `mobile_bookings`
--
ALTER TABLE `mobile_bookings`
  ADD CONSTRAINT `mobile_bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `mobile_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mobile_bookings_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mobile_bookings_ibfk_3` FOREIGN KEY (`spot_id`) REFERENCES `parking_spots` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `parking_sessions`
--
ALTER TABLE `parking_sessions`
  ADD CONSTRAINT `parking_sessions_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  ADD CONSTRAINT `parking_sessions_ibfk_2` FOREIGN KEY (`spot_id`) REFERENCES `parking_spots` (`id`);

--
-- Constraints for table `parking_spots`
--
ALTER TABLE `parking_spots`
  ADD CONSTRAINT `parking_spots_ibfk_1` FOREIGN KEY (`type_id`) REFERENCES `vehicle_types` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `parking_sessions` (`id`),
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `rfid_vehicles`
--
ALTER TABLE `rfid_vehicles`
  ADD CONSTRAINT `rfid_vehicles_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `rfid_accounts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rfid_vehicles_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`type_id`) REFERENCES `vehicle_types` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
