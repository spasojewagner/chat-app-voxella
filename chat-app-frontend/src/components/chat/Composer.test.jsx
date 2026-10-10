import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "../../stores/chat.js";
import { Composer } from "./Composer.jsx";

const conversation = (overrides = {}) => ({
  _id: "c1",
  participant: { _id: "p1", fullName: "Luka Jovanović" },
  blockedByMe: false,
  blockedMe: false,
  ...overrides,
});

function Harness({ conv }) {
  const [attachment, setAttachment] = useState(null);
  return <Composer conversation={conv} attachment={attachment} onAttachment={setAttachment} />;
}

let send;
beforeEach(() => {
  send = vi.fn();
  useChat.setState({ send });
});

describe("Composer", () => {
  it("sends with Enter and clears the box", async () => {
    const user = userEvent.setup();
    render(<Harness conv={conversation({ _id: "c-enter" })} />);
    const box = screen.getByLabelText("Message Luka Jovanović");

    await user.type(box, "Hello there{Enter}");

    expect(send).toHaveBeenCalledWith("c-enter", { text: "Hello there", file: null });
    expect(box).toHaveValue("");
  });

  it("starts a new line with Shift+Enter instead of sending", async () => {
    const user = userEvent.setup();
    render(<Harness conv={conversation({ _id: "c-shift" })} />);
    const box = screen.getByLabelText("Message Luka Jovanović");

    await user.type(box, "line one{Shift>}{Enter}{/Shift}line two");

    expect(send).not.toHaveBeenCalled();
    expect(box).toHaveValue("line one\nline two");
  });

  it("keeps the send button disabled until there is something to send", async () => {
    const user = userEvent.setup();
    render(<Harness conv={conversation({ _id: "c-empty" })} />);
    const button = screen.getByRole("button", { name: "Send" });

    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText("Message Luka Jovanović"), "   ");
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText("Message Luka Jovanović"), "x");
    expect(button).toBeEnabled();
  });

  it("refuses files that are not images before uploading anything", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { container } = render(<Harness conv={conversation({ _id: "c-file" })} />);

    await user.upload(container.querySelector("input[type=file]"), new File(["x"], "notes.txt", { type: "text/plain" }));

    expect(screen.queryByLabelText("Remove photo")).not.toBeInTheDocument();
  });

  it("shows an unblock option instead of the input when you blocked the person", () => {
    render(<Harness conv={conversation({ blockedByMe: true })} />);

    expect(screen.queryByLabelText("Message Luka Jovanović")).not.toBeInTheDocument();
    expect(screen.getByText(/You blocked Luka/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unblock" })).toBeInTheDocument();
  });

  it("says you can't reply when the other person blocked you", () => {
    render(<Harness conv={conversation({ blockedMe: true })} />);

    expect(screen.getByText("You can't reply to this conversation.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unblock" })).not.toBeInTheDocument();
  });
});
