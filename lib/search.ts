const normalize = (value: string) => value.normalize('NFKC').toLowerCase()
  .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const groups = [
  ['いす', '椅子', 'チェア', 'chair'], ['つくえ', '机', 'デスク', 'desk'],
  ['テーブル', 'table'], ['マイク', 'microphone'], ['本', '書籍', 'book'],
  ['ケーブル', 'コード', 'cable'], ['はさみ', 'ハサミ', '鋏', 'scissors'],
  ['リモコン', 'remote control'], ['パソコン', 'pc', 'computer'],
  ['ペン', '筆記具', 'pen'], ['充電器', 'charger'], ['ホワイトボード', 'whiteboard'],
].map(g => g.map(normalize));

// Treat the book noun separately from the counter (2本) and compounds (本体).
const words = new Intl.Segmenter('ja', {granularity:'word'});
function contains(text: string, term: string): boolean {
  if (term === '本') {
    const tokens = [...words.segment(text)];
    return tokens.some((token, i) => {
      if (['絵本', '単行本', '文庫本', '書籍'].includes(token.segment)) return true;
      if (token.segment !== '本') return false;
      const previous = tokens.slice(0, i).filter(t => t.segment.trim()).at(-1)?.segment || '';
      return !/^(?:[0-9一二三四五六七八九十百千万億〇零何数幾]+|何十|数十|数百|数千)$/.test(previous);
    });
  }
  // English aliases must match words, not a fragment such as book in notebook.
  if (/^[a-z ]+$/.test(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${escaped}(?:s)?(?![a-z0-9])`, 'u').test(text);
  }
  return text.includes(term);
}

export const cleanSearchQuery = (query: string) => normalize(query).replace(/(?:はどこ.*|を探.*|ありますか.*|どこ.*|ですか.*|を見つけ.*)$/u, '').trim();

export function searchScore(query: string, object: {name?: string; description?: string; location?: string; aliases?: string[]; learnedQueries?: string[]}, label: string) {
  const cleaned = cleanSearchQuery(query);
  if (!cleaned) return 0;
  if (Array.isArray(object.learnedQueries) && object.learnedQueries.some(q => cleanSearchQuery(q) === cleaned)) return 5;
  const name = normalize([object.name, ...(Array.isArray(object.aliases) ? object.aliases : [])].join(' '));
  const details = normalize([object.description, object.location, label].join(' '));
  const hay = name + ' ' + details;
  if (contains(name, cleaned)) return 4;
  // Match the noun and its modifiers together, even when stored separately.
  const matches = (term: string) => {
    if (contains(hay, term)) return true;
    return groups.some(group => group.some(synonym => {
      if (!contains(term, synonym) || !group.some(word => contains(hay, word))) return false;
      const rest = term.replace(synonym, '').replace(/(黒|白|赤|青|黄色|丸|細|長|短|小さ|大き)い/g, '$1');
      return rest.split(/[の\s]+/u).filter(Boolean).every(part => hay.includes(part));
    }));
  };
  const terms = cleaned.split(/[\s、。]+/u).filter(Boolean);
  return terms.every(matches) ? 1 : 0;
}
