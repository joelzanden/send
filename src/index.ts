import mime from "mime/lite";
import { nanoid } from "./lib/nanoid";

export default {
	async fetch(request, env) {
		try {
			const auth = request.headers.get("Authorization");
			if (auth !== `Bearer ${env.DROP_DROP_API_KEY}`) {
				return new Response("Unauthorized", { status: 401 });
			}

			if (request.method === "POST") {
				// Parse multipart form data
				const formData = await request.formData();
				const file = formData.get("file");

				if (!(file && file instanceof File)) {
					return new Response("No file received", { status: 400 });
				}

				// Try to get MIME type from file name extension
				const extension = file.name.split(".").pop();
				const mimeType =
					mime.getType(extension || "") ||
					file.type ||
					"application/octet-stream";

				const fileId = nanoid();

				// Upload file to R2
				await env.SEND_BUCKET.put(`uploads/${fileId}`, file.stream(), {
					httpMetadata: { contentType: mimeType },
					customMetadata: {
						fileName: file.name,
						fileSize: file.size.toString(),
						fileType: mimeType,
					},
				});

				// Return the public URL
				return new Response(`https://dropdrop.download/${fileId}`, {
					status: 201,
				});
			}

			if (request.method === "GET") {
				const url = new URL(request.url);

				if (url.pathname === "/") {
					return new Response("send");
				}
				if (url.pathname === "/favicon.ico") {
					return new Response(
						`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 16 16'><text x='0' y='14'>💌</text></svg>`,
						{ headers: { "Content-Type": "image/svg+xml" } },
					);
				}

				const fileId = url.pathname.slice(1);

				// Fetch the file from R2
				const file = await env.SEND_BUCKET.get(`uploads/${fileId}`);
				if (!file) {
					return new Response("File not found", { status: 404 });
				}

				// Get the original file name from custom metadata
				const fileName =
					file.customMetadata?.fileName || "downloaded-file";
				const fileType =
					file.customMetadata?.fileType || "application/octet-stream";
				const headers = new Headers();
				headers.set(
					"Content-Disposition",
					`attachment; filename="${fileName}"`,
				);
				headers.set("Content-Type", fileType);
				return new Response(file.body, { headers });
			}

			return new Response("Method not allowed", { status: 405 });
		} catch (_error) {
			return new Response("Internal Server Error", { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
