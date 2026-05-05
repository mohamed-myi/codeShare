import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { AccessGate } from "../components/AccessGate.js";
import { server } from "./mocks/server.js";

function renderGate() {
  return render(
    <AccessGate>
      <div>App ready</div>
    </AccessGate>,
  );
}

describe("AccessGate", () => {
  it("renders children when the browser already has an access session", async () => {
    server.use(
      http.get("*/api/access/session", () => {
        return HttpResponse.json({ authenticated: true, label: "Recruiter" });
      }),
    );

    renderGate();

    await waitFor(() => {
      expect(screen.getByText("App ready")).toBeDefined();
    });
  });

  it("prompts for an invite code and unlocks after a valid login", async () => {
    server.use(
      http.get("*/api/access/session", () => {
        return HttpResponse.json({ authenticated: false });
      }),
      http.post("*/api/access/login", () => {
        return HttpResponse.json({ authenticated: true, label: "Recruiter" });
      }),
    );

    renderGate();

    await waitFor(() => {
      expect(screen.getByLabelText("Invite code")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Invite code"), {
      target: { value: "demo-code" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(screen.getByText("App ready")).toBeDefined();
    });
  });

  it("shows an error when invite login fails", async () => {
    server.use(
      http.get("*/api/access/session", () => {
        return HttpResponse.json({ authenticated: false });
      }),
      http.post("*/api/access/login", () => {
        return HttpResponse.json({ error: "Invalid invite code." }, { status: 401 });
      }),
    );

    renderGate();

    await waitFor(() => {
      expect(screen.getByLabelText("Invite code")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Invite code"), {
      target: { value: "bad-code" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid invite code.")).toBeDefined();
    });
  });
});
