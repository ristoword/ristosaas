-- Performance indexes for frequently queried tables

-- Customer: tenant-scoped listings and email lookups
CREATE INDEX IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- HotelReservation: front-desk date range filters and status filters
CREATE INDEX IF NOT EXISTS "HotelReservation_tenantId_checkInDate_idx" ON "HotelReservation"("tenantId", "checkInDate");
CREATE INDEX IF NOT EXISTS "HotelReservation_tenantId_status_idx" ON "HotelReservation"("tenantId", "status");

-- Booking: date-ordered listings per tenant
CREATE INDEX IF NOT EXISTS "Booking_tenantId_date_idx" ON "Booking"("tenantId", "date");

-- MenuItem: active menu lookups and code-based searches
CREATE INDEX IF NOT EXISTS "MenuItem_tenantId_active_idx" ON "MenuItem"("tenantId", "active");
CREATE INDEX IF NOT EXISTS "MenuItem_tenantId_code_idx" ON "MenuItem"("tenantId", "code");
