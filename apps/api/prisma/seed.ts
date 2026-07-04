import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NexusHR database...');

  // ── Departments ──────────────────────────────────────────────
  const [engineering, hr, sales, marketing, finance] = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Engineering' },
      update: {},
      create: { name: 'Engineering', description: 'Product development and technical operations', color: '#6366f1' },
    }),
    prisma.department.upsert({
      where: { name: 'Human Resources' },
      update: {},
      create: { name: 'Human Resources', description: 'People operations and culture', color: '#f43f5e' },
    }),
    prisma.department.upsert({
      where: { name: 'Sales' },
      update: {},
      create: { name: 'Sales', description: 'Revenue generation and client relations', color: '#10b981' },
    }),
    prisma.department.upsert({
      where: { name: 'Marketing' },
      update: {},
      create: { name: 'Marketing', description: 'Brand building and growth', color: '#f59e0b' },
    }),
    prisma.department.upsert({
      where: { name: 'Finance' },
      update: {},
      create: { name: 'Finance', description: 'Financial planning and analysis', color: '#3b82f6' },
    }),
  ]);

  console.log('✅ Departments created');

  // ── Users ────────────────────────────────────────────────────
  const hashPass = await bcrypt.hash('Password@123', 12);

  const usersData = [
    {
      name: 'Alex Kumar', email: 'admin@nexushr.com', role: 'ADMIN' as const,
      position: 'CEO & Founder', departmentId: engineering.id,
      salary: 150000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    },
    {
      name: 'Priya Sharma', email: 'hr@nexushr.com', role: 'HR' as const,
      position: 'HR Manager', departmentId: hr.id,
      salary: 80000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
    },
    {
      name: 'Rahul Gupta', email: 'hr2@nexushr.com', role: 'HR' as const,
      position: 'HR Executive', departmentId: hr.id,
      salary: 55000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul',
    },
    {
      name: 'Arjun Mehta', email: 'employee@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'Senior Engineer', departmentId: engineering.id,
      salary: 90000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun',
    },
    {
      name: 'Divya Nair', email: 'divya@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'Frontend Developer', departmentId: engineering.id,
      salary: 75000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=divya',
    },
    {
      name: 'Kiran Patel', email: 'kiran@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'Sales Executive', departmentId: sales.id,
      salary: 60000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kiran',
    },
    {
      name: 'Sneha Reddy', email: 'sneha@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'Marketing Specialist', departmentId: marketing.id,
      salary: 65000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha',
    },
    {
      name: 'Vikram Singh', email: 'vikram@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'Backend Developer', departmentId: engineering.id,
      salary: 85000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vikram',
    },
    {
      name: 'Ananya Das', email: 'ananya@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'Financial Analyst', departmentId: finance.id,
      salary: 70000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya',
    },
    {
      name: 'Rohan Kapoor', email: 'rohan@nexushr.com', role: 'EMPLOYEE' as const,
      position: 'DevOps Engineer', departmentId: engineering.id,
      salary: 88000, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rohan',
    },
  ];

  const users = await Promise.all(
    usersData.map(async (u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          passwordHash: hashPass,
          isVerified: true,
          dateOfBirth: new Date(1990 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          joinDate: new Date(2022, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        },
      })
    )
  );

  console.log(`✅ ${users.length} users created`);

  // ── Leave Balances ───────────────────────────────────────────
  const year = new Date().getFullYear();
  await Promise.all(
    users.map((u) =>
      prisma.leaveBalance.upsert({
        where: { userId_year: { userId: u.id, year } },
        update: {},
        create: {
          userId: u.id, year,
          casual: 12, sick: 12, annual: 15,
          maternity: 90, paternity: 15,
          usedCasual: Math.floor(Math.random() * 4),
          usedSick: Math.floor(Math.random() * 3),
          usedAnnual: Math.floor(Math.random() * 5),
        },
      })
    )
  );

  console.log('✅ Leave balances created');

  // ── Attendance (last 90 days) ────────────────────────────────
  const employees = users.filter((u) => u.role === 'EMPLOYEE');
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'PRESENT', 'PRESENT', 'HALF_DAY'];

  for (let d = 90; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (const emp of employees) {
      const status = statuses[Math.floor(Math.random() * statuses.length)] as 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';
      const checkIn = status !== 'ABSENT'
        ? new Date(date.getTime() + (9 * 60 + (status === 'LATE' ? 20 + Math.floor(Math.random() * 60) : Math.floor(Math.random() * 15))) * 60000)
        : null;
      const checkOut = checkIn
        ? new Date(checkIn.getTime() + (status === 'HALF_DAY' ? 4 : 8 + Math.random()) * 3600000)
        : null;
      const workHours = checkIn && checkOut
        ? parseFloat(((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(2))
        : null;
      const lateMinutes = status === 'LATE' ? 20 + Math.floor(Math.random() * 60) : 0;

      await prisma.attendance.upsert({
        where: { userId_date: { userId: emp.id, date } },
        update: {},
        create: { userId: emp.id, date, status, checkIn, checkOut, workHours, lateMinutes },
      });
    }
  }

  console.log('✅ Attendance records created');

  // ── Leaves ───────────────────────────────────────────────────
  const leaveTypes: Array<'CASUAL' | 'SICK' | 'ANNUAL'> = ['CASUAL', 'SICK', 'ANNUAL'];
  const leaveStatuses: Array<'APPROVED' | 'REJECTED' | 'PENDING'> = ['APPROVED', 'APPROVED', 'APPROVED', 'REJECTED', 'PENDING'];

  for (const emp of employees.slice(0, 6)) {
    for (let i = 0; i < 3; i++) {
      const type = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];
      const startOffset = -(30 + Math.floor(Math.random() * 60));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + startOffset);
      const days = 1 + Math.floor(Math.random() * 3);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);

      await prisma.leave.create({
        data: {
          userId: emp.id, type, startDate, endDate, days,
          reason: `${type.toLowerCase()} leave request`,
          status,
          approvedById: status !== 'PENDING' ? users[1].id : null,
          approvedAt: status !== 'PENDING' ? new Date() : null,
        },
      });
    }
  }

  // Pending leaves for demo
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 3);
  const futureEnd = new Date(futureStart);
  futureEnd.setDate(futureEnd.getDate() + 2);

  await prisma.leave.create({
    data: {
      userId: employees[0].id, type: 'CASUAL',
      startDate: futureStart, endDate: futureEnd, days: 3,
      reason: 'Family function',
      status: 'PENDING',
    },
  });

  console.log('✅ Leave records created');

  // ── Payroll (last 6 months) ───────────────────────────────────
  for (let m = 5; m >= 0; m--) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);
    const month = date.getMonth() + 1;
    const payYear = date.getFullYear();

    for (const emp of employees) {
      const basic = emp.salary * 0.5;
      const hra = emp.salary * 0.25;
      const allowances = emp.salary * 0.1;
      const pf = basic * 0.12;
      const tax = emp.salary > 50000 ? emp.salary * 0.1 : 0;
      const netSalary = basic + hra + allowances - pf - tax;

      await prisma.payroll.upsert({
        where: { userId_month_year: { userId: emp.id, month, year: payYear } },
        update: {},
        create: {
          userId: emp.id, month, year: payYear,
          basic, hra, allowances,
          deductions: pf + tax, pf, tax,
          netSalary: parseFloat(netSalary.toFixed(2)),
          workingDays: 22, presentDays: 18 + Math.floor(Math.random() * 4),
          status: 'PAID',
          creditedAt: new Date(payYear, month - 1, 28),
        },
      });
    }
  }

  console.log('✅ Payroll records created');

  // ── Mood entries (last 30 days) ───────────────────────────────
  const moods: Array<'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'STRESSED' | 'BURNOUT'> = ['EXCELLENT', 'GOOD', 'GOOD', 'GOOD', 'NEUTRAL', 'NEUTRAL', 'STRESSED', 'EXCELLENT'];

  for (let d = 30; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);

    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const emp of employees.slice(0, 5)) {
      if (Math.random() > 0.7) continue; // Not all days
      const mood = moods[Math.floor(Math.random() * moods.length)];
      const energyLevel = 4 + Math.floor(Math.random() * 6);
      const stressLevel = 2 + Math.floor(Math.random() * 6);

      await prisma.moodEntry.upsert({
        where: { userId_date: { userId: emp.id, date } },
        update: {},
        create: { userId: emp.id, date, mood, energyLevel, stressLevel },
      });
    }
  }

  console.log('✅ Mood entries created');

  // ── Notifications ─────────────────────────────────────────────
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: employees[0].id,
        title: 'Leave Approved ✅',
        body: 'Your casual leave for 2 days has been approved.',
        type: 'LEAVE_APPROVED',
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: employees[0].id,
        title: 'Salary Credited 💰',
        body: 'Your salary has been credited to your account.',
        type: 'PAYROLL_CREDITED',
        isRead: true,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id, // HR
        title: 'New Leave Request',
        body: `${employees[0].name} applied for 3 days casual leave`,
        type: 'LEAVE_REQUEST',
        isRead: false,
      },
    }),
  ]);

  console.log('✅ Notifications created');

  // ── Recruitment ───────────────────────────────────────────────
  const jobs = await Promise.all([
    prisma.recruitment.create({
      data: {
        title: 'Senior Full Stack Developer',
        description: 'We are looking for a skilled Full Stack Developer to join our growing engineering team. You will work on cutting-edge products used by thousands of users.',
        requirements: '5+ years experience, React, Node.js, PostgreSQL, TypeScript',
        skills: JSON.stringify(['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS']),
        location: 'Bangalore / Remote',
        type: 'Full-time',
        salary: '₹18-28 LPA',
        departmentId: engineering.id,
        createdById: users[1].id,
        status: 'OPEN',
      },
    }),
    prisma.recruitment.create({
      data: {
        title: 'HR Business Partner',
        description: 'Join our people team to help build and maintain a world-class culture. You will partner with business leaders to drive HR initiatives.',
        requirements: '3+ years in HR, Strong communication, HRIS experience',
        skills: JSON.stringify(['HRIS', 'Employee Relations', 'Talent Management', 'Communication']),
        location: 'Mumbai',
        type: 'Full-time',
        salary: '₹10-16 LPA',
        departmentId: hr.id,
        createdById: users[1].id,
        status: 'OPEN',
      },
    }),
    prisma.recruitment.create({
      data: {
        title: 'Sales Development Representative',
        description: 'Drive revenue growth by identifying and qualifying new business opportunities. Work with a high-energy sales team.',
        requirements: '1-3 years sales experience, CRM tools, strong communication',
        skills: JSON.stringify(['Salesforce', 'Cold Calling', 'Lead Generation', 'CRM']),
        location: 'Delhi NCR',
        type: 'Full-time',
        salary: '₹6-10 LPA + incentives',
        departmentId: sales.id,
        createdById: users[1].id,
        status: 'OPEN',
      },
    }),
  ]);

  // Candidates for each job
  const candidateNames = [
    { name: 'Aditya Verma', email: 'aditya@email.com', score: 88 },
    { name: 'Bhavana Iyer', email: 'bhavana@email.com', score: 72 },
    { name: 'Chirag Shah', email: 'chirag@email.com', score: 91 },
    { name: 'Deepika Joshi', email: 'deepika@email.com', score: 65 },
    { name: 'Ethan Joseph', email: 'ethan@email.com', score: 78 },
  ];

  for (const job of jobs) {
    await Promise.all(
      candidateNames.map(async (c, i) =>
        prisma.candidate.create({
          data: {
            recruitmentId: job.id,
            name: c.name,
            email: c.email,
            aiScore: c.score,
            aiSummary: `Strong candidate with relevant experience. ${c.score >= 80 ? 'Highly recommended for interview.' : 'Good fit for initial screening.'}`,
            aiSkills: JSON.stringify(['React', 'Node.js', 'TypeScript'].slice(0, 2 + (i % 3))),
            aiStrengths: JSON.stringify(['Technical skills', 'Communication', 'Problem solving'].slice(0, 2 + (i % 2))),
            aiWeaknesses: JSON.stringify(['Limited leadership experience'].slice(0, i % 2)),
            status: i === 0 ? 'INTERVIEW' : i === 2 ? 'SCREENING' : 'APPLIED',
          },
        })
      )
    );
  }

  console.log('✅ Recruitment & candidates created');

  // ── Announcements ─────────────────────────────────────────────
  await Promise.all([
    prisma.announcement.create({
      data: {
        title: '🎉 Q2 All-Hands Meeting — July 15th',
        content: 'Join us for our quarterly all-hands meeting to discuss company performance, product roadmap, and celebrate team wins. Location: Main Conference Room, 3 PM.',
        isPinned: true,
      },
    }),
    prisma.announcement.create({
      data: {
        title: '🏖️ Updated Leave Policy — FY2024-25',
        content: 'We have updated our leave policy to include an additional 2 days of casual leave and flexible work-from-home options. Please review the updated HR handbook.',
        isPinned: false,
      },
    }),
    prisma.announcement.create({
      data: {
        title: '🚀 New Project Management Tool Rollout',
        content: 'Starting next week, all teams will transition to Linear for project management. Training sessions are scheduled. Check your calendars for invites.',
        isPinned: false,
      },
    }),
  ]);

  console.log('✅ Announcements created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  Admin:    admin@nexushr.com / Password@123');
  console.log('  HR:       hr@nexushr.com    / Password@123');
  console.log('  Employee: employee@nexushr.com / Password@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
