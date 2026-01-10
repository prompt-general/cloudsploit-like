import { PrismaClient } from '@prisma/client';
import { FRAMEWORKS } from '../src/frameworks';

const prisma = new PrismaClient();

async function seedFrameworks() {
  console.log('🌱 Seeding compliance frameworks...');

  for (const [frameworkId, frameworkDef] of Object.entries(FRAMEWORKS)) {
    console.log(`\n📋 Seeding ${frameworkDef.framework.name} v${frameworkDef.framework.version}`);

    // Create or update framework
    const framework = await prisma.complianceFramework.upsert({
      where: { 
        name_version: {
          name: frameworkDef.framework.name,
          version: frameworkDef.framework.version,
        }
      },
      update: {
        description: frameworkDef.framework.description,
      },
      create: {
        name: frameworkDef.framework.name,
        version: frameworkDef.framework.version,
        description: frameworkDef.framework.description,
      },
    });

    console.log(`  Framework: ${framework.name} (${framework.id})`);

    // Create controls
    let controlCount = 0;
    for (const controlDef of frameworkDef.controls) {
      const control = await prisma.complianceControl.upsert({
        where: {
          frameworkId_controlId: {
            frameworkId: framework.id,
            controlId: controlDef.controlId,
          },
        },
        update: {
          title: controlDef.title,
          description: controlDef.description,
          category: controlDef.category,
          severity: controlDef.severity,
          implementationGuidance: controlDef.implementationGuidance,
          auditGuidance: controlDef.auditGuidance,
          references: controlDef.references,
        },
        create: {
          frameworkId: framework.id,
          controlId: controlDef.controlId,
          title: controlDef.title,
          description: controlDef.description,
          category: controlDef.category,
          severity: controlDef.severity,
          implementationGuidance: controlDef.implementationGuidance,
          auditGuidance: controlDef.auditGuidance,
          references: controlDef.references,
        },
      });
      controlCount++;
    }

    console.log(`  Created ${controlCount} controls`);

    // Create rule mappings
    let mappingCount = 0;
    for (const mappingDef of frameworkDef.mappings) {
      // Find the control
      const control = await prisma.complianceControl.findFirst({
        where: {
          frameworkId: framework.id,
          controlId: mappingDef.controlId,
        },
      });

      if (control) {
        await prisma.ruleComplianceMapping.upsert({
          where: {
            ruleId_controlId: {
              ruleId: mappingDef.ruleId,
              controlId: control.id,
            },
          },
          update: {
            mappingType: mappingDef.mappingType,
            evidenceRequirements: mappingDef.evidenceRequirements,
          },
          create: {
            ruleId: mappingDef.ruleId,
            controlId: control.id,
            mappingType: mappingDef.mappingType,
            evidenceRequirements: mappingDef.evidenceRequirements,
          },
        });
        mappingCount++;
      } else {
        console.warn(`  Warning: Control ${mappingDef.controlId} not found for mapping`);
      }
    }

    console.log(`  Created ${mappingCount} rule mappings`);
  }

  console.log('\n✅ Seeding completed!');
  console.log('\n📊 Summary:');
  console.log('===========');

  // Print summary
  const frameworks = await prisma.complianceFramework.findMany({
    include: {
      _count: {
        select: {
          controls: true,
        },
      },
    },
  });

  for (const framework of frameworks) {
    const mappings = await prisma.ruleComplianceMapping.count({
      where: {
        control: {
          frameworkId: framework.id,
        },
      },
    });

    console.log(`${framework.name} v${framework.version}:`);
    console.log(`  Controls: ${framework._count.controls}`);
    console.log(`  Rule Mappings: ${mappings}`);
  }
}

seedFrameworks()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
