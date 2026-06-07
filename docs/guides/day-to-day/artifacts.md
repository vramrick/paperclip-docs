# Artifacts

As your agents work, they don't just leave comments — they produce things. A drafted document, a generated image, a rendered video, a CSV export, a file they attached to an issue. Those tangible outputs are **artifacts**, and the **Artifacts** page is the one place where you can see every one of them across your whole company, without opening each issue to go hunting.

Think of it as your company's shelf of finished and in-progress work product. If an agent made it while doing a task, it shows up here.

---

## What counts as an artifact

An artifact is something an agent produced in the course of doing work. Paperclip pulls three kinds of output into the Artifacts page and presents them as one unified list:

- **Documents** — keyed documents an agent wrote or revised on an issue (for example a plan, a brief, or a report). System-managed documents are filtered out, so you only see the real deliverables.
- **Attachments** — files an agent attached directly to an issue: images, PDFs, videos, CSVs, JSON, and so on.
- **Work products** — results an agent handed back as the formal output of a task, including ones that point at an attached file.

Each artifact carries the context you need to make sense of it: the issue it came from, the project (when there is one), the agent that created it, and when it was last updated. Every card links straight back to the exact spot on the originating issue, so one click takes you from the shelf to the source.

Artifacts are scoped to the company you're viewing. Switch companies and you see that company's shelf instead.

---

## Opening the Artifacts page

Open **Artifacts** from the left sidebar. By default it shows your company's artifacts grouped into stacks (more on that below), most recently updated first, and it loads more as you scroll.

When there's nothing to show yet, the page says so plainly — for a brand-new company you'll see "No artifacts yet. Outputs attached to issues will appear here." Once your agents start completing work, the shelf fills in on its own.

---

## Filtering by type

A row of type filters lets you narrow the shelf to one kind of output at a time:

- **All** — everything (the default)
- **Images**
- **Videos**
- **Documents**
- **Text**
- **Files** — anything that isn't an image, video, or text-like file

Pick a filter to focus. For example, switch to **Videos** when you want to review every recorded result an agent produced, or **Documents** when you're catching up on written deliverables.

There's also a search box at the top. Type a few words and the list narrows to artifacts whose title, summary, or originating issue match — and the search is reflected in the page URL, so a filtered view is easy to share or bookmark.

---

## Stacks: artifacts grouped by task

A single task can produce several artifacts, and a big piece of work can fan out across many sub-tasks. To keep that from becoming an undifferentiated wall of cards, Artifacts groups outputs into **stacks**.

Use the grouping control (the layered-squares button next to the filters) to choose how artifacts are bundled:

- **Task** — group everything by the individual task that produced it. This is the default view.
- **Parent task** — roll sub-task artifacts up under their top-level parent, so all the outputs from one larger initiative land in a single stack.
- **None** — turn grouping off and see a flat grid of every artifact.

In a grouped view, each stack is a card showing the task it belongs to, how many artifacts it holds, and a small preview of the first few. Click a stack to open it and see just that task's artifacts; an **All stacks** link takes you back to the overview. Your active type filter and search stay applied as you move in and out of a stack, and the grouping you choose is preserved in the URL so the view is shareable.

---

## Viewing artifacts

Cards are built to let you understand an artifact at a glance, without downloading it first:

- **Documents** show a clean text preview — markdown formatting is stripped down to readable plain text so you can skim the gist.
- **Text files** (and text-like files such as JSON or XML) show a short preview of their contents.
- **Images and videos** render as visual previews, so a generated video shows a thumbnail right on the card rather than an anonymous file row.
- **Other files** appear as a card with their type, ready to open or download.

Where an artifact came from a real file, the card gives you the means to open it inline or download it. And because every card deep-links back to its originating issue, you can always jump to the full context — the conversation, the run that produced it, and any related work — straight from the shelf.

---

## A quick mental model

- **Artifacts page** — every output your agents produced, company-wide, in one place.
- **Type filters** — narrow to images, videos, documents, text, or files.
- **Stacks** — artifacts grouped by their task (or rolled up by parent task), so related outputs stay together.
- **Cards** — previews you can read or watch in place, each linking back to the issue it came from.

You now know how to find, filter, and review everything your agents have made. When you want to dig into the work behind a given artifact, follow its link back to the issue and pick up the thread there.
