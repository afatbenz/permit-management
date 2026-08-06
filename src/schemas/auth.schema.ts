import { z } from 'zod';

// Schema for Login
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Schema for Register
export const registerSchema = z.object({
  fullName: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string()
    .min(10, 'Minimum 10 digits')
    .regex(/^[0-9]+$/, 'Phone number must only contain digits'),
  companyId: z.string().min(1, 'Please select your company'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;
export type RegisterFormInputs = z.infer<typeof registerSchema>;
