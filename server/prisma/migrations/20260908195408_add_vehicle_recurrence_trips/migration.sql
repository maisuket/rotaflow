-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trip_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT,
    "routeName" TEXT NOT NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehiclePlate" TEXT,
    "vehicleTypeLabel" TEXT,
    "depotLat" REAL NOT NULL,
    "depotLng" REAL NOT NULL,
    "destinationLat" REAL,
    "destinationLng" REAL,
    "destinationName" TEXT,
    "capacity" INTEGER NOT NULL,
    "totalDistanceMeters" REAL NOT NULL,
    "totalDurationSeconds" REAL NOT NULL,
    "estimatedCost" REAL,
    "mapsUrl" TEXT,
    CONSTRAINT "trip_routes_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trip_stops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripRouteId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "demand" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "etaSeconds" INTEGER,
    "boarded" BOOLEAN,
    CONSTRAINT "trip_stops_tripRouteId_fkey" FOREIGN KEY ("tripRouteId") REFERENCES "trip_routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "activeWeekdays" TEXT
);
INSERT INTO "new_routes" ("capacity", "depotLat", "depotLng", "id", "name", "originMode", "returnToDepot") SELECT "capacity", "depotLat", "depotLng", "id", "name", "originMode", "returnToDepot" FROM "routes";
DROP TABLE "routes";
ALTER TABLE "new_routes" RENAME TO "routes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
