import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create compliance frameworks
  const cisFramework = await prisma.complianceFramework.upsert({
    where: { name: 'CIS_AWS' },
    update: {},
    create: {
      name: 'CIS_AWS',
      version: '1.5.0',
      description: 'CIS AWS Foundations Benchmark',
    },
  });

  const soc2Framework = await prisma.complianceFramework.upsert({
    where: { name: 'SOC2' },
    update: {},
    create: {
      name: 'SOC2',
      version: '2023',
      description: 'SOC 2 Trust Services Criteria',
    },
  });

  // Create example controls
  const controls = [
    {
      frameworkId: cisFramework.id,
      controlId: '1.1',
      title: 'Avoid the use of the root account',
      description: 'The root account has unrestricted access to all resources in the AWS account.',
    },
    {
      frameworkId: cisFramework.id,
      controlId: '1.2',
      title: 'Ensure multi-factor authentication (MFA) is enabled for all IAM users that have a console password',
      description: 'MFA adds an extra layer of protection on top of a user name and password.',
    },
    {
      frameworkId: cisFramework.id,
      controlId: '2.1.1',
      title: 'Ensure all S3 buckets employ encryption-at-rest',
      description: 'Amazon S3 buckets should be encrypted to protect data at rest.',
    },
  ];

  for (const control of controls) {
    await prisma.complianceControl.upsert({
      where: {
        frameworkId_controlId: {
          frameworkId: control.frameworkId,
          controlId: control.controlId,
        },
      },
      update: {},
      create: control,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
}
