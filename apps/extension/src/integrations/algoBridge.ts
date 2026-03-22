import * as vscode from 'vscode';

// Shared contract shape (this should eventually live in packages/contracts)
export interface ResourceSuggestion {
    topic: string;
    reason: string;
    url: string;
}

/**
 * A hardcoded dictionary mapping code patterns to specific study topics.
 * This satisfies the MVP requirement without needing an external search API.
 */
const RESOURCE_MAP: Record<string, ResourceSuggestion> = {
    'useEffect': {
        topic: 'React Component Lifecycle',
        reason: 'You are managing side effects. Reviewing dependency arrays prevents infinite rendering loops.',
        url: 'https://react.dev/reference/react/useEffect'
    },
    'APIRouter': {
        topic: 'Modular API Routing',
        reason: 'You are setting up backend routes. Reviewing router best practices keeps your application scalable.',
        url: 'https://fastapi.tiangolo.com/tutorial/bigger-applications/'
    },
    'cosine_similarity': {
        topic: 'Vector Embeddings & RAG',
        reason: 'You are comparing vectors. Reviewing Retrieval-Augmented Generation (RAG) architecture optimizes search context.',
        url: 'https://huggingface.co/blog/getting-started-with-embeddings'
    },
    'np.dot': {
        topic: 'Vectorized Matrix Operations',
        reason: 'You are doing numerical computation. Vectorization is significantly faster than standard Python loops.',
        url: 'https://numpy.org/doc/stable/user/whatisnumpy.html'
    },
    'debounce': {
        topic: 'Rate Limiting & Debouncing',
        reason: 'You are delaying execution. Debouncing is critical for preventing API spam on user input.',
        url: 'https://developer.mozilla.org/en-US/docs/Glossary/Debounce'
    }
};

/**
 * Scans the provided text for keywords and returns the first matching resource.
 */
export function scanForResources(documentText: string): ResourceSuggestion | null {
    for (const [keyword, resource] of Object.entries(RESOURCE_MAP)) {
        if (documentText.includes(keyword)) {
            return resource;
        }
    }
    return null; // No relevant patterns found
}

/**
 * Registers a command that Person 3's UI can call to request a study link 
 * based on the currently active file.
 */
export function registerAlgoBridge(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('bridge.getStudyResource', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null; // No file open
        }

        const text = editor.document.getText();
        const suggestion = scanForResources(text);

        if (suggestion) {
            // In the final integrated version, Person 3's UI will capture this return value.
            // For now, we can show an info message to prove it works.
            vscode.window.showInformationMessage(`Algo-Bridge: ${suggestion.topic} - ${suggestion.reason}`, "Read Docs")
                .then(selection => {
                    if (selection === "Read Docs") {
                        vscode.env.openExternal(vscode.Uri.parse(suggestion.url));
                    }
                });

            return suggestion;
        }

        return null;
    });

    context.subscriptions.push(disposable);
}