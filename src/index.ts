import { nanoid } from "./lib/nanoid";
import mime from "mime/lite";

export default {
    async fetch(request, env) {
        try {
            if (request.method === "POST") {
                // Parse multipart form data
                const formData = await request.formData();
                console.log("formData", formData);
                const file = formData.get("file");

                if (!file || !(file instanceof File)) {
                    return new Response("No file uploaded", { status: 400 });
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

                if (url.pathname === "/") return new Response("send");
                if (url.pathname === "/favicon.ico")
                    return new Response(
                        `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 16 16'><text x='0' y='14'>💌</text></svg>`,
                        { headers: { "Content-Type": "image/svg+xml" } },
                    );

                const fileId = url.pathname.slice(1); // Get the fileId from the URL

                // Fetch the file from R2
                const file = await env.SEND_BUCKET.get(`uploads/${fileId}`);
                if (!file)
                    return new Response("File not found", { status: 404 });

                // Get the original file name from custom metadata
                const fileName =
                    file.customMetadata?.fileName || "downloaded-file";
                const fileType =
                    file.customMetadata?.fileType || "application/octet-stream";
                const fileSize =
                    file.customMetadata?.fileSize || "unknown size";

                // Detect if the request comes from a browser or CLI
                const userAgent = request.headers.get("User-Agent") || "";
                const isBrowser = userAgent.includes("Mozilla");

                if (isBrowser) {
                    // Get the original file name and metadata from custom metadata

                    // Serve an HTML page with file metadata and a download button
                    return new Response(
                        `<!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Download ${fileName}</title>
                            </head>
                            <body>
                                <h1>${fileName} (${fileId})</h1>
                                <p><strong>File Size:</strong> ${fileSize} bytes</p>
                                <p><strong>File Type:</strong> ${fileType}</p>
                                <a href="/${fileId}?download=true" download="${fileName}">
                                    <button>Download</button>
                                </a>
                            </body>
                            </html>`,
                        { headers: { "Content-Type": "text/html" } },
                    );
                }

                // Check if download is requested via URL param or the file is being accessed via curl
                if (url.searchParams.get("download") || !isBrowser) {
                    const headers = new Headers();
                    headers.set(
                        "Content-Disposition",
                        `attachment; filename="${fileName}"`,
                    );
                    headers.set("Content-Type", fileType);
                    return new Response(file.body, { headers });
                }

                // Serve the file as a response
                return new Response(file.body, {
                    headers: { "Content-Type": fileType },
                });
            }

            return new Response("Method not allowed", { status: 405 });
        } catch (error) {
            console.error("Error processing request", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    },
} satisfies ExportedHandler<Env>;
