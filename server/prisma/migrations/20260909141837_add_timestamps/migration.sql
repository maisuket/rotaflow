/*
  Warnings:

  - Added the required column `updatedAt` to the `locations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `routes` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "demand" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_locations" ("demand", "id", "lat", "lng", "name") SELECT "demand", "id", "lat", "lng", "name" FROM "locations";
DROP TABLE "locations";
ALTER TABLE "new_locations" RENAME TO "locations";
CREATE TABLE "new_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "depotLat" REAL NOT NULL,
    "depotLng" REAL NOT NULL,
    "capacity" INTEGER NOT NULL,
    "returnToDepot" BOOLEAN NOT NULL DEFAULT true,
    "originMode" TEXT NOT NULL DEFAULT 'depot',
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehiclePlate" TEXT,
    "vehicleTypeLabel" TEXT,
    "speedFactor" REAL NOT NULL DEFAULT 1,
    "costPerKm" REAL NOT NULL DEFAULT 0,
    "activeWeekdays" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_routes" ("activeWeekdays", "capacity", "costPerKm", "depotLat", "depotLng", "driverName", "driverPhone", "id", "name", "originMode", "returnToDepot", "speedFactor", "vehiclePlate", "vehicleTypeLabel") SELECT "activeWeekdays", "capacity", "costPerKm", "depotLat", "depotLng", "driverName", "driverPhone", "id", "name", "originMode", "returnToDepot", "speedFactor", "vehiclePlate", "vehicleTypeLabel" FROM "routes";
DROP TABLE "routes";
ALTER TABLE "new_routes" RENAME TO "routes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
