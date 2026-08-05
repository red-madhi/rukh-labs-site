export function shouldShowUpdatedDate(publishedOn: string, modifiedOn: string) {
  return modifiedOn !== publishedOn;
}
