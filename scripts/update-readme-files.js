const fs = require('fs');

const methodologyDefinitionFile = process.argv[2];
const methodologyDefinition = require(`../${methodologyDefinitionFile}`);

const methodologySlug = methodologyDefinition.slug;

console.log(`Updating README files for ${methodologySlug} methodology...`);

const rules = methodologyDefinition.rules;
for (const rule of rules) {
  const { slug, scope, description } = rule;
  const readmeFilePath = `./apps/methodologies/${methodologySlug}/rule-processors/${scope.toLowerCase()}/${slug}/README.md`;

  console.log(`Updating README file for ${slug} rule...`);

  // TODO: code style for all caps words and for dashed words

  const readmeContent = fs.readFileSync(readmeFilePath, 'utf8');
  if (!readmeContent.match(/## 📄 Description\n\n/m)) {
    console.error(`README file for ${slug} rule does not have a description section.`);
    continue;
  }
  const updatedReadmeContent = readmeContent.replace(/## 📄 Description\n\n(.*)\n/m, `## 📄 Description\n\n${description}\n`);
  fs.writeFileSync(readmeFilePath, updatedReadmeContent);
}
