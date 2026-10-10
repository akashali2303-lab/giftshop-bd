const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- Writing clean prisma/schema.prisma with .prisma/client output ---');

const schemaContent = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

generator serverClient {
  provider = "prisma-client-js"
  output   = "../server/node_modules/.prisma/client"
}

model AdminUser {
  id           String      @id @default(uuid())
  email        String      @unique
  name         String
  passwordHash String
  role         String      @default("MANAGER")
  isActive     Boolean     @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  statusLogs   OrderStatusHistory[]

  @@index([email])
}

model Category {
  id           String      @id @default(uuid())
  nameEn       String
  nameBn       String
  slug         String      @unique
  description  String?
  displayOrder Int         @default(0)
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  products     Product[]

  @@index([slug])
  @@index([isActive, displayOrder])
}

model Product {
  id                     String      @id @default(uuid())
  categoryId             String
  nameEn                 String
  nameBn                 String
  slug                   String      @unique
  descriptionEn          String?
  descriptionBn          String?
  basePricePaisa         Int
  featuredImage          String
  galleryImages          String?
  requiresCustomText     Boolean     @default(false)
  requiresArtworkUpload  Boolean     @default(false)
  customizationPromptEn  String?
  customizationPromptBn  String?
  isActive               Boolean     @default(true)
  createdAt              DateTime    @default(now())
  updatedAt              DateTime    @updatedAt

  category               Category    @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  orderItems             OrderItem[]

  @@index([categoryId])
  @@index([slug])
  @@index([isActive])
}

model Order {
  id                   String                 @id @default(uuid())
  orderNumber          String                 @unique
  customerName         String
  customerPhone        String
  deliveryAddress      String
  district             String
  deliveryInstructions String?
  
  subtotalPaisa        Int
  deliveryFeePaisa     Int
  discountPaisa        Int                    @default(0)
  totalAmountPaisa     Int
  currency             String                 @default("BDT")

  paymentMethod        String                 @default("COD")
  paymentStatus        String                 @default("UNPAID")
  fulfillmentStatus    String                 @default("PENDING")
  
  whatsappNotified     Boolean                @default(false)
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt

  items                OrderItem[]
  paymentTransactions  PaymentTransaction[]
  statusHistory        OrderStatusHistory[]

  @@index([orderNumber])
  @@index([customerPhone])
  @@index([fulfillmentStatus])
  @@index([paymentStatus])
  @@index([createdAt])
}

model OrderItem {
  id                   String        @id @default(uuid())
  orderId              String
  productId            String?
  productNameSnapshot  String
  unitPricePaisa       Int
  quantity             Int           @default(1)
  lineTotalPaisa       Int
  customText           String?
  designInstructions   String?

  order                Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product              Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)
  artworkFile          ArtworkFile?

  @@index([orderId])
  @@index([productId])
}

model ArtworkFile {
  id                   String        @id @default(uuid())
  orderItemId          String        @unique
  storageKey           String
  originalFilename     String
  mimeType             String
  fileSizeBytes        Int
  checksumSha256       String?
  createdAt            DateTime      @default(now())

  orderItem            OrderItem     @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([storageKey])
}

model PaymentTransaction {
  id                   String        @id @default(uuid())
  orderId              String
  paymentMethod        String
  amountPaisa          Int
  senderPhone          String?
  transactionReference String?
  adminNote            String?
  isVerified           Boolean       @default(false)
  verifiedAt           DateTime?
  createdAt            DateTime      @default(now())

  order                Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([transactionReference])
}

model OrderStatusHistory {
  id             String            @id @default(uuid())
  orderId        String
  previousStatus String
  newStatus      String
  note           String?
  actorId        String?
  createdAt      DateTime          @default(now())

  order          Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  actor          AdminUser?        @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([createdAt])
}
`;

fs.writeFileSync('prisma/schema.prisma', schemaContent.trim() + '\n', 'utf8');

console.log('--- Generating Prisma Client for Both Targets ---');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Both Prisma Client targets generated!           ');
console.log('==========================================================');
