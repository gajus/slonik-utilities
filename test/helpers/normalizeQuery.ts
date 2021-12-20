const inlineCommentRule = /(.*?)--.*/gu;
const multilineCommentRule = /\/\*[\S\s]*?\*\//gmu;
const whiteSpaceRule = /\s+/gu;

export const normalizeQuery = (input: string): string => {
  return input
    .replace(inlineCommentRule, (match, p1) => {
      return p1;
    })
    .replace(multilineCommentRule, '')
    .replace(whiteSpaceRule, ' ')
    .trim();
};
