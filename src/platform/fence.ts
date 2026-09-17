const FORBIDDEN = [
  /@prisma\/client/,
  /from\s+["'].*platform\/db["']/,
  /\bnew PrismaClient\b/,
];

export function violatesFence(source: string): boolean {
  return FORBIDDEN.some((pattern) => pattern.test(source));
}
