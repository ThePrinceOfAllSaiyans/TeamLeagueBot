const { gameResult } = require('./bot')

test('test', () => {
	expect(gameResult('', '', '')).toBe('');
});