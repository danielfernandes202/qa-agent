import { checkGuardrails, SessionState } from '../guardrails';

describe('Guardrails', () => {
    let sessionState: SessionState;

    beforeEach(() => {
        sessionState = {
            targetUrl: 'https://qa.creditmobility.net',
            actionHistory: []
        };
    });

    test('should allow navigation to the same domain', async () => {
        await expect(checkGuardrails('navigateTool_123', { url: 'https://qa.creditmobility.net/login' }, sessionState)).resolves.toBeUndefined();
    });

    test('should allow navigation to a subdomain', async () => {
        sessionState.targetUrl = 'https://creditmobility.net';
        await expect(checkGuardrails('navigateTool_123', { url: 'https://qa.creditmobility.net/login' }, sessionState)).resolves.toBeUndefined();
    });

    test('should reject navigation to a different domain', async () => {
        await expect(checkGuardrails('navigateTool_123', { url: 'https://google.com' }, sessionState)).rejects.toThrow('Guardrail violation: Navigation to external domain google.com is not allowed.');
    });

    test('should reject invalid URLs', async () => {
        await expect(checkGuardrails('navigateTool_123', { url: 'not-a-url' }, sessionState)).rejects.toThrow('Guardrail violation: Invalid URL format: not-a-url');
    });

    test('should allow normal actions', async () => {
        await expect(checkGuardrails('clickTool_123', { selector: '#btn' }, sessionState)).resolves.toBeUndefined();
    });

    test('should allow repeating an action once or twice', async () => {
        sessionState.actionHistory.push({ toolName: 'clickTool_123', args: { selector: '#btn' } });
        sessionState.actionHistory.push({ toolName: 'clickTool_123', args: { selector: '#btn' } });
        
        await expect(checkGuardrails('clickTool_123', { selector: '#btn' }, sessionState)).resolves.toBeUndefined();
    });

    test('should reject repeating an action 3 times in a row', async () => {
        sessionState.actionHistory.push({ toolName: 'clickTool_123', args: { selector: '#btn' } });
        sessionState.actionHistory.push({ toolName: 'clickTool_123', args: { selector: '#btn' } });
        sessionState.actionHistory.push({ toolName: 'clickTool_123', args: { selector: '#btn' } });
        
        await expect(checkGuardrails('clickTool_123', { selector: '#btn' }, sessionState)).rejects.toThrow('Guardrail violation: Detected repetitive loop for tool clickTool_123 with identical arguments.');
    });
});
