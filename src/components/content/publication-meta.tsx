export function formatPublicationDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function PublicationMeta({
  publishedOn,
  modifiedOn,
  byline = "Rukh Labs",
}: {
  publishedOn: string;
  modifiedOn: string;
  byline?: string;
}) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/48">
      <span>By {byline}</span>
      <span aria-hidden>•</span>
      <time dateTime={publishedOn}>Published {formatPublicationDate(publishedOn)}</time>
      <span aria-hidden>•</span>
      <time dateTime={modifiedOn}>Updated {formatPublicationDate(modifiedOn)}</time>
    </p>
  );
}
