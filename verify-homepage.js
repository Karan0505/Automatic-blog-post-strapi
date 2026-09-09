async function verify() {
  const res = await fetch('http://localhost:3000/en');
  const html = await res.text();
  const re = /<article[\s\S]*?<\/article>/g;
  const cards = html.match(re) || [];
  console.log(`Total articles rendered on homepage: ${cards.length}\n`);

  cards.slice(0, 6).forEach((card, idx) => {
    const titleMatch = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown';
    const imgs = [...card.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]);
    console.log(`Card ${idx + 1}: "${title}"`);
    console.log(`  Cover Image: ${imgs[0] || 'NONE'}`);
    console.log(`  Author Avatar: ${imgs[1] || 'NONE'}\n`);
  });
}

verify().catch(console.error);
