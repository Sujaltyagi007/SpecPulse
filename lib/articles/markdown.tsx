import React from 'react';

export function ArticleBody({ markdown, sourceCount }: { markdown: string; sourceCount: number }) {
  const blocks = markdown.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out: React.ReactNode[] = [];
  blocks.forEach((block, i) => {
    const lines = block.split('\n').filter((l) => l.trim());
    if (!lines.length) return;
    const first = lines[0]!;
    if (first.startsWith('### ')) {
      out.push(<h3 key={i}>{inline(first.slice(4), sourceCount)}</h3>);
      if (lines.length > 1) out.push(<p key={`${i}p`}>{inline(lines.slice(1).join(' '), sourceCount)}</p>);
    } else if (first.startsWith('## ')) {
      out.push(<h2 key={i}>{inline(first.slice(3), sourceCount)}</h2>);
      if (lines.length > 1) out.push(<p key={`${i}p`}>{inline(lines.slice(1).join(' '), sourceCount)}</p>);
    } else if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      out.push(
        <ul key={i}>
          {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ''), sourceCount)}</li>)}
        </ul>,
      );
    } else {
      out.push(<p key={i}>{inline(lines.join(' '), sourceCount)}</p>);
    }
  });
  return <>{out}</>;
}

function inline(text: string, sourceCount: number): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const cite = /^\[(\d+)\]$/.exec(part);
    if (cite) {
      const n = Number(cite[1]);
      if (n >= 1 && n <= sourceCount) {
        return (
          <sup key={i} className="cite">
            <a href={`#source-${n}`} aria-label={`Source ${n}`}>[{n}]</a>
          </sup>
        );
      }
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
