export async function fetchFirstProblemId(
  serverUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(`${serverUrl}/api/problems`);
  if (!response.ok) {
    throw new Error(`Failed to fetch problems: ${response.status}`);
  }

  const body = (await response.json()) as { problems: Array<{ id: string }> };
  if (body.problems.length === 0) {
    throw new Error("No problems found in database");
  }

  return body.problems[0].id;
}
