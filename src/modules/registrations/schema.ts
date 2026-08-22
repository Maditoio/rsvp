import { z } from "zod";
import { emailFieldSchema } from "@/lib/validation";

export const registrationSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: emailFieldSchema,
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(160).optional().or(z.literal("")),
  jobTitle: z.string().max(160).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  attendanceDates: z.array(z.string()).optional(),
  dietary: z.string().max(400).optional().or(z.literal("")),
  accessibility: z.array(z.string()).optional(),
  accommodation: z.string().max(200).optional().or(z.literal("")),
  airportTransfer: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
