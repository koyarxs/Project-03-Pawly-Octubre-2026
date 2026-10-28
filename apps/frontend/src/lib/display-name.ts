/** Remove sample labels at display time, without changing stored records. */
export function displayName(value: string): string {
  return value
    .replace(/\[\s*(?:demo|demostraci[oó]n)\s*\]/giu, "")
    .replace(/\(\s*(?:demo|demostraci[oó]n)\s*\)/giu, "")
    .replace(/^\s*(?:demo|demostraci[oó]n)\s*[:·–—-]\s*/iu, "")
    .replace(/\s*[·–—-]\s*(?:demo|demostraci[oó]n)\s*$/iu, "")
    .replace(/\s+(?:demo|demostraci[oó]n)\s*$/iu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
