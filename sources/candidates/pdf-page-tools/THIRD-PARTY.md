# Third-party software

This tool ships exactly one third-party file. Everything else in the
repository is original work for this project.

## pdf-lib (vendored)

| Field | Value |
| --- | --- |
| Library | pdf-lib |
| Version | 1.17.1 |
| Vendored file | `public/js/vendor/pdf-lib.esm.min.js` |
| File size | 523,417 bytes |
| SHA-256 | `72c052d97b4d5d9fa6cdbdcb7ad709f03d4ddb1122390cb3afeba4d88651d969` |
| Licence | MIT License |
| Copyright | Copyright (c) 2019 Andrew Dillon |
| Source | npm package `pdf-lib@1.17.1`, tarball `https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz`, file `package/dist/pdf-lib.esm.min.js` inside the tarball |
| Project | https://pdf-lib.js.org/ · https://github.com/Hopding/pdf-lib |

How it is used: the file is served from the same origin as the rest of
the tool and imported only by `public/js/core/engine.mjs`. It is data
vendored into the repository, not an npm dependency: the project has
zero npm dependencies and `package.json` declares none. The project
check (`scripts/check.mjs`) recomputes the vendored file's SHA-256 on
every run and fails if it differs from the value recorded here.

One behavioural note discovered while building (also recorded in
VERIFICATION.md): pdf-lib stamps its own Producer string when a
document is created and would re-stamp it when a document is loaded
with metadata updates enabled. The engine therefore sets the SPEC's
fixed Producer after creation and always loads with
`updateMetadata: false`, so outputs carry the fixed Producer
`GlossQuote Labs PDF Page Tools` and inspected documents are never
rewritten.

### MIT License (pdf-lib)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
