
import z from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Standard user signup (e.g. adding a staff member)
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  title: z.string().optional(),
  role: z.string().optional(),
  tenantId: z.string().optional(),
  branchId: z.string().optional(),
});

// Full Tenant Registration Schema
export const registerTenantSchema = z.object({
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    type: z.enum(['Companion', 'Livestock', 'Mixed']),
    country: z.string(),
    timezone: z.string(),
    currency: z.string(),
    plan: z.enum(['STARTER', 'STANDARD', 'PREMIUM']),
    status: z.enum(['ACTIVE', 'SUSPENDED']),
    features: z.any(), // JSON object
    subscriptionId: z.string().optional(),
    paymentPlanId: z.string().optional(),
    nextPaymentDate: z.string().optional(),
    billingCycle: z.string().optional(),
    isTrial: z.boolean().optional(),
    autoRenew: z.boolean().optional(),
    subscriptionStatus: z.string().optional()
  }),
  admin: z.object({
    id: z.string(),
    title: z.string(),
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string(), // PARENT_ADMIN
    tenantId: z.string(),
    joinedDate: z.string()
  }),
  branch: z.object({
    id: z.string()
  })
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;
