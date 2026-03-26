export interface MethodologyFrameworkRulesDiff {
  added: string[];
  removed: string[];
}

export function diffMethodologyFrameworkRules(
  previousSlugs: string[],
  currentSlugs: string[],
): MethodologyFrameworkRulesDiff {
  const previousSet = new Set(previousSlugs);
  const currentSet = new Set(currentSlugs);

  return {
    added: currentSlugs.filter((s) => !previousSet.has(s)),
    removed: previousSlugs.filter((s) => !currentSet.has(s)),
  };
}
