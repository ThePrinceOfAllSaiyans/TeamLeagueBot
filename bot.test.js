const { matchResult } = require('./bot')

test('test', () => {
	expect(matchResult('', '', '')).toBe('');
});