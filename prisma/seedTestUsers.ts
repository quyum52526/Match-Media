/**
 * Non-destructive test-user upsert.
 * Safe to run against a live DB — it never deletes existing data.
 * Run with:  npx tsx prisma/seedTestUsers.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PW = bcrypt.hashSync("password123", 10);

function dob(age: number) {
  return new Date(2026 - age, 5, 1);
}

const TEST_USERS = [
  {
    id: "test-karim",
    email: "karim@matchmedia.com.bd",
    mobile: "+8801744444444",
    profile: {
      fullName: "করিম হাসান",
      displayName: "Karim Hasan",
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
    },
  },
  {
    id: "test-tanvir",
    email: "tanvir@matchmedia.com.bd",
    mobile: "+8801766666666",
    profile: {
      fullName: "তানভীর আহমেদ",
      displayName: "Tanvir Ahmed",
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
    },
  },
  {
    id: "test-aysha",
    email: "aysha@matchmedia.com.bd",
    mobile: "+8801712345678",
    profile: {
      fullName: "আয়েশা সিদ্দিকা",
      displayName: "Aysha Siddika",
      nameHidden: false,
      gender: "Female",
      dateOfBirth: dob(26),
      district: "Dhaka",
      upazila: "Savar",
      profession: "IT/Software",
      education: "Engineering",
      maritalStatus: "Single",
      bio: "পরিবারকেন্দ্রিক, ধর্মীয় মূল্যবোধে বিশ্বাসী।",
      height: "5'4\"",
      weight: "55 kg",
      childrenStatus: "সন্তান নেই",
      familyDetails: "বাবা ব্যবসায়ী, মা গৃহিণী।",
      isVerified: true,
      completionScore: 100,
    },
  },
  {
    id: "test-nusrat",
    email: "nusrat@matchmedia.com.bd",
    mobile: "+8801755555555",
    profile: {
      fullName: "নুসরাত জাহান",
      displayName: "Nusrat Jahan",
      nameHidden: false,
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
    },
  },
];

async function main() {
  for (const u of TEST_USERS) {
    // Upsert the user row (update passwordHash + mobile but leave anything else alone).
    const user = await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: PW,
        mobile: u.mobile,
        isMobileVerified: true,
      },
      update: {
        email: u.email,
        passwordHash: PW,
        mobile: u.mobile,
        isMobileVerified: true,
      },
    });

    // Upsert profile only if one doesn't already exist for this user.
    const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          ...u.profile,
        },
      });
      console.log(`  Created profile for ${u.profile.displayName}`);
    } else {
      console.log(`  Profile already exists for ${u.profile.displayName} — skipped`);
    }
  }

  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
  };
  console.log("\nDone. DB totals:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
