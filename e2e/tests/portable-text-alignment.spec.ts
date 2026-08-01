import { test, expect } from "../fixtures";

function apiHeaders(token: string, baseUrl: string) {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
		"X-EmDash-Request": "1",
		Origin: baseUrl,
	};
}

test("renders Portable Text block alignment on public pages", async ({ page, serverInfo }) => {
	const { baseUrl, token } = serverInfo;
	const headers = apiHeaders(token, baseUrl);
	const slug = `portable-text-alignment-${Date.now()}`;
	const createResponse = await fetch(`${baseUrl}/_emdash/api/content/posts`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			data: {
				title: "Portable Text Alignment",
				body: [
					{
						_type: "block",
						_key: "center-block",
						style: "normal",
						textAlign: "center",
						children: [{ _type: "span", _key: "center-span", text: "Centered text" }],
						markDefs: [],
					},
					{
						_type: "block",
						_key: "right-block",
						style: "h2",
						textAlign: "right",
						children: [{ _type: "span", _key: "right-span", text: "Right-aligned text" }],
						markDefs: [],
					},
					{
						_type: "block",
						_key: "justify-block",
						style: "normal",
						textAlign: "justify",
						children: [{ _type: "span", _key: "justify-span", text: "Justified text" }],
						markDefs: [],
					},
					{
						_type: "block",
						_key: "default-block",
						style: "normal",
						children: [{ _type: "span", _key: "default-span", text: "Default text" }],
						markDefs: [],
					},
				],
			},
			slug,
		}),
	});
	expect(createResponse.ok).toBe(true);
	const createData = (await createResponse.json()) as {
		data?: { item?: { id?: string }; id?: string };
	};
	const postId = createData.data?.item?.id ?? createData.data?.id;
	if (!postId) throw new Error("Created post response did not include an id");

	try {
		const publishResponse = await fetch(
			`${baseUrl}/_emdash/api/content/posts/${postId}/publish`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({}),
			},
		);
		expect(publishResponse.ok).toBe(true);

		await page.goto(`/posts/${slug}`);

		await expect(page.locator("#body p", { hasText: "Centered text" })).toHaveCSS(
			"text-align",
			"center",
		);
		await expect(page.locator("#body h2", { hasText: "Right-aligned text" })).toHaveCSS(
			"text-align",
			"right",
		);
		await expect(page.locator("#body p", { hasText: "Justified text" })).toHaveCSS(
			"text-align",
			"justify",
		);

		const defaultBlock = page.locator("#body p", { hasText: "Default text" });
		const inheritedTextAlign = await page
			.locator("#body")
			.evaluate((element) => getComputedStyle(element).textAlign);
		await expect(defaultBlock).toHaveCSS("text-align", inheritedTextAlign);
		await expect(defaultBlock).not.toHaveClass(/has-text-align-/);
	} finally {
		await fetch(`${baseUrl}/_emdash/api/content/posts/${postId}`, {
			method: "DELETE",
			headers,
		}).catch(() => {});
		await fetch(`${baseUrl}/_emdash/api/content/posts/${postId}/permanent`, {
			method: "DELETE",
			headers,
		}).catch(() => {});
	}
});
