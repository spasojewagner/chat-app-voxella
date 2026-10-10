import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "../../hooks/useDebounce.js";
import { api, errorMessage } from "../../lib/api.js";
import { useChat } from "../../stores/chat.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Dialog } from "../ui/Dialog.jsx";
import { inputClass } from "../ui/Field.jsx";
import { Spinner } from "../ui/Spinner.jsx";

export function NewChatDialog({ open, onClose }) {
  const navigate = useNavigate();
  const online = useChat((s) => s.online);
  const [query, setQuery] = useState("");
  const search = useDebounce(query.trim(), 250);
  const [state, setState] = useState({ loading: false, people: [], error: "" });
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api
      .get("/users", { params: { search, limit: 20 } })
      .then(({ data }) => !cancelled && setState({ loading: false, people: data, error: "" }))
      .catch((error) => !cancelled && setState({ loading: false, people: [], error: errorMessage(error) }));
    return () => {
      cancelled = true;
    };
  }, [open, search]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  async function start(person) {
    setOpening(person._id);
    try {
      const id = await useChat.getState().startConversation(person._id);
      onClose();
      navigate(`/c/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setOpening(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="New message" description="Search by name, or type someone's exact email.">
      <label className="relative block">
        <span className="sr-only">Search people</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or email"
          className={`${inputClass} pl-10`}
        />
      </label>

      <div className="scroll-thin -mx-2 mt-3 h-[min(360px,50vh)] overflow-y-auto">
        {!search && state.people.length > 0 && (
          <p className="px-2 pb-1 text-xs font-medium tracking-wide text-faint uppercase">People on VoxElla</p>
        )}
        {state.loading && state.people.length === 0 && (
          <div className="grid h-full place-items-center text-muted">
            <Spinner className="size-5" />
          </div>
        )}
        {state.error && <p className="px-2 py-8 text-center text-sm text-danger">{state.error}</p>}
        {!state.loading && !state.error && state.people.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted">No one found{search ? ` for “${search}”` : ""}.</p>
        )}
        <ul>
          {state.people.map((person) => (
            <li key={person._id}>
              <button
                type="button"
                onClick={() => start(person)}
                disabled={Boolean(opening)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2 disabled:opacity-60"
              >
                <Avatar name={person.fullName} src={person.profilePic} size="md" online={Boolean(online[person._id])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{person.fullName}</span>
                  <span className="block truncate text-sm text-muted">
                    {online[person._id] ? "Online" : person.status || " "}
                  </span>
                </span>
                {opening === person._id && <Spinner className="text-muted" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
