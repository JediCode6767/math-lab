# Math Lab deployment

This folder is the deployment copy. The live app is a static site served with GitHub Pages; no application server is required. A `.nojekyll` marker keeps the local math-engine asset available.

- Live app: https://jedicode6767.github.io/math-lab/
- Public source repository: https://github.com/JediCode6767/math-lab

## Update and redeploy

After Math Lab changes, run `sh ./redeploy.sh` from this folder. It copies the latest solver and practice files from the Math Lab workspace, rebuilds the static site shell, then commits and pushes the update to GitHub Pages.

## Online and offline behavior

- Solving typed or pasted text and plotting functions run locally in the browser.
- The app shell and symbolic math engine are cached for offline typed solving after the site has been opened once online and the service worker finishes installing.
- Screenshot OCR loads Tesseract.js and language data from public CDNs, so OCR needs an internet connection. The screenshot itself is processed in the browser and is not sent to a Math Lab server.
- This is best-effort symbolic math and OCR, not universal recognition; unsupported notation and graph images may need to be entered or interpreted manually.
