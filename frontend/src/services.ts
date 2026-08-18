export async function getNightcore(trackQuery: string) {
  const url = "http://localhost:3001/process";
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ trackQuery }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Response: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error) console.error(error.message);
  }
}
