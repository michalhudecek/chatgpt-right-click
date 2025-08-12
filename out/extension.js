"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// Placeholder websearch function. Replace with real API integration as needed.
async function performWebsearch(query) {
    // TODO: Integrate with a real websearch API (e.g., Bing, Google, SerpAPI, etc.)
    // For now, return a mock result.
    return `Websearch results for "${query}":\n- Example result 1\n- Example result 2`;
}
const vscode = __importStar(require("vscode"));
async function callOpenAI(body, apiKey) {
    const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`OpenAI error ${resp.status}: ${t}`);
    }
    const data = await resp.json();
    // Responses API: first output_text convenience field if present, else stitch from output
    if (data.output_text)
        return data.output_text;
    if (Array.isArray(data.output)) {
        return data.output.map((p) => (p?.content?.map((c) => c?.text || "").join("") || "")).join("");
    }
    return JSON.stringify(data);
}
let chatgptOutputChannel;
function activate(context) {
    const disposable = vscode.commands.registerCommand("chatgpt-right-click.runOnSelection", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.document.getText(editor.selection);
        if (!selection?.trim()) {
            vscode.window.showWarningMessage("Select some text first.");
            return;
        }
        const cfg = vscode.workspace.getConfiguration("chatgpt-right-click");
        const apiKey = cfg.get("openaiApiKey") || "";
        const defaultModel = cfg.get("model") || "gpt-4.1-mini";
        const prompts = (cfg.get("prompts") || []);
        const globalEnableWebsearch = cfg.get("enableWebsearch") || false;
        // You can now use enableWebsearch in your prompt logic
        if (!apiKey) {
            vscode.window.showErrorMessage("Set ChatGPT Right Click: OpenAI API Key in Settings.");
            return;
        }
        const pickItems = [
            ...prompts.map(p => ({ label: p.label, template: p.template, model: p.model, enableWebsearch: p.enableWebsearch })),
            { label: "Custom…", template: "", model: undefined }
        ];
        const picked = await vscode.window.showQuickPick(pickItems, { placeHolder: "Choose a prompt" });
        if (!picked)
            return;
        let finalPrompt;
        let model = defaultModel;
        if (picked.label === "Custom…") {
            const tpl = await vscode.window.showInputBox({ prompt: "Enter prompt. Use {selection} or {} as placeholder for the selection." });
            if (!tpl)
                return;
            finalPrompt = tpl.replaceAll("{selection}", selection).replaceAll("{}", selection);
            // Ask for model for custom prompt
            const modelInput = await vscode.window.showInputBox({
                prompt: "Enter model to use for this prompt (leave as default to use settings)",
                value: defaultModel
            });
            model = modelInput?.trim() || defaultModel;
        }
        else {
            finalPrompt = picked.template.replaceAll("{selection}", selection).replaceAll("{}", selection);
            // Use model from prompt if present, else default
            if (picked.model && typeof picked.model === 'string' && picked.model.trim()) {
                model = picked.model.trim();
            }
        }
        // Determine enableWebsearch for this prompt: prompt property > global setting
        let enableWebsearch = globalEnableWebsearch;
        if (typeof picked.enableWebsearch === 'boolean') {
            enableWebsearch = picked.enableWebsearch;
        }
        // No need to manually perform websearch; handled by OpenAI API if enabled
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
                // Construct the request body ONCE and use for both logging and API call
                const body = {
                    model,
                    input: [
                        { role: "system", content: "You are a precise programming assistant." },
                        { role: "user", content: finalPrompt }
                    ]
                };
                if (enableWebsearch) {
                    body.tools = [{ type: "web_search" }];
                }
                channel.appendLine("");
                channel.appendLine("--- ChatGPT Request Body ---");
                channel.appendLine(JSON.stringify(body, null, 2));
                channel.appendLine("----------------------------");
                const answer = await callOpenAI(body, apiKey);
                channel.appendLine("");
                channel.appendLine(answer);
                // Replace the selected text with the answer
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && !activeEditor.selection.isEmpty) {
                    await activeEditor.edit(editBuilder => {
                        editBuilder.replace(activeEditor.selection, answer);
                    });
                }
            }
            catch (e) {
                channel.appendLine("");
                channel.appendLine(String(e?.message || e));
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
