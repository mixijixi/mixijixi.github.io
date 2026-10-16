import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = 'username', repositoryName = 'pixel-home'] = repository.split('/');
const isProjectPage = repositoryName !== `${owner}.github.io`;
const base = process.env.GITHUB_ACTIONS === 'true' && isProjectPage ? `/${repositoryName}/` : '/';

export default defineConfig({
  site: `https://${owner}.github.io`,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory'
  }
});
