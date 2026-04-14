export const DomTaskSchema = z.object({
    expedienteId: z.string(),
    action: z.enum(['CHECK_NORMATIVE', 'SUBMIT_FORM']),
  });