export type NeonField = { name?: string };

export type NeonQueryResponse = {
  fields?: NeonField[];
  rows?: Array<Array<string | null>>;
  rowCount?: number;
};

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostParts = parsed.hostname.split(".");
  if (hostParts.length < 2) throw new Error("Database host is invalid.");
  hostParts[0] = "api";
  return `https://${hostParts.join(".")}/sql`;
}

function cleanErrorDetail(value: string) {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[database connection redacted]")
    .replace(/password=[^\s"']+/gi, "password=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function leadNeonQuery(
  query: string,
  params: Array<string | null> = [],
) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Lead storage is not configured.");

  const response = await fetch(getNeonEndpoint(connectionString), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = cleanErrorDetail(await response.text().catch(() => ""));
    throw new Error(
      `Lead query failed with ${response.status}${detail ? `: ${detail}` : "."}`,
    );
  }
  return (await response.json()) as NeonQueryResponse;
}

export function neonRowsToObjects(result: NeonQueryResponse) {
  const fieldNames = (result.fields ?? []).map((field) => field.name ?? "");
  return (result.rows ?? []).map((row) =>
    Object.fromEntries(fieldNames.map((field, index) => [field, row[index] ?? null])),
  ) as Array<Record<string, string | null>>;
}
