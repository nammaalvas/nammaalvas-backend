import User from '../models/User.js';

export const seedAdminUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Already initialized
    }

    const defaultPassword = 'Admin@123456';
    const usersToSeed = [
      {
        name: 'Dr. Peter Fernandes (Principal)',
        email: 'principal@aiet.org.in',
        password: defaultPassword,
        role: 'Principal',
        department: 'Principal Office',
      },
      {
        name: 'Administrative Officer (AO)',
        email: 'ao@aiet.org.in',
        password: defaultPassword,
        role: 'AO',
        department: 'Administrative Office',
      },
      {
        name: 'Admission Office Staff',
        email: 'admission@aiet.org.in',
        password: defaultPassword,
        role: 'Admission Staff',
        department: 'Admissions Cell',
      },
      {
        name: 'Super System Administrator',
        email: 'superadmin@aiet.org.in',
        password: defaultPassword,
        role: 'Super Admin',
        department: 'IT Systems',
      },
    ];

    for (const userData of usersToSeed) {
      await User.create(userData);
    }
    console.log('✅ Initial Admin & RBAC accounts seeded successfully.');
  } catch (error) {
    console.error('⚠️ Admin seed failed:', error.message);
  }
};
