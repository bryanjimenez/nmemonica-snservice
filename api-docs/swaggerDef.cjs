const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync("./package.json",{encoding:'utf-8'}))

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: pkg.name,
    version: pkg.version,
    description: `Express API for ${pkg.name}`,
    // license:{name:"", url:""},
    // contact:{name:"", url:""}
  },
  // will be set at runtime in app.js
  // servers: [{ url: `https://localhost:8000`, description: "https" }],
};

module.exports = swaggerDefinition;
