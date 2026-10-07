import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { renderInviteHeroPng } from "../src/modules/communications/invite-hero-render.ts";

const { png } = await renderInviteHeroPng({
  accentColor: "#4F46E5",
  eyebrow: "You are invited to",
  title: "Summit 2026",
  detailLines: ["12-14 May 2026", "London"],
  closing: "We look forward to welcoming you",
});
writeFileSync("/tmp/hero-tsx.png", png);
const { data, info } = await sharp(png)
  .raw()
  .toBuffer({ resolveWithObject: true });
let bright = 0;
for (let i = 0; i < data.length; i += info.channels) {
  if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) bright += 1;
}
console.log({ bright, bytes: png.length });
if (bright < 200) process.exit(1);
