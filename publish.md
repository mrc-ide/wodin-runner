# Publishing

Steps to update the package on npm

```
git fetch
npm run build
npm run webpack
npx npm pack
npm publish
git tag "v$(npm pkg get version | sed 's/"//g')"
git push --tags
```

New version will appear at https://www.npmjs.com/package/@reside-ic/odin
