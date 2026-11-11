# Publication guide

1. Wait for GitHub Actions CI to pass.
2. Set up npm Trusted Publishing for GitHub Actions with owner GetSocialAPI, repository n8n-nodes-getsocialapi-instagram, workflow publish.yml. The npm package must exist before configuring Trusted Publishing. For initial release use an npm granular access token with 2FA bypass and add it as GitHub Actions secret NPM_TOKEN; adapt the workflow temporarily to use the token (do not commit token).
3. Run the Publish npm package workflow manually only after build and tests pass.
4. Test installation in self-hosted n8n and then submit n8n-nodes-getsocialapi-instagram via https://creators.n8n.io/nodes.
5. Increase package.json version for future releases.

These files are development source code, not a verified or published npm release. API keys must never be committed.
