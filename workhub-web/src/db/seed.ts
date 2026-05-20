import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { hash } from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import {
  departmentMembers,
  departments,
  leaveRequests,
  organizations,
  permissions,
  rolePermissions,
  roles,
  shiftAssignments,
  shifts,
  tasks,
  userRoles,
  users,
} from "./schema";

type OrganizationSeed = {
  name: string;
  slug: string;
  users: Array<{
    key: string;
    email: string;
    name: string;
    role: RoleName;
  }>;
  departments: Array<{
    key: string;
    name: string;
    description: string;
    members: Array<{ userKey: string; isManager: boolean }>;
  }>;
  leaveRequests: Array<{
    departmentKey: string;
    userKey: string;
    type: "sick" | "vacation" | "unpaid" | "remote" | "personal" | "training";
    startOffset: number;
    endOffset: number;
    status: "pending" | "approved" | "rejected";
    reason?: string;
    reviewedByKey?: string;
    reviewComment?: string;
  }>;
  shifts: Array<{
    key: string;
    departmentKey: string;
    title: string;
    dayOffset: number;
    start: string;
    end: string;
    location: string;
    status: "scheduled" | "completed";
    assignedUserKeys: string[];
  }>;
  tasks: Array<{
    departmentKey: string;
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "todo" | "in_progress" | "completed";
    dueOffset: number;
    assignedToKey: string;
  }>;
};

type RoleName = "Main Admin" | "Department Manager" | "Employee";

const permissionSeeds = [
  "departments.create",
  "departments.update",
  "departments.delete",
  "departments.view",
  "users.create",
  "users.update",
  "users.deactivate",
  "users.assign_role",
  "roles.create",
  "roles.update",
  "roles.delete",
  "roles.assign_permissions",
  "leave.request",
  "leave.view_own",
  "leave.view_department",
  "leave.approve",
  "leave.reject",
  "shifts.view_own",
  "shifts.view_department",
  "shifts.create",
  "shifts.update",
  "shifts.cancel",
  "shifts.assign_employee",
  "tasks.view_own",
  "tasks.view_department",
  "tasks.create",
  "tasks.update",
  "tasks.delete",
  "tasks.assign",
] as const;

const rolePermissionsByName: Record<RoleName, string[]> = {
  "Main Admin": [...permissionSeeds],
  "Department Manager": [
    "departments.view",
    "users.update",
    "leave.view_department",
    "leave.approve",
    "leave.reject",
    "shifts.view_department",
    "shifts.create",
    "shifts.update",
    "shifts.cancel",
    "shifts.assign_employee",
    "tasks.view_department",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "tasks.assign",
  ],
  Employee: [
    "leave.request",
    "leave.view_own",
    "shifts.view_own",
    "tasks.view_own",
  ],
};

const seeds: OrganizationSeed[] = [
  {
    name: "Sofia Municipality",
    slug: "sofia-municipality",
    users: [
      {
        key: "admin",
        email: "admin@sofia.gov",
        name: "Sofia Main Admin",
        role: "Main Admin",
      },
      {
        key: "maria",
        email: "maria.hr@sofia.gov",
        name: "Maria HR",
        role: "Department Manager",
      },
      {
        key: "ivan",
        email: "ivan.operations@sofia.gov",
        name: "Ivan Operations",
        role: "Department Manager",
      },
      {
        key: "elena",
        email: "elena.hr@sofia.gov",
        name: "Elena HR",
        role: "Employee",
      },
      {
        key: "petar",
        email: "petar.hr@sofia.gov",
        name: "Petar HR",
        role: "Employee",
      },
      {
        key: "georgi",
        email: "georgi.works@sofia.gov",
        name: "Georgi Works",
        role: "Employee",
      },
      {
        key: "stefan",
        email: "stefan.works@sofia.gov",
        name: "Stefan Works",
        role: "Employee",
      },
      {
        key: "radostina",
        email: "radostina.transport@sofia.gov",
        name: "Radostina Transport",
        role: "Employee",
      },
      {
        key: "nikolay",
        email: "nikolay.transport@sofia.gov",
        name: "Nikolay Transport",
        role: "Employee",
      },
    ],
    departments: [
      {
        key: "hr",
        name: "Human Resources",
        description: "People operations, hiring, onboarding, and leave tracking.",
        members: [
          { userKey: "maria", isManager: true },
          { userKey: "elena", isManager: false },
          { userKey: "petar", isManager: false },
        ],
      },
      {
        key: "works",
        name: "Public Works",
        description: "Street maintenance, public spaces, and field operations.",
        members: [
          { userKey: "ivan", isManager: true },
          { userKey: "georgi", isManager: false },
          { userKey: "stefan", isManager: false },
        ],
      },
      {
        key: "transport",
        name: "Transport Operations",
        description: "Public transport coordination and route operations.",
        members: [
          { userKey: "ivan", isManager: true },
          { userKey: "radostina", isManager: false },
          { userKey: "nikolay", isManager: false },
        ],
      },
    ],
    leaveRequests: [
      {
        departmentKey: "hr",
        userKey: "elena",
        type: "vacation",
        startOffset: 10,
        endOffset: 14,
        status: "pending",
        reason: "Family vacation planned in advance.",
      },
      {
        departmentKey: "hr",
        userKey: "petar",
        type: "sick",
        startOffset: -2,
        endOffset: 0,
        status: "approved",
        reviewedByKey: "maria",
        reviewComment: "Approved. Get well soon.",
      },
      {
        departmentKey: "works",
        userKey: "georgi",
        type: "sick",
        startOffset: 1,
        endOffset: 3,
        status: "pending",
        reason: "Medical procedure and recovery.",
      },
      {
        departmentKey: "works",
        userKey: "stefan",
        type: "vacation",
        startOffset: 20,
        endOffset: 25,
        status: "rejected",
        reviewedByKey: "ivan",
        reviewComment:
          "Rejected due to planned road repair operations during this period.",
      },
      {
        departmentKey: "transport",
        userKey: "radostina",
        type: "remote",
        startOffset: 6,
        endOffset: 6,
        status: "pending",
        reason: "Remote work day for focused documentation.",
      },
      {
        departmentKey: "transport",
        userKey: "nikolay",
        type: "training",
        startOffset: -5,
        endOffset: -3,
        status: "approved",
        reviewedByKey: "ivan",
        reviewComment: "Approved for required route safety training.",
      },
    ],
    shifts: [
      {
        key: "street-maintenance",
        departmentKey: "works",
        title: "Morning Street Maintenance",
        dayOffset: 1,
        start: "08:00",
        end: "16:00",
        location: "Central District",
        status: "scheduled",
        assignedUserKeys: ["georgi", "stefan"],
      },
      {
        key: "park-cleaning",
        departmentKey: "works",
        title: "Park Cleaning Shift",
        dayOffset: 2,
        start: "07:00",
        end: "15:00",
        location: "South Park",
        status: "scheduled",
        assignedUserKeys: ["stefan"],
      },
      {
        key: "road-inspection",
        departmentKey: "works",
        title: "Emergency Road Inspection",
        dayOffset: -3,
        start: "09:00",
        end: "17:00",
        location: "Industrial Zone",
        status: "completed",
        assignedUserKeys: ["ivan", "georgi"],
      },
      {
        key: "bus-dispatch",
        departmentKey: "transport",
        title: "Morning Bus Dispatch Coordination",
        dayOffset: 1,
        start: "06:00",
        end: "14:00",
        location: "Central Depot",
        status: "scheduled",
        assignedUserKeys: ["radostina", "nikolay"],
      },
      {
        key: "route-monitoring",
        departmentKey: "transport",
        title: "Evening Route Monitoring",
        dayOffset: 3,
        start: "14:00",
        end: "22:00",
        location: "Operations Control Room",
        status: "scheduled",
        assignedUserKeys: ["nikolay"],
      },
      {
        key: "interview-support",
        departmentKey: "hr",
        title: "Recruitment Interview Support",
        dayOffset: 3,
        start: "09:00",
        end: "17:00",
        location: "Municipality HQ",
        status: "scheduled",
        assignedUserKeys: ["elena", "petar"],
      },
    ],
    tasks: [
      {
        departmentKey: "hr",
        title: "Prepare monthly employee leave report",
        priority: "high",
        status: "in_progress",
        dueOffset: 5,
        assignedToKey: "elena",
      },
      {
        departmentKey: "hr",
        title: "Update onboarding checklist",
        priority: "medium",
        status: "todo",
        dueOffset: 8,
        assignedToKey: "petar",
      },
      {
        departmentKey: "works",
        title: "Inspect damaged street lights near Central Square",
        priority: "urgent",
        status: "todo",
        dueOffset: 2,
        assignedToKey: "georgi",
      },
      {
        departmentKey: "works",
        title: "Prepare weekly maintenance schedule",
        priority: "high",
        status: "in_progress",
        dueOffset: 4,
        assignedToKey: "ivan",
      },
      {
        departmentKey: "works",
        title: "Check cleanliness reports from South Park",
        priority: "medium",
        status: "completed",
        dueOffset: -1,
        assignedToKey: "stefan",
      },
      {
        departmentKey: "transport",
        title: "Review delayed route reports from the last 7 days",
        priority: "high",
        status: "in_progress",
        dueOffset: 3,
        assignedToKey: "ivan",
      },
      {
        departmentKey: "transport",
        title: "Prepare vehicle allocation list for weekend schedule",
        priority: "medium",
        status: "todo",
        dueOffset: 6,
        assignedToKey: "radostina",
      },
      {
        departmentKey: "transport",
        title: "Confirm driver coverage for Route 72",
        priority: "urgent",
        status: "todo",
        dueOffset: 1,
        assignedToKey: "nikolay",
      },
    ],
  },
  {
    name: "BrightCare Medical Center",
    slug: "brightcare-medical-center",
    users: [
      {
        key: "admin",
        email: "admin@brightcare.com",
        name: "BrightCare Main Admin",
        role: "Main Admin",
      },
      {
        key: "anna",
        email: "anna.clinical@brightcare.com",
        name: "Anna Clinical",
        role: "Department Manager",
      },
      {
        key: "viktor",
        email: "viktor.admin@brightcare.com",
        name: "Viktor Admin",
        role: "Department Manager",
      },
      {
        key: "nina",
        email: "nina.nurse@brightcare.com",
        name: "Nina Nurse",
        role: "Employee",
      },
      {
        key: "martin",
        email: "martin.nurse@brightcare.com",
        name: "Martin Nurse",
        role: "Employee",
      },
      {
        key: "stela",
        email: "stela.lab@brightcare.com",
        name: "Stela Lab",
        role: "Employee",
      },
      {
        key: "kalina",
        email: "kalina.admin@brightcare.com",
        name: "Kalina Admin",
        role: "Employee",
      },
      {
        key: "boris",
        email: "boris.admin@brightcare.com",
        name: "Boris Admin",
        role: "Employee",
      },
    ],
    departments: [
      {
        key: "nursing",
        name: "Nursing",
        description: "Ward staffing, care coordination, and nursing coverage.",
        members: [
          { userKey: "anna", isManager: true },
          { userKey: "nina", isManager: false },
          { userKey: "martin", isManager: false },
        ],
      },
      {
        key: "lab",
        name: "Laboratory",
        description: "Diagnostics, samples, and laboratory processing.",
        members: [
          { userKey: "anna", isManager: true },
          { userKey: "stela", isManager: false },
        ],
      },
      {
        key: "admin-dept",
        name: "Administration",
        description: "Reception, office operations, and visitor procedures.",
        members: [
          { userKey: "viktor", isManager: true },
          { userKey: "kalina", isManager: false },
          { userKey: "boris", isManager: false },
        ],
      },
    ],
    leaveRequests: [
      {
        departmentKey: "nursing",
        userKey: "nina",
        type: "sick",
        startOffset: 2,
        endOffset: 4,
        status: "pending",
        reason: "Medical leave requested.",
      },
      {
        departmentKey: "nursing",
        userKey: "martin",
        type: "vacation",
        startOffset: 15,
        endOffset: 20,
        status: "approved",
        reviewedByKey: "anna",
        reviewComment: "Approved. Shift coverage is available.",
      },
      {
        departmentKey: "lab",
        userKey: "stela",
        type: "sick",
        startOffset: 5,
        endOffset: 7,
        status: "pending",
        reason: "Recovery after outpatient procedure.",
      },
      {
        departmentKey: "admin-dept",
        userKey: "kalina",
        type: "vacation",
        startOffset: 7,
        endOffset: 9,
        status: "pending",
        reason: "Short personal trip.",
      },
      {
        departmentKey: "admin-dept",
        userKey: "boris",
        type: "unpaid",
        startOffset: -8,
        endOffset: -8,
        status: "approved",
        reviewedByKey: "viktor",
        reviewComment: "Approved.",
      },
    ],
    shifts: [
      {
        key: "morning-nursing",
        departmentKey: "nursing",
        title: "Morning Nursing Shift",
        dayOffset: 1,
        start: "07:00",
        end: "15:00",
        location: "Ward A",
        status: "scheduled",
        assignedUserKeys: ["nina"],
      },
      {
        key: "evening-nursing",
        departmentKey: "nursing",
        title: "Evening Nursing Shift",
        dayOffset: 1,
        start: "15:00",
        end: "23:00",
        location: "Ward A",
        status: "scheduled",
        assignedUserKeys: ["martin"],
      },
      {
        key: "night-nursing",
        departmentKey: "nursing",
        title: "Night Nursing Shift",
        dayOffset: -2,
        start: "23:00",
        end: "07:00",
        location: "Emergency Unit",
        status: "completed",
        assignedUserKeys: ["anna", "nina"],
      },
      {
        key: "lab-processing",
        departmentKey: "lab",
        title: "Morning Laboratory Processing",
        dayOffset: 2,
        start: "08:00",
        end: "16:00",
        location: "Main Lab",
        status: "scheduled",
        assignedUserKeys: ["stela"],
      },
      {
        key: "front-desk",
        departmentKey: "admin-dept",
        title: "Front Desk Coverage",
        dayOffset: 2,
        start: "08:30",
        end: "16:30",
        location: "Reception",
        status: "scheduled",
        assignedUserKeys: ["kalina", "boris"],
      },
    ],
    tasks: [
      {
        departmentKey: "nursing",
        title: "Review weekly patient room staffing needs",
        priority: "high",
        status: "in_progress",
        dueOffset: 3,
        assignedToKey: "anna",
      },
      {
        departmentKey: "nursing",
        title: "Prepare shift handover notes",
        priority: "medium",
        status: "todo",
        dueOffset: 1,
        assignedToKey: "martin",
      },
      {
        departmentKey: "lab",
        title: "Verify reagent stock for next week",
        priority: "high",
        status: "todo",
        dueOffset: 2,
        assignedToKey: "stela",
      },
      {
        departmentKey: "admin-dept",
        title: "Update visitor access procedure document",
        priority: "medium",
        status: "todo",
        dueOffset: 6,
        assignedToKey: "kalina",
      },
      {
        departmentKey: "admin-dept",
        title: "Prepare monthly office supply request",
        priority: "low",
        status: "completed",
        dueOffset: -2,
        assignedToKey: "boris",
      },
    ],
  },
];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const seededSlugs = seeds.map((seed) => seed.slug);

function dateFromOffset(offset: number) {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + offset);

  return value.toISOString().slice(0, 10);
}

function timestampFromOffset(offset: number, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date();
  value.setHours(hours, minutes, 0, 0);
  value.setDate(value.getDate() + offset);

  return value;
}

async function resetSeededData() {
  const existingOrganizations = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.slug, seededSlugs));

  const organizationIds = existingOrganizations.map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return;
  }

  const existingRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.organizationId, organizationIds));

  const roleIds = existingRoles.map((role) => role.id);

  if (roleIds.length > 0) {
    await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, roleIds));
  }

  await db.delete(shiftAssignments).where(inArray(shiftAssignments.organizationId, organizationIds));
  await db.delete(tasks).where(inArray(tasks.organizationId, organizationIds));
  await db.delete(shifts).where(inArray(shifts.organizationId, organizationIds));
  await db.delete(leaveRequests).where(inArray(leaveRequests.organizationId, organizationIds));
  await db.delete(departmentMembers).where(inArray(departmentMembers.organizationId, organizationIds));
  await db.delete(userRoles).where(inArray(userRoles.organizationId, organizationIds));
  await db.delete(roles).where(inArray(roles.organizationId, organizationIds));
  await db.delete(departments).where(inArray(departments.organizationId, organizationIds));
  await db.delete(users).where(inArray(users.organizationId, organizationIds));
  await db.delete(organizations).where(inArray(organizations.id, organizationIds));
}

async function seedPermissions() {
  await db
    .insert(permissions)
    .values(
      permissionSeeds.map((permission) => ({
        key: permission,
        description: permission
          .split(".")
          .map((part) => part.replace("_", " "))
          .join(" "),
      })),
    )
    .onConflictDoNothing({ target: permissions.key });

  const rows = await db.select().from(permissions);

  return new Map(rows.map((permission) => [permission.key, permission.id]));
}

async function seedOrganization(
  seed: OrganizationSeed,
  permissionIdsByKey: Map<string, number>,
  passwordHash: string,
) {
  const [organization] = await db
    .insert(organizations)
    .values({
      name: seed.name,
      slug: seed.slug,
    })
    .returning();

  const roleRows = await db
    .insert(roles)
    .values(
      (["Main Admin", "Department Manager", "Employee"] as RoleName[]).map(
        (roleName) => ({
          organizationId: organization.id,
          name: roleName,
          description: `${roleName} role for ${seed.name}`,
        }),
      ),
    )
    .returning();

  const roleIdsByName = new Map(roleRows.map((role) => [role.name as RoleName, role.id]));

  await db.insert(rolePermissions).values(
    roleRows.flatMap((role) =>
      rolePermissionsByName[role.name as RoleName].map((permissionKey) => ({
        roleId: role.id,
        permissionId: requiredMapValue(permissionIdsByKey, permissionKey),
      })),
    ),
  );

  const userRows = await db
    .insert(users)
    .values(
      seed.users.map((user) => ({
        organizationId: organization.id,
        email: user.email,
        passwordHash,
        name: user.name,
        isActive: true,
      })),
    )
    .returning();

  const userIdsByKey = new Map(
    userRows.map((user) => [
      requiredSeedUserByEmail(seed, user.email).key,
      user.id,
    ]),
  );

  await db.insert(userRoles).values(
    seed.users.map((user) => ({
      organizationId: organization.id,
      userId: requiredMapValue(userIdsByKey, user.key),
      roleId: requiredMapValue(roleIdsByName, user.role),
    })),
  );

  const departmentRows = await db
    .insert(departments)
    .values(
      seed.departments.map((department) => ({
        organizationId: organization.id,
        name: department.name,
        description: department.description,
      })),
    )
    .returning();

  const departmentIdsByKey = new Map(
    departmentRows.map((department) => [
      requiredSeedDepartmentByName(seed, department.name).key,
      department.id,
    ]),
  );

  await db.insert(departmentMembers).values(
    seed.departments.flatMap((department) =>
      department.members.map((member) => ({
        organizationId: organization.id,
        departmentId: requiredMapValue(departmentIdsByKey, department.key),
        userId: requiredMapValue(userIdsByKey, member.userKey),
        isManager: member.isManager,
      })),
    ),
  );

  await db.insert(leaveRequests).values(
    seed.leaveRequests.map((request) => ({
      organizationId: organization.id,
      departmentId: requiredMapValue(departmentIdsByKey, request.departmentKey),
      userId: requiredMapValue(userIdsByKey, request.userKey),
      type: request.type,
      startDate: dateFromOffset(request.startOffset),
      endDate: dateFromOffset(request.endOffset),
      reason: request.reason,
      status: request.status,
      reviewedByUserId: request.reviewedByKey
        ? requiredMapValue(userIdsByKey, request.reviewedByKey)
        : null,
      reviewComment: request.reviewComment,
      reviewedAt: request.reviewedByKey ? new Date() : null,
    })),
  );

  const shiftRows = await db
    .insert(shifts)
    .values(
      seed.shifts.map((shift) => ({
        organizationId: organization.id,
        departmentId: requiredMapValue(departmentIdsByKey, shift.departmentKey),
        title: shift.title,
        startTime: timestampFromOffset(shift.dayOffset, shift.start),
        endTime: timestampFromOffset(shift.dayOffset, shift.end),
        location: shift.location,
        status: shift.status,
        createdByUserId: requiredMapValue(userIdsByKey, "admin"),
      })),
    )
    .returning();

  const shiftIdsByKey = new Map(
    shiftRows.map((shift) => [
      requiredSeedShiftByTitle(seed, shift.title).key,
      shift.id,
    ]),
  );

  await db.insert(shiftAssignments).values(
    seed.shifts.flatMap((shift) =>
      shift.assignedUserKeys.map((userKey) => ({
        organizationId: organization.id,
        shiftId: requiredMapValue(shiftIdsByKey, shift.key),
        userId: requiredMapValue(userIdsByKey, userKey),
        assignedByUserId: requiredMapValue(userIdsByKey, "admin"),
      })),
    ),
  );

  await db.insert(tasks).values(
    seed.tasks.map((task) => ({
      organizationId: organization.id,
      departmentId: requiredMapValue(departmentIdsByKey, task.departmentKey),
      title: task.title,
      description: `${task.title} for ${seed.name}.`,
      status: task.status,
      priority: task.priority,
      dueDate: dateFromOffset(task.dueOffset),
      createdByUserId: requiredMapValue(userIdsByKey, "admin"),
      assignedToUserId: requiredMapValue(userIdsByKey, task.assignedToKey),
    })),
  );

  return {
    organization,
    users: userRows.length,
    departments: departmentRows.length,
    shifts: shiftRows.length,
    tasks: seed.tasks.length,
  };
}

function requiredMapValue<K, V>(map: Map<K, V>, key: K) {
  const value = map.get(key);

  if (value === undefined) {
    throw new Error(`Missing seed reference: ${String(key)}`);
  }

  return value;
}

function requiredSeedUserByEmail(seed: OrganizationSeed, email: string) {
  const user = seed.users.find((candidate) => candidate.email === email);

  if (!user) {
    throw new Error(`Missing seed user for email: ${email}`);
  }

  return user;
}

function requiredSeedDepartmentByName(seed: OrganizationSeed, name: string) {
  const department = seed.departments.find((candidate) => candidate.name === name);

  if (!department) {
    throw new Error(`Missing seed department for name: ${name}`);
  }

  return department;
}

function requiredSeedShiftByTitle(seed: OrganizationSeed, title: string) {
  const shift = seed.shifts.find((candidate) => candidate.title === title);

  if (!shift) {
    throw new Error(`Missing seed shift for title: ${title}`);
  }

  return shift;
}

async function main() {
  await resetSeededData();

  const passwordHash = await hash("pass123", 12);
  const permissionIdsByKey = await seedPermissions();
  const results = [];

  for (const seed of seeds) {
    results.push(await seedOrganization(seed, permissionIdsByKey, passwordHash));
  }

  const [mainAdminRoleAssignments] = await db
    .select()
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(roles.name, "Main Admin")));

  console.log(`Seeded ${results.length} organizations.`);
  console.log(`Inserted ${permissionSeeds.length} permissions.`);

  for (const result of results) {
    console.log(
      `${result.organization.name}: ${result.users} users, ${result.departments} departments, ${result.shifts} shifts, ${result.tasks} tasks.`,
    );
  }

  if (!mainAdminRoleAssignments) {
    throw new Error("Seed completed without any Main Admin role assignment.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
