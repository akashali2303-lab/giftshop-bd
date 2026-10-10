# GiftShop BD - Architecture & System Specifications

## 1. Storage Architecture
- Customer artwork uploaded via checkout is stored privately under `storage/uploads/`.
- Direct web access to `storage/` is strictly disabled. Files are served via authenticated streaming endpoints.

## 2. Currency Representation
- All currency values are stored as 32-bit integers in **BDT Paisa** (1 BDT = 100 Paisa).
- Example: ৳150.00 is stored as `15000`.

## 3. Unguessable Order Identifiers
- Public order IDs follow: `GBD-YYYYMMDD-[4 RANDOM HEX BYTES]`.
