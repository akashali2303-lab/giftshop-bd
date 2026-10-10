import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for GiftShop BD ---');

  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@giftshop.com.bd';
  const plainPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPass123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
      role: 'SUPER_ADMIN'
    },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });
  console.log(`[Seed] Administrator created: ${admin.email}`);

  const categoriesData = [
    {
      nameEn: 'Eid Salami Cards',
      nameBn: 'ঈদ সালামি কার্ড',
      slug: 'eid-salami-cards',
      description: 'Personalized greeting cards and gift envelopes for Eid celebrations.',
      displayOrder: 1
    },
    {
      nameEn: 'Custom Photo Chocolate Wrappers',
      nameBn: 'কাস্টম ছবিযুক্ত চকলেট র‍্যাপার',
      slug: 'custom-photo-chocolate-wrappers',
      description: 'Personalized chocolate wrapping prints for birthdays, anniversaries, and corporate events.',
      displayOrder: 2
    },
    {
      nameEn: "Kids' Drawing Books",
      nameBn: 'শিশুদের ড্রয়িং বুক',
      slug: 'kids-drawing-books',
      description: 'Customized sketchbooks and coloring pads featuring child name and custom cover artwork.',
      displayOrder: 3
    },
    {
      nameEn: 'Local Business QR Stands and Menus',
      nameBn: 'QR কোড স্ট্যান্ড এবং রেস্তোরাঁ মেনু',
      slug: 'qr-stands-and-menus',
      description: 'Acrylic and laminated payment QR stands and table menus for local retail and restaurants.',
      displayOrder: 4
    },
    {
      nameEn: 'Photo Albums (Spiral & Screw Bound)',
      nameBn: 'ফটো অ্যালবাম (স্পাইরাল ও স্ক্রু বাউন্ড)',
      slug: 'spiral-screw-photo-albums',
      description: 'Hardcover memory photo albums with durable binding and premium sheets.',
      displayOrder: 5
    },
    {
      nameEn: 'Laminated Budget Frames',
      nameBn: 'লেমিনেটেড বাজেট ফ্রেম',
      slug: 'laminated-budget-frames',
      description: 'Affordable, elegant wall and desk photo frames with protective lamination.',
      displayOrder: 6
    },
    {
      nameEn: 'Wish Cards and Gift Tags',
      nameBn: 'উইশ কার্ড এবং গিফট ট্যাগ',
      slug: 'wish-cards-gift-tags',
      description: 'Festive mini wish cards and customized die-cut gift hang tags.',
      displayOrder: 7
    }
  ];

  const seededCategories: Record<string, string> = {};

  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        nameEn: cat.nameEn,
        nameBn: cat.nameBn,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true
      },
      create: {
        nameEn: cat.nameEn,
        nameBn: cat.nameBn,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true
      }
    });
    seededCategories[cat.slug] = record.id;
  }
  console.log('[Seed] 7 Core Categories seeded.');

  const sampleProducts = [
    {
      slug: 'classic-eid-mubarak-envelope-card',
      nameEn: 'Classic Eid Mubarak Envelope Card (Pack of 5)',
      nameBn: 'ক্লাসিক ঈদ মোবারক খাম কার্ড (৫ প্যাক)',
      categorySlug: 'eid-salami-cards',
      basePricePaisa: 15000,
      featuredImage: '/images/demo/eid-card-pack.jpg',
      requiresCustomText: true,
      requiresArtworkUpload: false,
      customizationPromptEn: 'Enter sender or family name to print on the card',
      customizationPromptBn: 'কার্ডে মুদ্রণ করার জন্য প্রেরক বা পরিবারের নাম লিখুন'
    },
    {
      slug: 'personalized-birthday-chocolate-wrapper-kit',
      nameEn: 'Personalized Photo Chocolate Wrapper Kit (10 Pcs)',
      nameBn: 'ছবিযুক্ত চকলেট র‍্যাপার কিট (১০ পিস)',
      categorySlug: 'custom-photo-chocolate-wrappers',
      basePricePaisa: 25000,
      featuredImage: '/images/demo/chocolate-wrapper.jpg',
      requiresCustomText: true,
      requiresArtworkUpload: true,
      customizationPromptEn: 'Upload clear face photo and enter greeting message',
      customizationPromptBn: 'পরিষ্কার মুখের ছবি আপলোড করুন এবং শুভেচ্ছা বার্তা লিখুন'
    },
    {
      slug: 'kids-creative-art-sketchbook-40p',
      nameEn: 'Kids Creative Art Sketchbook (A4, 40 Pages)',
      nameBn: 'শিশুদের ক্রিয়েটিভ আর্ট স্কেচবুক (এ৪, ৪০ পৃষ্ঠা)',
      categorySlug: 'kids-drawing-books',
      basePricePaisa: 18000,
      featuredImage: '/images/demo/sketchbook.jpg',
      requiresCustomText: true,
      requiresArtworkUpload: true,
      customizationPromptEn: "Enter child's full name and upload a cover character picture if desired",
      customizationPromptBn: 'সন্তানের নাম লিখুন এবং কভারের জন্য পছন্দের ছবি আপলোড করুন'
    },
    {
      slug: 'acrylic-bkash-nagad-qr-stand-a6',
      nameEn: 'Counter Acrylic QR Payment Stand (A6 Size)',
      nameBn: 'কাউন্টার এক্রিলিক কিউআর পেমেন্ট স্ট্যান্ড (এ৬ সাইজ)',
      categorySlug: 'qr-stands-and-menus',
      basePricePaisa: 32000,
      featuredImage: '/images/demo/qr-stand.jpg',
      requiresCustomText: true,
      requiresArtworkUpload: true,
      customizationPromptEn: 'Upload your official bKash/Nagad merchant QR code image and business name',
      customizationPromptBn: 'বিকাশ/নগদ কিউআর কোডের ছবি আপলোড করুন এবং প্রতিষ্ঠানের নাম লিখুন'
    },
    {
      slug: 'screw-bound-hardcover-wedding-album-24p',
      nameEn: 'Screw-Bound Hardcover Memory Album (8x10 inch, 24 Sheets)',
      nameBn: 'স্ক্রু বাউন্ড হার্ডকভার মেমোরি অ্যালবাম (৮x১০ ইঞ্চি, ২৪ পাতা)',
      categorySlug: 'spiral-screw-photo-albums',
      basePricePaisa: 115000,
      featuredImage: '/images/demo/screw-album.jpg',
      requiresCustomText: true,
      requiresArtworkUpload: true,
      customizationPromptEn: 'Enter title/anniversary date and upload cover portrait photo',
      customizationPromptBn: 'অ্যালবামের নাম/তারিখ লিখুন এবং মূল কভার ছবি আপলোড করুন'
    },
    {
      slug: 'budget-matte-laminated-wall-frame-10x12',
      nameEn: 'Matte Laminated Lightweight Wall Frame (10x12 inch)',
      nameBn: 'ম্যাট লেমিনেটেড লাইটওয়েট ওয়াল ফ্রেম (১০x১২ ইঞ্চি)',
      categorySlug: 'laminated-budget-frames',
      basePricePaisa: 42000,
      featuredImage: '/images/demo/wall-frame.jpg',
      requiresCustomText: false,
      requiresArtworkUpload: true,
      customizationPromptEn: 'Upload high-resolution photo',
      customizationPromptBn: 'উচ্চ রেজোলিউশনের ছবি আপলোড করুন'
    },
    {
      slug: 'festive-custom-gift-tags-pack-of-20',
      nameEn: 'Customized Die-Cut Gift Hang Tags (Pack of 20)',
      nameBn: 'কাস্টমাইজড ডাই-কাট গিফট ট্যাগ (২০ প্যাক)',
      categorySlug: 'wish-cards-gift-tags',
      basePricePaisa: 12000,
      featuredImage: '/images/demo/gift-tags.jpg',
      requiresCustomText: true,
      requiresArtworkUpload: false,
      customizationPromptEn: 'Enter business branding text or family greeting line',
      customizationPromptBn: 'ব্র্যান্ড নাম অথবা শুভেচ্ছা বার্তা লিখুন'
    }
  ];

  for (const prod of sampleProducts) {
    const catId = seededCategories[prod.categorySlug];
    if (!catId) continue;

    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        nameEn: prod.nameEn,
        nameBn: prod.nameBn,
        categoryId: catId,
        basePricePaisa: prod.basePricePaisa,
        featuredImage: prod.featuredImage,
        requiresCustomText: prod.requiresCustomText,
        requiresArtworkUpload: prod.requiresArtworkUpload,
        customizationPromptEn: prod.customizationPromptEn,
        customizationPromptBn: prod.customizationPromptBn,
        isActive: true
      },
      create: {
        slug: prod.slug,
        nameEn: prod.nameEn,
        nameBn: prod.nameBn,
        categoryId: catId,
        basePricePaisa: prod.basePricePaisa,
        featuredImage: prod.featuredImage,
        requiresCustomText: prod.requiresCustomText,
        requiresArtworkUpload: prod.requiresArtworkUpload,
        customizationPromptEn: prod.customizationPromptEn,
        customizationPromptBn: prod.customizationPromptBn,
        isActive: true
      }
    });
  }

  console.log('[Seed] Realistic demonstration products seeded across all 7 categories.');
  console.log('--- Phase 1 Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
