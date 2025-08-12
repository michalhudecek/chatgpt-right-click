import * as vscode from "vscode";

async function callOpenAI(model: string, apiKey: string, content: string): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "You are a precise programming assistant." },
        { role: "user", content }
      ]
    })
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${t}`);
  }
  const data = await resp.json() as any;
  // Responses API: first output_text convenience field if present, else stitch from output
  if (data.output_text) return data.output_text;
  if (Array.isArray(data.output)) {
    return data.output.map((p: any) => (p?.content?.map((c: any) => c?.text || "").join("") || "")).join("");
  }
  return JSON.stringify(data);
}

let chatgptOutputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("chatgpt-right-click.runOnSelection", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.document.getText(editor.selection);
    if (!selection?.trim()) {
      vscode.window.showWarningMessage("Select some text first.");
      return;
    }

    const cfg = vscode.workspace.getConfiguration("chatgpt-right-click");
    const apiKey = cfg.get<string>("openaiApiKey") || "";
    const defaultModel = cfg.get<string>("model") || "gpt-4.1-mini";
  const prompts = (cfg.get<any[]>("prompts") || []) as { label: string; template: string; model?: string }[];

    if (!apiKey) {
      vscode.window.showErrorMessage("Set ChatGPT Right Click: OpenAI API Key in Settings.");
      return;
    }


    const pickItems: { label: string; template: string; model?: string }[] = [
      ...prompts.map(p => ({ label: p.label, template: p.template, model: p.model })),
      { label: "Custom…", template: "", model: undefined }
    ];

    const picked = await vscode.window.showQuickPick(pickItems, { placeHolder: "Choose a prompt" });
    if (!picked) return;

    let finalPrompt: string;
    let model: string = defaultModel;
    if (picked.label === "Custom…") {
      const tpl = await vscode.window.showInputBox({ prompt: "Enter prompt. Use {selection} or {} as placeholder for the selection." });
      if (!tpl) return;
      finalPrompt = tpl.replaceAll("{selection}", selection).replaceAll("{}", selection);
      // Ask for model for custom prompt
      const modelInput = await vscode.window.showInputBox({
        prompt: "Enter model to use for this prompt (leave as default to use settings)",
        value: defaultModel
      });
      model = modelInput?.trim() || defaultModel;
    } else {
      finalPrompt = picked.template.replaceAll("{selection}", selection).replaceAll("{}", selection);
      // Use model from prompt if present, else default
      if (picked.model && typeof picked.model === 'string' && picked.model.trim()) {
        model = picked.model.trim();
      }
    }

    if (!chatgptOutputChannel) {
      chatgptOutputChannel = vscode.window.createOutputChannel("ChatGPT Right Click");
    }
    const channel = chatgptOutputChannel;
  channel.appendLine(finalPrompt);
  channel.appendLine(`> Sending to ${model}:`);

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Window,
      title: "ChatGPT is processing...",
      cancellable: false
    }, async () => {
      try {
        const answer = await callOpenAI(model, apiKey, finalPrompt);
        channel.appendLine("");
        channel.appendLine(answer);
        // Replace the selected text with the answer
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && !activeEditor.selection.isEmpty) {
          await activeEditor.edit(editBuilder => {
            editBuilder.replace(activeEditor.selection, answer);
          });
        }
      } catch (e: any) {
        channel.appendLine("");
        channel.appendLine(String(e?.message || e));
      }
    });
  });

  context.subscriptions.push(disposable);
}
export function deactivate() {}
