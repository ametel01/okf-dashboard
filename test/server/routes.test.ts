import { describe, expect, test } from "bun:test";
import { handleRequest } from "../../src/server/index";

describe("server routes", () => {
  test("returns typed errors for invalid local load requests", async () => {
    const response = await handleRequest(
      new Request("http://127.0.0.1:4174/api/sources/local/load", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe("request_failed");
  });

  test("clears cache through the API", async () => {
    const response = await handleRequest(
      new Request("http://127.0.0.1:4174/api/cache/clear", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cleared: false });
  });
});
