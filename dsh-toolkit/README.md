# DSH toolkit

One DeepSeek Harness bundle with three features:

1. **Archived sessions** — lists archived sessions and deletes their data from disk. Settings tab and two routes.
2. **Agent notifications** — desktop, in-window, and Telegram notices when a task finishes or waits for your answer. Settings rows and two routes.
3. **ASD-STE100 writing rule** — adds a Simplified Technical English rule to every agent system prompt. A "Writing style" tab toggles it.

## Install from this repository

On the machine that runs DeepSeek Harness:

1. Clone this repository anywhere outside the profile directory, for example `git clone <repository-url> dsh-toolkit`.
2. Ask the agent to install the bundle with `plugin_manager` `install_bundle`, using the absolute path of the cloned directory as the target. Or use the GUI: Settings → Plugins → install a bundle from the local directory.
3. Refresh the page and open Settings → Toolkit.

Each feature keeps its own row id (`toolkit-ui`, `toolkit-archived-sessions`, `toolkit-agent-notify`, `toolkit-asd-ste100`), so you can disable one feature without a rebuild.

## Configuration

- **ASD-STE100**: `enabled: false` in the `toolkit-asd-ste100` row config turns the rule off. The "Writing style" tab writes this value.
- **Notifications**: browser preferences are saved in `localStorage`. Telegram chat id and kinds come from the `toolkit-agent-notify` row config under `telegram`.
- **Telegram token**: set the `TELEGRAM_BOT_TOKEN` credential in the Harness credential store.

## Development

Plain JavaScript, no build step. Check syntax with `node --check <file>` before you install. The package links into the profile with `pnpm link`, so edits in the cloned directory apply after a page reload or plugin re-enable.
