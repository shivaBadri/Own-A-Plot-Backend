import { z } from "zod";

/**
 * Every write path -- API route and admin form alike -- validates through this
 * file. The JSON columns (advantages, details, landscape, nearby) are validated
 * structurally, not just as `unknown`; an admin cannot save a malformed row that
 * would later blow up a public page.
 */

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

// ---------- JSON row shapes ----------

export const richRowSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().default(""),
  image: z.string().trim().default(""),
});

export const detailRowSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  value: z.string().trim().default(""),
});

export const nearbyRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  distance: z.string().trim().default(""),
});

// ---------- Projects / Ventures ----------

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters"),
  location: z.string().trim().min(2, "Location is required"),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED"]),
  amenities: z.array(z.string().trim().min(1)).default([]),
  isPublished: z.boolean().default(false),
  coverImage: optionalUrl,
  seoTitle: optionalText,
  seoDescription: optionalText,

  // Editorial
  tagline: optionalText,
  region: optionalText,
  totalAcres: z
    .number()
    .positive("Extent must be greater than zero")
    .nullable()
    .optional(),
  heroImage: optionalUrl,
  heroVideo: optionalUrl,
  accent: z.enum(["OLIVE", "EARTH", "BARK"]).default("OLIVE"),
  gallery: z.array(z.string().trim().url()).default([]),

  storyEyebrow: optionalText,
  storyTitle: optionalText,
  storyBody: z.array(z.string().trim().min(1)).default([]),

  advantages: z.array(richRowSchema).default([]),
  details: z.array(detailRowSchema).default([]),
  landscape: z.array(richRowSchema).default([]),
  nearby: z.array(nearbyRowSchema).default([]),

  address: optionalText,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  mapEmbed: optionalText,

  brochureUrl: optionalUrl,
  brochureFileName: optionalText,
  brochureFileSize: optionalText,

  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const projectUpdateSchema = projectSchema.partial();

// ---------- Plots ----------

export const plotSchema = z.object({
  plotNumber: z.string().trim().min(1, "Plot number is required"),
  sizeSqft: z.number().positive("Size must be greater than zero"),
  price: z.number().nonnegative("Price cannot be negative"),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD"]),
  facing: optionalText,
  description: optionalText,
  priceOnRequest: z.boolean().default(false),
  projectId: z.string().trim().min(1, "A venture must be selected"),
});

export const plotUpdateSchema = plotSchema.partial();

// ---------- Enquiries ----------

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20),
  message: z.string().trim().max(2000).optional(),
  interest: z.string().trim().max(200).optional(),
  source: z.string().trim().max(200).optional(),
  projectId: optionalText,
  plotId: optionalText,
  /**
   * Honeypot. Real users never see this field, so anything in it is a bot.
   * Declared as "must be empty" so the route can 200 silently without writing.
   */
  company: z.string().max(0).optional(),
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]).optional(),
  notes: z.string().trim().max(4000).optional(),
});

// ---------- Auth / Admin ----------

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    avatarUrl: optionalUrl,
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Enter your current password to set a new one",
    path: ["currentPassword"],
  });

// ---------- Settings ----------

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required"),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  contactPhone: optionalText,
  address: optionalText,
  officeHours: optionalText,
  footerTagline: optionalText,
  defaultSeoTitle: optionalText,
  defaultSeoDescription: optionalText,
  socialLinks: z
    .object({
      facebook: optionalUrl,
      instagram: optionalUrl,
      twitter: optionalUrl,
      linkedin: optionalUrl,
      youtube: optionalUrl,
    })
    .partial()
    .optional(),
});

// ---------- CMS ----------

export const cmsSchema = z.object({
  key: z.string().trim().min(1),
  content: z.record(z.string(), z.unknown()),
});

// ---------- Media ----------

export const mediaUpdateSchema = z.object({
  alt: z.string().trim().max(300).optional(),
});

// ---------- Query params ----------

/** Shared list-query parser. Coerces URL strings and clamps `perPage`. */
export const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().max(40).optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type PlotInput = z.infer<typeof plotSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
