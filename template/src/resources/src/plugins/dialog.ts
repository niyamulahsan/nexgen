import type { App } from "vue";

type PromptOptions = {
  limit?: number;
  placeholder?: string;
  defaultValue?: string;
};

type DialogClient = {
  alert: (text?: string) => Promise<void>;
  confirm: (text?: string) => Promise<boolean>;
  prompt: (text?: string, options?: PromptOptions) => Promise<{ ok: boolean; value: string }>;
};

function hostNode() {
  return document.querySelector("#modal-show") || document.body;
}

function siteLabel() {
  return `${location.protocol}//${location.hostname}`;
}

function buildShell(content: string) {
  const root = document.createElement("div");
  root.className = "position-fixed w-100 h-100 top-0 start-0";
  root.style.background = "rgba(0, 0, 0, .5)";
  root.style.zIndex = "100000";
  root.innerHTML = content;
  return root;
}

function closeShell(shell: HTMLElement) {
  if (shell.parentElement) shell.parentElement.removeChild(shell);
}

export const dialog: DialogClient = {
  alert(text = "") {
    return new Promise<void>((resolve) => {
      const shell = buildShell(`
        <div class='card position-absolute top-50 start-50 translate-middle border' style='width:300px'>
          <div class='card-header d-flex justify-content-between align-items-center px-2 py-1 bg-white border-0'>
            <span class='d-flex align-items-center'>
              <i class="bi bi-exclamation-circle"></i> <span class='ms-2'>${siteLabel()}</span>
            </span>
            <button class='btn btn-sm p-0' type='button' data-dialog='close'>
              <i class='bi bi-x fs-3'></i>
            </button>
          </div>
          <div class='card-body overflow-x-hidden overflow-y-scroll p-2 text-center' style='max-height:200px'>
            ${text}
          </div>
          <div class='card-footer d-flex justify-content-end align-items-center px-2 py-1 bg-white border-0'>
            <button type='button' class='btn btn-primary btn-sm' data-dialog='ok'>OK</button>
          </div>
        </div>
      `);

      shell.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        const action = target.closest("[data-dialog]")?.getAttribute("data-dialog");
        if (action === "ok" || action === "close") {
          closeShell(shell);
          resolve();
        }
      });

      hostNode().appendChild(shell);
    });
  },

  confirm(text = "") {
    return new Promise<boolean>((resolve) => {
      const shell = buildShell(`
        <div class='card position-absolute top-50 start-50 translate-middle border' style='width:300px'>
          <div class='card-header d-flex justify-content-between align-items-center px-2 py-1 bg-white border-0'>
            <span class='d-flex align-items-center'>
              <i class="bi bi-globe"></i> <span class='ms-2'>${siteLabel()}</span>
            </span>
            <button class='btn btn-sm p-0' type='button' data-dialog='cancel'>
              <i class='bi bi-x fs-3'></i>
            </button>
          </div>
          <div class='card-body overflow-x-hidden overflow-y-scroll p-2 text-center' style='max-height:200px'>
            ${text}
          </div>
          <div class='card-footer d-flex justify-content-end align-items-center px-2 py-1 bg-white border-0'>
            <button type='button' class='btn btn-primary btn-sm' data-dialog='ok'>OK</button>
            <button type='button' class='btn btn-secondary btn-sm ms-1' data-dialog='cancel'>Cancel</button>
          </div>
        </div>
      `);

      shell.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        const action = target.closest("[data-dialog]")?.getAttribute("data-dialog");
        if (action === "ok") {
          closeShell(shell);
          resolve(true);
        }
        if (action === "cancel") {
          closeShell(shell);
          resolve(false);
        }
      });

      hostNode().appendChild(shell);
    });
  },

  prompt(text = "", options: PromptOptions = {}) {
    const { limit = 0, placeholder = "Remarks...", defaultValue = "" } = options;

    return new Promise<{ ok: boolean; value: string }>((resolve) => {
      const shell = buildShell(`
        <div class='card position-absolute top-50 start-50 translate-middle border' style='width:300px'>
          <div class='card-header d-flex justify-content-between align-items-center px-2 py-1 bg-white border-0'>
            <span class='d-flex align-items-center'>
              <i class="bi bi-globe"></i> <span class='ms-2'>${siteLabel()}</span>
            </span>
            <button class='btn btn-sm p-0' type='button' data-dialog='cancel'>
              <i class='bi bi-x fs-3'></i>
            </button>
          </div>
          <div class='card-body overflow-x-hidden overflow-y-scroll p-2 position-relative'>
            ${text} <sup style='font-size: 10px'>${limit} char</sup>
            <textarea class='form-control border-dark' rows='4' placeholder='${placeholder}' data-dialog='input' ${limit > 0 ? `maxlength='${limit}'` : ""}>${defaultValue}</textarea>
          </div>
          <div class='card-footer d-flex justify-content-end align-items-center px-2 py-1 bg-white border-0'>
            <button type='button' class='btn btn-primary btn-sm' data-dialog='ok'>OK</button>
            <button type='button' class='btn btn-secondary btn-sm ms-1' data-dialog='cancel'>Cancel</button>
          </div>
        </div>
      `);

      shell.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        const action = target.closest("[data-dialog]")?.getAttribute("data-dialog");
        const input = shell.querySelector(
          "textarea[data-dialog='input']"
        ) as HTMLTextAreaElement | null;

        if (action === "ok") {
          closeShell(shell);
          resolve({ ok: true, value: input?.value || "" });
        }
        if (action === "cancel") {
          closeShell(shell);
          resolve({ ok: false, value: "" });
        }
      });

      hostNode().appendChild(shell);
    });
  }
};

export const DialogPlugin = {
  install(app: App) {
    app.config.globalProperties.$dialog = dialog;
  }
};

declare module "vue" {
  interface ComponentCustomProperties {
    $dialog: DialogClient;
  }
}
