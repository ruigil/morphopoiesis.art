

export default async function* (data: Lume.Data) {
  const by = await Deno.readTextFile(`./site/works/libs/licenses/cc-by-4.0.md`);
  const byNcNd = await Deno.readTextFile(`./site/works/libs/licenses/cc-by-nc-nd-4.0.md`);

  const licenses:Record<string,string> = {
    "cc-by": by,
    "cc-by-nc-nd": byNcNd
  }

  for (const s of data.shaders) {
    yield {
      url: `./${s.id}/LICENSE.md`,
      title: s.title,
      description: s.description,
      content: licenses[s.license],
    };
  }
}