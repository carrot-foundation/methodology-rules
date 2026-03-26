export interface FrameworkRulesDiff {
  added: string[];
  removed: string[];
}

export function diffFrameworkRules(
  previousSlugs: string[],
  currentSlugs: string[],
): FrameworkRulesDiff {
  const previousSet = new Set(previousSlugs);
  const currentSet = new Set(currentSlugs);

  return {
    added: currentSlugs.filter((s) => !previousSet.has(s)),
    removed: previousSlugs.filter((s) => !currentSet.has(s)),
  };
}
