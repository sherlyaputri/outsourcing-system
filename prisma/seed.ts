import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Vendor
  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'PT Maju Bersama',
      address: 'Jl. Sudirman No. 123, Jakarta',
      phone: '021-12345678',
      email: 'info@majubersama.co.id',
      status: 'ACTIVE',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'CV Sejahtera Mandiri',
      address: 'Jl. Gatot Subroto No. 456, Jakarta',
      phone: '021-87654321',
      email: 'info@sejahteramandiri.co.id',
      status: 'ACTIVE',
    },
  });

  // Create VM User
  await prisma.user.create({
    data: {
      email: 'vm@wahana.com',
      password: hashedPassword,
      name: 'Ahmad Rizki',
      role: 'VM',
      status: 'ACTIVE',
    },
  });

  // Create SM User
  await prisma.user.create({
    data: {
      email: 'sm@wahana.com',
      password: hashedPassword,
      name: 'Budi Santoso',
      role: 'SM',
      status: 'ACTIVE',
    },
  });

  // Create GM User
  await prisma.user.create({
    data: {
      email: 'gm@wahana.com',
      password: hashedPassword,
      name: 'Dewi Lestari',
      role: 'GM',
      status: 'ACTIVE',
    },
  });

  // Create COO User
  await prisma.user.create({
    data: {
      email: 'coo@wahana.com',
      password: hashedPassword,
      name: 'Hendra Wijaya',
      role: 'COO',
      status: 'ACTIVE',
    },
  });

  // Create Vendor Users
  await prisma.user.create({
    data: {
      email: 'vendor1@majubersama.co.id',
      password: hashedPassword,
      name: 'Siti Rahayu',
      role: 'VENDOR',
      status: 'ACTIVE',
      vendorId: vendor1.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'vendor2@sejahteramandiri.co.id',
      password: hashedPassword,
      name: 'Agus Pratama',
      role: 'VENDOR',
      status: 'ACTIVE',
      vendorId: vendor2.id,
    },
  });

  // Create Mitra Users
  const mitra1 = await prisma.user.create({
    data: {
      email: 'mitra1@wahana.com',
      password: hashedPassword,
      name: 'Rini Wulandari',
      role: 'MITRA',
      status: 'ACTIVE',
      vendorId: vendor1.id,
    },
  });

  const mitra2 = await prisma.user.create({
    data: {
      email: 'mitra2@wahana.com',
      password: hashedPassword,
      name: 'Joko Susanto',
      role: 'MITRA',
      status: 'ACTIVE',
      vendorId: vendor1.id,
    },
  });

  // Create Mitra Profiles
  await prisma.mitraProfile.create({
    data: {
      userId: mitra1.id,
      vendorId: vendor1.id,
      nik: '3201012345678901',
      tempatLahir: 'Jakarta',
      tanggalLahir: new Date('1995-05-15'),
      alamat: 'Jl. Melati No. 10, Jakarta Selatan',
      penempatan: 'Jakarta HQ',
      posisi: 'Office Boy',
      startDate: new Date('2024-01-01'),
      status: 'ACTIVE',
    },
  });

  await prisma.mitraProfile.create({
    data: {
      userId: mitra2.id,
      vendorId: vendor1.id,
      nik: '3201019876543210',
      tempatLahir: 'Bogor',
      tanggalLahir: new Date('1998-08-20'),
      alamat: 'Jl. Anggrek No. 5, Bogor',
      penempatan: 'Jakarta HQ',
      posisi: 'Security',
      startDate: new Date('2024-03-01'),
      status: 'ACTIVE',
    },
  });

  console.log('Seed data created successfully!');
  console.log('Login credentials:');
  console.log('VM: vm@wahana.com / password123');
  console.log('SM: sm@wahana.com / password123');
  console.log('GM: gm@wahana.com / password123');
  console.log('COO: coo@wahana.com / password123');
  console.log('Vendor 1: vendor1@majubersama.co.id / password123');
  console.log('Vendor 2: vendor2@sejahteramandiri.co.id / password123');
  console.log('Mitra 1: mitra1@wahana.com / password123');
  console.log('Mitra 2: mitra2@wahana.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
