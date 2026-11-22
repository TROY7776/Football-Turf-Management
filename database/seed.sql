-- ====================================================================
-- Football Turf Management System - SQLite Sample Seed Data
-- Database File: database/turf.db
-- Pre-loaded records for demonstration, testing, and presentation
-- ====================================================================

-- 1. Insert Sample Managers
-- Password for all sample managers is: manager123
INSERT INTO MANAGER (manager_id, name, email, password_hash) VALUES
(1, 'Head Manager', 'manager@turf.com', '$2b$10$Mq6Sf8vWGW6aMyqW8oQMW.pZU2GFaGSGCmMFLLqcvFC.mBT0Ke6Em'),
(2, 'Alex Silva (Operations)', 'admin@turf.com', '$2b$10$Mq6Sf8vWGW6aMyqW8oQMW.pZU2GFaGSGCmMFLLqcvFC.mBT0Ke6Em');

-- 2. Insert Sample Customers
-- Password for all sample customers is: customer123
INSERT INTO CUSTOMER (customer_id, name, email, phone, password_hash) VALUES
(1, 'Demo Customer', 'demo@example.com', '9812345678', '$2b$10$4UufflYjtUI31QVQu8fcA.ICKXLaWa.8pDMn2gen1qgm7MWaXft7K'),
(2, 'Jayden Fernandes', 'jayden@example.com', '9898765432', '$2b$10$4UufflYjtUI31QVQu8fcA.ICKXLaWa.8pDMn2gen1qgm7MWaXft7K'),
(3, 'Gavin Fernandes', 'gavin@example.com', '9865432109', '$2b$10$4UufflYjtUI31QVQu8fcA.ICKXLaWa.8pDMn2gen1qgm7MWaXft7K'),
(4, 'Rahul Sharma', 'rahul@example.com', '9823456789', '$2b$10$4UufflYjtUI31QVQu8fcA.ICKXLaWa.8pDMn2gen1qgm7MWaXft7K'),
(5, 'John Doe', 'john@example.com', '9876543210', '$2b$10$4UufflYjtUI31QVQu8fcA.ICKXLaWa.8pDMn2gen1qgm7MWaXft7K');

-- 3. Insert Football Turfs
INSERT INTO TURF (turf_id, turf_name, location, price, description, image_url) VALUES
(1, 'Champions Arena', 'Margao Sports Complex, South Goa', 1200.00, 'FIFA-approved artificial turf ideal for 5-a-side and 6-a-side matches. Equipped with high-power LED floodlights, changing rooms, and spectator seating.', '/assets/images/champions-arena.svg'),
(2, 'Wembley Turf Park', 'Panaji Waterfront, North Goa', 1500.00, 'Premium 7-a-side natural feel monofilament synthetic grass turf. Includes tournament scoreboard, bibs, standard match balls, and mineral water supply.', '/assets/images/wembley-turf.svg'),
(3, 'KickOff Sports Ground', 'Fatorda Stadium Road, Margao', 1000.00, 'Budget-friendly all-weather turf suitable for 5-a-side quick matches and youth football training. High perimeter netting and secure parking.', '/assets/images/kickoff-ground.svg'),
(4, 'Premier Football Hub', 'Vasco Bay View, Vasco da Gama', 1800.00, 'Spacious 9-a-side championship standard turf with premium shock pads, professional goalposts, locker facilities, and shaded team dugouts.', '/assets/images/premier-hub.svg'),
(5, 'Green Valley Arena', 'Mapusa Hillside, Mapusa', 1100.00, 'Scenic enclosed turf facility with pro-grade non-abrasive turf infill, night floodlights, and refreshment lounge. Great for friendly evening fixtures.', '/assets/images/greenvalley.svg');

-- 4. Insert Sample Bookings
INSERT INTO BOOKING (booking_id, customer_id, turf_id, booking_date, booking_time, duration, status, total_amount) VALUES
(1, 1, 1, '2026-11-22', '18:00:00', 2, 'CONFIRMED', 2400.00),
(2, 2, 2, '2026-11-22', '19:00:00', 1, 'CONFIRMED', 1500.00),
(3, 3, 3, '2026-11-23', '17:00:00', 2, 'CONFIRMED', 2000.00),
(4, 4, 1, '2026-11-23', '20:00:00', 1, 'CONFIRMED', 1200.00),
(5, 5, 4, '2026-11-24', '18:00:00', 2, 'CONFIRMED', 3600.00),
(6, 1, 2, '2026-11-20', '16:00:00', 1, 'COMPLETED', 1500.00),
(7, 2, 5, '2026-11-20', '18:00:00', 2, 'COMPLETED', 2200.00),
(8, 3, 1, '2026-11-21', '19:00:00', 1, 'COMPLETED', 1200.00);

-- 5. Insert Corresponding Payments
INSERT INTO PAYMENT (payment_id, booking_id, amount, payment_status, payment_date) VALUES
(1, 1, 2400.00, 'PAID', '2026-11-21 10:15:00'),
(2, 2, 1500.00, 'PAID', '2026-11-21 11:30:00'),
(3, 3, 2000.00, 'PAID', '2026-11-21 14:00:00'),
(4, 4, 1200.00, 'PAID', '2026-11-21 15:45:00'),
(5, 5, 3600.00, 'PAID', '2026-11-21 16:20:00'),
(6, 6, 1500.00, 'PAID', '2026-11-20 15:30:00'),
(7, 7, 2200.00, 'PAID', '2026-11-20 17:00:00'),
(8, 8, 1200.00, 'PAID', '2026-11-21 18:00:00');
