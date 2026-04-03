-- Default PIN 1234 (bcrypt); only rows missing adminPin (e.g. pre-existing venues).
UPDATE "Venue"
SET "adminPin" = '$2b$10$wHOcbcvgc96wjWlETtFJw.CC2jt9leY7FA2d95ixEhtjBDTIn6kwy'
WHERE "adminPin" IS NULL;
