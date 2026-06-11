export async function fetchProjectStatusFromGAS(url: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Network response was not ok: " + response.statusText);
  }

  return await response.json();
}

