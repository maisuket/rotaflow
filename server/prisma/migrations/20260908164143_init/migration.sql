-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "demand" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "depotLat" REAL NOT NULL,
    "depotLng" REAL NOT NULL,
    "capacity" INTEGER NOT NULL,
    "returnToDepot" BOOLEAN NOT NULL DEFAULT true,
    "originMode" TEXT NOT NULL DEFAULT 'depot'
);

-- CreateTable
CREATE TABLE "destination" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL
);
