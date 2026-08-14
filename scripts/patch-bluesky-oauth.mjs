import fs from "node:fs";

const files = [
  "src/components/tools/bluesky-network-explorer.tsx",
  "src/components/tools/bluesky-following-explorer.tsx",
];

for (const path of files) {
  let source = fs.readFileSync(path, "utf8");

  const oldImport = 'import { Button, buttonStyles } from "@/components/ui/button";';
  if (!source.includes(oldImport)) {
    throw new Error(`${path}: expected Button/buttonStyles import not found`);
  }
  source = source.replace(
    oldImport,
    'import { BlueskyFollowButton } from "@/components/tools/bluesky-oauth";\nimport { Button } from "@/components/ui/button";',
  );

  const openFollow = /<a\s+href=\{`https:\/\/bsky\.app\/profile\/\$\{item\.handle\}`\}[\s\S]*?className=\{buttonStyles\(\{ size: "sm", className: "flex-1" \}\)\}[\s\S]*?>\s*Open & follow<ArrowUpRight aria-hidden className="size-4" \/>\s*<\/a>/;
  if (!openFollow.test(source)) {
    throw new Error(`${path}: expected Open & follow result action not found`);
  }
  source = source.replace(
    openFollow,
    '<BlueskyFollowButton did={item.did} handle={item.handle} className="flex-1" />',
  );

  source = source.replace(
    "No Bluesky password or app password is requested. Every follow remains a manual choice on Bluesky.",
    "Public scanning still requires no login. Optional OAuth sign-in enables deliberate in-tool follows without giving Rukh Labs your password.",
  );
  source = source.replace(
    "No account login is required. Every follow remains a manual choice on Bluesky.",
    "Public scanning still requires no login. Optional OAuth sign-in enables deliberate in-tool follows without giving Rukh Labs your password.",
  );

  fs.writeFileSync(path, source);
  console.log(`patched ${path}`);
}

const oauthPath = "src/components/tools/bluesky-oauth.tsx";
let oauthSource = fs.readFileSync(oauthPath, "utf8");
const oldRedirect = '      const session = await client.signIn(handle, {\n        display: "popup",\n        prompt: "login",\n        redirect_uri: `${window.location.origin}/tools/bluesky-network`,\n      });';
const newRedirect = '      const redirectUri =\n        window.location.hostname.toLowerCase() === "www.rukhlabs.com"\n          ? "https://www.rukhlabs.com/tools/bluesky-network"\n          : "https://rukhlabs.com/tools/bluesky-network";\n      const session = await client.signIn(handle, {\n        display: "popup",\n        prompt: "login",\n        redirect_uri: redirectUri,\n      });';
if (!oauthSource.includes(oldRedirect)) {
  throw new Error(`${oauthPath}: expected OAuth redirect block not found`);
}
oauthSource = oauthSource.replace(oldRedirect, newRedirect);
fs.writeFileSync(oauthPath, oauthSource);
console.log(`patched ${oauthPath}`);
