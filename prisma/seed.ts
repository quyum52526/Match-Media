import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedBillingCatalog } from "./seedCatalog";

const prisma = new PrismaClient();

// All seeded users share the dev password "password123" (bcrypt-hashed).
const PW = bcrypt.hashSync("password123", 10);

/** Approx date of birth for a given whole-year age (anchored mid-year). */
function dob(age: number): Date {
  return new Date(2026 - age, 5, 1);
}

const blurredImage = {
  create: [
    {
      privacy: "BLURRED" as const,
      originalKey: "seed/original.jpg",
      blurredKey: "seed/blurred.jpg",
      isPrimary: true,
    },
  ],
};

async function main() {
  // --- AppSettings (single row) ---
  const existingSettings = await prisma.appSettings.findFirst();
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: { visibilityFloorPercent: 30 },
    });
  }

  // --- Billing catalog (plans + promo coupons) — idempotent upserts ---
  await seedBillingCatalog(prisma);

  // --- Clean slate (FK-safe order) ---
  await prisma.interest.deleteMany();
  await prisma.photoAccessRequest.deleteMany();
  await prisma.profileViewLog.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.wardDetails.deleteMany();
  await prisma.profileImage.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // --- Current viewer (no profile; acts as the logged-in user) ---
  await prisma.user.create({
    data: {
      id: "me",
      email: "me@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801700000000",
      isMobileVerified: true,
      isPro: false, // free tier — upgrade via the Pro flow to open the gate
    },
  });

  // --- Admin (moderation / verification / reports dashboard) ---
  await prisma.user.create({
    data: {
      id: "admin",
      email: "admin@matchmedia.com.bd",
      passwordHash: PW,
      role: "ADMIN",
      isMobileVerified: true,
    },
  });

  // --- Browse/detail profiles (ids match the previous mock) ---
  await prisma.user.create({
    data: {
      id: "demo",
      email: "aysha@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801712345678",
      isMobileVerified: true,
      isPro: true,
      profile: {
        create: {
          fullName: "আয়েশা সিদ্দিকা",
          nameHidden: true,
          gender: "Female",
          dateOfBirth: dob(26),
          district: "Dhaka",
          upazila: "Savar",
          profession: "IT/Software",
          education: "Engineering",
          maritalStatus: "Single",
          bio: "পরিবারকেন্দ্রিক, ধর্মীয় মূল্যবোধে বিশ্বাসী একজন মানুষ। অবসরে বই পড়তে ও ভ্রমণ করতে ভালোবাসি। জীবনসঙ্গী হিসেবে সৎ, দায়িত্বশীল ও পারস্পরিক শ্রদ্ধাবোধসম্পন্ন কাউকে খুঁজছি।",
          height: "5'4\"",
          weight: "55 kg",
          childrenStatus: "সন্তান নেই",
          familyDetails: "বাবা ব্যবসায়ী, মা গৃহিণী। ছোট দুই ভাইবোন।",
          isVerified: true,
          completionScore: 100,
          images: blurredImage,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "p2",
      email: "rahim@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801722222222",
      isMobileVerified: true,
      isPro: true,
      profile: {
        create: {
          fullName: "রহিম উদ্দিন",
          nameHidden: false,
          gender: "Male",
          dateOfBirth: dob(30),
          district: "Chattogram",
          upazila: "Hathazari",
          profession: "Banker",
          education: "Master's",
          maritalStatus: "Single",
          bio: "সৎ ও দায়িত্বশীল জীবনসঙ্গী খুঁজছি।",
          height: "5'8\"",
          weight: "70 kg",
          childrenStatus: "সন্তান নেই",
          familyDetails: "যৌথ পরিবার, তিন ভাইবোন।",
          isVerified: true,
          completionScore: 90,
          images: blurredImage,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "p3",
      email: "p3@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801733333333",
      isPro: false,
      profile: {
        create: {
          fullName: "ফারজানা আক্তার",
          nameHidden: true,
          gender: "Female",
          dateOfBirth: dob(24),
          district: "Sylhet",
          upazila: "Sylhet Sadar",
          profession: "Teacher",
          education: "Bachelor's (Honours)",
          maritalStatus: "Single",
          bio: "শান্ত স্বভাবের, পরিবারপ্রিয়।",
          height: "5'2\"",
          weight: "50 kg",
          childrenStatus: "সন্তান নেই",
          familyDetails: "একক পরিবার।",
          isVerified: false,
          completionScore: 70,
          images: blurredImage,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "p4",
      email: "karim@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801744444444",
      isMobileVerified: true,
      isPro: true,
      profile: {
        create: {
          fullName: "করিম হাসান",
          nameHidden: false,
          gender: "Male",
          dateOfBirth: dob(33),
          district: "Rajshahi",
          upazila: "Rajshahi Sadar",
          profession: "Doctor",
          education: "MBBS/Medical",
          maritalStatus: "Widower",
          bio: "জীবনে নতুন করে শুরু করতে চাই।",
          height: "5'9\"",
          weight: "72 kg",
          childrenStatus: "এক সন্তান",
          familyDetails: "বাবা-মা প্রয়াত, এক বোন।",
          isVerified: true,
          completionScore: 95,
          images: blurredImage,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "p5",
      email: "p5@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801755555555",
      isMobileVerified: true,
      isPro: false,
      profile: {
        create: {
          fullName: "নুসরাত জাহান",
          nameHidden: true,
          gender: "Female",
          dateOfBirth: dob(28),
          district: "Khulna",
          upazila: "Khulna Sadar",
          profession: "Banker",
          education: "Master's",
          maritalStatus: "Single",
          bio: "পরিবারকেন্দ্রিক জীবন কামনা করি।",
          height: "5'3\"",
          weight: "53 kg",
          childrenStatus: "সন্তান নেই",
          familyDetails: "যৌথ পরিবার।",
          isVerified: true,
          completionScore: 85,
          images: blurredImage,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "p6",
      email: "tanvir@matchmedia.com.bd",
      passwordHash: PW,
      mobile: "+8801766666666",
      isPro: false,
      profile: {
        create: {
          fullName: "তানভীর আহমেদ",
          nameHidden: false,
          gender: "Male",
          dateOfBirth: dob(29),
          district: "Dhaka",
          upazila: "Savar",
          profession: "IT/Software",
          education: "Bachelor's (Honours)",
          maritalStatus: "Single",
          bio: "সৃজনশীল ও পরিবারপ্রিয়।",
          height: "5'7\"",
          weight: "68 kg",
          childrenStatus: "সন্তান নেই",
          familyDetails: "একক পরিবার, এক ভাই।",
          isVerified: false,
          completionScore: 60,
          images: blurredImage,
        },
      },
    },
  });

  // --- Photo-access requests (matches the inbox mock) ---
  await prisma.photoAccessRequest.createMany({
    data: [
      // Received by "me"
      { viewerId: "p2", ownerId: "me", status: "PENDING" },
      { viewerId: "p6", ownerId: "me", status: "PENDING" },
      {
        viewerId: "p4",
        ownerId: "me",
        status: "APPROVED",
        respondedAt: new Date("2026-06-10T12:00:00Z"),
      },
      // Sent by "me"
      { viewerId: "me", ownerId: "demo", status: "PENDING" },
      {
        viewerId: "me",
        ownerId: "p3",
        status: "APPROVED",
        respondedAt: new Date("2026-06-11T15:00:00Z"),
      },
      {
        viewerId: "me",
        ownerId: "p5",
        status: "DENIED",
        respondedAt: new Date("2026-06-09T19:30:00Z"),
      },
    ],
  });

  // --- Interests ---
  // me -> demo is mutually ACCEPTED, so (once me is Pro) the contact gate opens
  // for the demo profile. The others are interests RECEIVED by me, in various
  // states, to populate the received-interests inbox.
  await prisma.interest.createMany({
    data: [
      { senderId: "me", receiverId: "demo", status: "ACCEPTED" },
      { senderId: "p2", receiverId: "me", status: "SENT" },
      { senderId: "p4", receiverId: "me", status: "SENT" },
      { senderId: "p6", receiverId: "me", status: "ACCEPTED" },
      { senderId: "p5", receiverId: "me", status: "DECLINED" },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    photoRequests: await prisma.photoAccessRequest.count(),
    interests: await prisma.interest.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
