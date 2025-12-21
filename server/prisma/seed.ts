import { PrismaClient, UserRole, PlanTier, TenantStatus, PatientType, PatientStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // 1. Setup Password
  const password = await bcrypt.hash("12doctor12", 10)

  // 2. Create Super Admin (System Owner)
  const superAdmin = await prisma.user.upsert({
    where: { email: "mantonggopep@gmail.com" },
    update: {
      password: password,
      role: "SUPER_ADMIN",
      tenantId: null,
      branchId: null,
    },
    create: {
      id: "super-admin-id",
      email: "mantonggopep@gmail.com",
      name: "Mantong Gopep",
      title: "System Administrator",
      password: password,
      role: "SUPER_ADMIN",
      active: true,
      tenantId: null,
      branchId: null,
    },
  })
  console.log("✅ Super Admin created: mantonggopep@gmail.com")

  // 3. Create a Demo Clinic (Tenant)
  const demoTenant = await prisma.tenant.upsert({
    where: { id: "demo-clinic-id" },
    update: {},
    create: {
      id: "demo-clinic-id",
      name: "VetNexus Animal Hospital",
      address: "123 Lagos Way",
      type: "Mixed",
      country: "Nigeria",
      timezone: "Africa/Lagos",
      currency: "NGN",
      plan: PlanTier.PREMIUM,
      status: TenantStatus.ACTIVE,
      features: { aiEnabled: true, maxUsers: 10 },
      isTrial: false,
    }
  })
  console.log("✅ Demo Clinic created")

  // 4. Create a Branch (Location)
  const demoBranch = await prisma.branch.upsert({
    where: { id: "demo-branch-id" },
    update: {},
    create: {
      id: "demo-branch-id",
      tenantId: demoTenant.id,
      name: "Main Branch",
      address: "123 Lagos Way",
      phone: "08012345678",
      active: true,
    }
  })
  console.log("✅ Main Branch created")

  // 5. Create a VET User (Clinic Dashboard)
  const vetUser = await prisma.user.upsert({
    where: { email: "vet@demo.com" },
    update: {
      password: password,
      tenantId: demoTenant.id,
      branchId: demoBranch.id
    },
    create: {
      id: "demo-vet-user",
      email: "vet@demo.com",
      name: "Dr. Demo Vet",
      title: "Senior Veterinarian",
      password: password,
      role: "VET",
      active: true,
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
    }
  })
  console.log("✅ Vet User created: vet@demo.com")

  // 6. Create Client Profile (The Person)
  // We enable 'portalEnabled' so the UI knows they can log in
  const demoClient = await prisma.client.upsert({
    where: { id: "demo-client-1" },
    update: {},
    create: {
      id: "demo-client-1",
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      title: "Mr.",
      name: "John Doe",
      email: "client@demo.com", // This email matches the login user below
      phone: "08099999999",
      address: "Abuja",
      portalEnabled: true,
      balance: 0,
    }
  })
  console.log("✅ Client Profile created")

  // 7. Create Client Login User (The Login Credentials)
  const clientUser = await prisma.user.upsert({
    where: { email: "client@demo.com" },
    update: {
      password: password,
      tenantId: demoTenant.id,
      clientId: demoClient.id, // Links User to the Client Profile
    },
    create: {
      id: "demo-client-user",
      email: "client@demo.com",
      name: "John Doe",
      title: "Pet Owner",
      password: password,
      role: "PET_OWNER",
      active: true,
      tenantId: demoTenant.id,
      clientId: demoClient.id, // Links User to the Client Profile
    }
  })
  console.log("✅ Client Login created: client@demo.com")

  // 8. Create a Pet for the Client
  await prisma.patient.upsert({
    where: { id: "demo-patient-1" },
    update: {
      name: "Bingo",
      species: "Canine",
      ownerId: demoClient.id,
      tenantId: demoTenant.id
    },
    create: {
      id: "demo-patient-1",
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      ownerId: demoClient.id,
      name: "Bingo",
      type: PatientType.Single,
      species: "Canine",
      breed: "Local",
      sex: "Male",
      age: "2 years",
      status: PatientStatus.Active
    }
  })
  console.log("✅ Pet 'Bingo' created")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })