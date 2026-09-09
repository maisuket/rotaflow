-- CreateTable
CREATE TABLE "distance_cache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "distanceMeters" REAL NOT NULL,
    "durationSeconds" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "directions_cache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "encodedPolyline" TEXT NOT NULL,
    "legsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "geocode_cache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "found" BOOLEAN NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "formattedAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
