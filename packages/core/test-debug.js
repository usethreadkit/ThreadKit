import { tokenizeLine } from './src/markdown/tokenizer.ts';

const tokens = tokenizeLine('Look at this ![image](https://example.com/img.jpg) cool!', { allowLinks: true });
console.log(JSON.stringify(tokens, null, 2));
console.log('Length:', tokens.length);
