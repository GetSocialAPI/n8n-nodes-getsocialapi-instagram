# Publishing n8n-nodes-getsocialapi-instagram to npm

Do not publish until CI and real API tests pass.

## First release

1. Confirm the CI workflow **Check n8n community node** passes and test live API calls with your own GetSocialAPI key.
2. On npmjs.com, create a **new granular access token** limited to publishing (and enable 2FA bypass for automation if your account requires it).
3. In this GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**, create a secret named `NPM_TOKEN`, and paste the token there. **Never put it in a repository file, issue, or workflow input.**
4. Open **Actions → Publish npm package → Run workflow** on branch `main`.
5. Check the Actions run and the public package page: https://www.npmjs.com/package/n8n-nodes-getsocialapi-instagram .
6. Submit the published package at https://creators.n8n.io/nodes once installation has been tested.

The workflow publishes the version in `package.json` with npm provenance. It is *not* triggered by every commit.

## Future releases

Change `package.json` version, verify CI, and manually run the publish workflow. npm will reject an already published version.

For safer long-term releases, configure an npm Trusted Publisher for this GitHub repository and `publish.yml`. Once OIDC publishing is verified, remove the repository's `NPM_TOKEN` secret and revoke the npm token.

These source files are not proof of successful npm publication. Review the npm package listing after each release.
