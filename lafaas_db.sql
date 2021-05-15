-- MySQL dump 10.13  Distrib 8.0.24, for macos11 (x86_64)
--
-- Host: lafaas-db-do-user-8735555-0.b.db.ondigitalocean.com    Database: defaultdb
-- ------------------------------------------------------
-- Server version	8.0.20

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '42ee683d-740e-11eb-acf8-c2a6a3acd9d3:1-2718';

--
-- Table structure for table `Claims`
--

DROP TABLE IF EXISTS `Claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Claims` (
  `item_id` int NOT NULL,
  `pid` int DEFAULT NULL,
  `national_id` varchar(13) DEFAULT NULL,
  `tel` varchar(10) DEFAULT NULL,
  `fingerprint` varchar(1000) DEFAULT NULL,
  `date_claimed` date DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `pid` (`pid`),
  CONSTRAINT `Claims_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `Items_found` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `Claims_ibfk_2` FOREIGN KEY (`pid`) REFERENCES `Persons` (`pid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Claims`
--

LOCK TABLES `Claims` WRITE;
/*!40000 ALTER TABLE `Claims` DISABLE KEYS */;
/*!40000 ALTER TABLE `Claims` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Items_found`
--

DROP TABLE IF EXISTS `Items_found`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Items_found` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(30) NOT NULL,
  `location_lat` decimal(17,15) NOT NULL,
  `location_long` decimal(18,15) NOT NULL,
  `location_desc` varchar(30) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `type` int DEFAULT NULL,
  `image_url` varchar(2048) NOT NULL,
  `device_token` varchar(50) DEFAULT NULL,
  `category` varchar(20) NOT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Items_found`
--

LOCK TABLES `Items_found` WRITE;
/*!40000 ALTER TABLE `Items_found` DISABLE KEYS */;
/*!40000 ALTER TABLE `Items_found` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Items_found_color`
--

DROP TABLE IF EXISTS `Items_found_color`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Items_found_color` (
  `item_id` int NOT NULL,
  `color` varchar(20) NOT NULL,
  PRIMARY KEY (`item_id`,`color`),
  CONSTRAINT `Items_found_color_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `Items_found` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Items_found_color`
--

LOCK TABLES `Items_found_color` WRITE;
/*!40000 ALTER TABLE `Items_found_color` DISABLE KEYS */;
/*!40000 ALTER TABLE `Items_found_color` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Items_lost`
--

DROP TABLE IF EXISTS `Items_lost`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Items_lost` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(30) NOT NULL,
  `location_lat` decimal(17,15) NOT NULL,
  `location_long` decimal(18,15) NOT NULL,
  `location_desc` varchar(30) DEFAULT NULL,
  `description` varchar(50) DEFAULT NULL,
  `category` varchar(20) NOT NULL,
  `type` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Items_lost`
--

LOCK TABLES `Items_lost` WRITE;
/*!40000 ALTER TABLE `Items_lost` DISABLE KEYS */;
/*!40000 ALTER TABLE `Items_lost` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Items_lost_color`
--

DROP TABLE IF EXISTS `Items_lost_color`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Items_lost_color` (
  `item_id` int NOT NULL,
  `color` varchar(20) NOT NULL,
  PRIMARY KEY (`item_id`,`color`),
  CONSTRAINT `Items_lost_color_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `Items_lost` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Items_lost_color`
--

LOCK TABLES `Items_lost_color` WRITE;
/*!40000 ALTER TABLE `Items_lost_color` DISABLE KEYS */;
/*!40000 ALTER TABLE `Items_lost_color` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Lockers`
--

DROP TABLE IF EXISTS `Lockers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Lockers` (
  `module_id` varchar(10) NOT NULL,
  `vacancy` tinyint(1) DEFAULT NULL,
  `module_lat` decimal(18,15) DEFAULT NULL,
  `module_long` decimal(18,15) DEFAULT NULL,
  PRIMARY KEY (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Lockers`
--

LOCK TABLES `Lockers` WRITE;
/*!40000 ALTER TABLE `Lockers` DISABLE KEYS */;
INSERT INTO `Lockers` VALUES ('ENG101',0,13.736937754871574,100.533157924366850),('ENG102',0,13.736937754871574,100.533157924366850),('ENG103',0,13.736937754871574,100.533157924366850),('ENG104',0,13.736937754871574,100.533157924366850);
/*!40000 ALTER TABLE `Lockers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Loses`
--

DROP TABLE IF EXISTS `Loses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Loses` (
  `pid` int DEFAULT NULL,
  `item_id` int NOT NULL,
  `date_added` date DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `pid` (`pid`),
  CONSTRAINT `Loses_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `Items_lost` (`item_id`),
  CONSTRAINT `Loses_ibfk_3` FOREIGN KEY (`pid`) REFERENCES `Persons` (`pid`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Loses`
--

LOCK TABLES `Loses` WRITE;
/*!40000 ALTER TABLE `Loses` DISABLE KEYS */;
/*!40000 ALTER TABLE `Loses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Persons`
--

DROP TABLE IF EXISTS `Persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Persons` (
  `pid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(15) NOT NULL,
  `password` varchar(15) NOT NULL,
  `email` varchar(30) NOT NULL,
  `f_name` varchar(20) NOT NULL,
  `l_name` varchar(20) NOT NULL,
  `noti_token` varchar(25) NOT NULL,
  PRIMARY KEY (`pid`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Persons`
--

LOCK TABLES `Persons` WRITE;
/*!40000 ALTER TABLE `Persons` DISABLE KEYS */;
/*!40000 ALTER TABLE `Persons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Reports`
--

DROP TABLE IF EXISTS `Reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reports` (
  `item_id` int NOT NULL,
  `pid` int NOT NULL,
  `message` varchar(256) DEFAULT NULL,
  `date_reported` date NOT NULL,
  `evidence_url` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`item_id`,`pid`),
  KEY `pid` (`pid`),
  CONSTRAINT `Reports_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `Items_found` (`item_id`),
  CONSTRAINT `Reports_ibfk_2` FOREIGN KEY (`pid`) REFERENCES `Persons` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Reports`
--

LOCK TABLES `Reports` WRITE;
/*!40000 ALTER TABLE `Reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `Reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Stores`
--

DROP TABLE IF EXISTS `Stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Stores` (
  `item_id` int NOT NULL,
  `module_id` varchar(10) DEFAULT NULL,
  `date_added` date NOT NULL,
  `current_location` varchar(30) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `module_id` (`module_id`),
  CONSTRAINT `Stores_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `Items_found` (`item_id`),
  CONSTRAINT `Stores_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `Lockers` (`module_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Stores`
--

LOCK TABLES `Stores` WRITE;
/*!40000 ALTER TABLE `Stores` DISABLE KEYS */;
/*!40000 ALTER TABLE `Stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'defaultdb'
--
/*!50003 DROP PROCEDURE IF EXISTS `reset_db` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER="doadmin"@"%" PROCEDURE "reset_db"()
BEGIN
	DELETE FRom Reports;
    DELETE From Claims;
    DELETE FROM Stores;
    DELETE FROM Loses;
    DELETE FROM Items_found_color;
    DELETE FROM Items_found;
    DELETE FROM Items_lost_color;
    DELETE FROM Items_lost;
    UPDATE Lockers SET vacancy = 0;
    DELETE FROM Persons;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-05-16  1:07:04
